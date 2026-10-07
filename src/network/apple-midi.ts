import dgram, { type RemoteInfo, type Socket } from 'node:dgram'
import { EventEmitter } from 'node:events'
import { randomBytes } from 'node:crypto'

const SIGNATURE = 0xffff
const COMMAND = { invitation: 0x494e, accepted: 0x4f4b, rejected: 0x4e4f, end: 0x4259, sync: 0x434b } as const
export const APPLE_MIDI_RETRY_MS = 2000
export const APPLE_MIDI_SESSION_TIMEOUT_MS = 7000

export type AppleMidiRole = 'initiator' | 'responder'
export interface AppleMidiOptions {
	role: AppleMidiRole
	remoteHost: string
	remotePort: number
	localPort: number
	sessionName: string
}
export interface AppleMidiStatus {
	connected: boolean
	peerName: string
	peerAddress: string
	lastSeen: number
	reconnectAttempts: number
	lastDisconnectReason: string
}

export function safeAppleMidiName(name: string): string {
	const ascii = name
		.replace(/[‐‑‒–—―]/g, '-')
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.normalize('NFKD')
		.replace(/[^\x20-\x7e]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
	return (ascii || 'Companion iConnectivity').slice(0, 63)
}

function uint32(): number {
	return randomBytes(4).readUInt32BE(0)
}
function nowTicks(): bigint {
	return BigInt(Math.floor(performance.now() * 10))
}
function writeU64(buffer: Buffer, offset: number, value: bigint): void {
	buffer.writeBigUInt64BE(value, offset)
}

export function invitationPacket(command: number, token: number, ssrc: number, name: string): Buffer {
	const label = Buffer.from(`${safeAppleMidiName(name)}\0`, 'ascii')
	const packet = Buffer.alloc(16 + label.length)
	packet.writeUInt16BE(SIGNATURE, 0)
	packet.writeUInt16BE(command, 2)
	packet.writeUInt32BE(2, 4)
	packet.writeUInt32BE(token, 8)
	packet.writeUInt32BE(ssrc, 12)
	label.copy(packet, 16)
	return packet
}

export function endSessionPacket(token: number, ssrc: number): Buffer {
	const packet = Buffer.alloc(16)
	packet.writeUInt16BE(SIGNATURE, 0)
	packet.writeUInt16BE(COMMAND.end, 2)
	packet.writeUInt32BE(2, 4)
	packet.writeUInt32BE(token, 8)
	packet.writeUInt32BE(ssrc, 12)
	return packet
}

export function parseInvitation(
	packet: Buffer,
): { command: number; token: number; ssrc: number; name: string } | undefined {
	if (packet.length < 16 || packet.readUInt16BE(0) !== SIGNATURE) return undefined
	const command = packet.readUInt16BE(2)
	if (![COMMAND.invitation, COMMAND.accepted, COMMAND.rejected, COMMAND.end].includes(command as never))
		return undefined
	return {
		command,
		token: packet.readUInt32BE(8),
		ssrc: packet.readUInt32BE(12),
		name: packet.subarray(16).toString('utf8').replace(/\0.*$/, ''),
	}
}

export function rtpMidiPacket(sequence: number, timestamp: number, ssrc: number, midi: readonly number[]): Buffer {
	if (midi.length > 4095) throw new RangeError('RTP-MIDI command section exceeds 4095 bytes')
	const extended = midi.length > 15
	const headerLength = extended ? 2 : 1
	const packet = Buffer.alloc(12 + headerLength + midi.length)
	packet[0] = 0x80
	packet[1] = 0x61
	packet.writeUInt16BE(sequence & 0xffff, 2)
	packet.writeUInt32BE(timestamp >>> 0, 4)
	packet.writeUInt32BE(ssrc, 8)
	if (extended) {
		packet[12] = 0x80 | ((midi.length >> 8) & 0x0f)
		packet[13] = midi.length & 0xff
	} else packet[12] = midi.length
	Buffer.from(midi).copy(packet, 12 + headerLength)
	return packet
}

export function parseRtpMidiSection(packet: Buffer): { section: number[]; firstHasDelta: boolean } | undefined {
	if (packet.length < 13 || packet[0] >> 6 !== 2 || packet.readUInt16BE(0) === SIGNATURE) return undefined
	const first = packet[12]
	const extended = !!(first & 0x80)
	const length = extended ? ((first & 0x0f) << 8) | (packet[13] ?? 0) : first & 0x0f
	const offset = extended ? 14 : 13
	if (packet.length < offset + length) return undefined
	return { section: [...packet.subarray(offset, offset + length)], firstHasDelta: !!(first & 0x20) }
}

/** Returns the raw RTP-MIDI command section, including any delta times. */
export function parseRtpMidi(packet: Buffer): number[] | undefined {
	return parseRtpMidiSection(packet)?.section
}

export const MAX_SYSEX_BYTES = 65536

function channelDataLength(status: number): number {
	return (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2
}

function systemCommonDataLength(status: number): number {
	return status === 0xf2 ? 2 : status === 0xf1 || status === 0xf3 ? 1 : 0
}

/**
 * Splits RFC 6295 MIDI command lists into individual MIDI messages. A packet may
 * carry several commands separated by delta times, use running status, embed
 * realtime bytes in SysEx, or segment SysEx across packets (F0..F0, F7..F0,
 * F7..F7, with F4 cancelling).
 *
 * Compatibility: a section that does not decode cleanly from start to end is
 * delivered unchanged as one message, exactly as earlier versions did, so a
 * device that deviates from RFC 6295 never loses traffic it used to deliver.
 */
export class RtpMidiCommandDecoder {
	private pendingSysex?: number[]

	reset(): void {
		this.pendingSysex = undefined
	}

	decode(packet: Buffer): number[][] | undefined {
		const parsed = parseRtpMidiSection(packet)
		return parsed && this.decodeSection(parsed.section, parsed.firstHasDelta)
	}

	decodeSection(section: readonly number[], firstHasDelta = false): number[][] {
		const pendingBefore = this.pendingSysex
		const messages = this.decodeStrict(section, firstHasDelta)
		if (messages) return messages
		this.pendingSysex = pendingBefore
		return section.length ? [[...section]] : []
	}

	/** Returns undefined unless the whole section is a well-formed command list. */
	private decodeStrict(section: readonly number[], firstHasDelta: boolean): number[][] | undefined {
		const messages: number[][] = []
		let offset = 0
		let runningStatus = 0
		let expectDelta = firstHasDelta
		while (offset < section.length) {
			if (expectDelta) {
				let terminated = false
				for (let bytes = 0; bytes < 4 && offset < section.length; bytes++)
					if (!(section[offset++] & 0x80)) {
						terminated = true
						break
					}
				if (!terminated) return undefined
				// A trailing delta time with no command after it is tolerated.
				if (offset >= section.length) break
			}
			expectDelta = true
			const status = section[offset]
			if (status === 0xf0 || status === 0xf7) {
				runningStatus = 0
				const next = this.readSysex(section, offset, messages)
				if (next < 0) return undefined
				offset = next
			} else if (status >= 0xf8) {
				messages.push([status])
				offset++
			} else if (status >= 0xf1) {
				runningStatus = 0
				const length = systemCommonDataLength(status)
				const data = section.slice(offset + 1, offset + 1 + length)
				if (data.length !== length || data.some((byte) => byte & 0x80)) return undefined
				messages.push([status, ...data])
				offset += 1 + length
			} else {
				const hasStatus = status >= 0x80
				if (hasStatus) runningStatus = status
				else if (!runningStatus) return undefined
				const start = hasStatus ? offset + 1 : offset
				const length = channelDataLength(runningStatus)
				const data = section.slice(start, start + length)
				if (data.length !== length || data.some((byte) => byte & 0x80)) return undefined
				messages.push([runningStatus, ...data])
				offset = start + length
			}
		}
		return messages
	}

	/** Returns the offset after the SysEx command, or -1 when the rest of the list is unusable. */
	private readSysex(section: readonly number[], offset: number, messages: number[][]): number {
		const continuation = section[offset] === 0xf7
		const data: number[] = []
		for (let index = offset + 1; index < section.length; index++) {
			const byte = section[index]
			if (byte < 0x80) {
				data.push(byte)
				continue
			}
			if (byte >= 0xf8) {
				messages.push([byte])
				continue
			}
			const prefix = continuation ? this.pendingSysex : [0xf0]
			if (byte === 0xf7) {
				this.pendingSysex = undefined
				if (prefix && prefix.length + data.length < MAX_SYSEX_BYTES) messages.push([...prefix, ...data, 0xf7])
				return index + 1
			}
			if (byte === 0xf0) {
				this.pendingSysex = prefix && prefix.length + data.length < MAX_SYSEX_BYTES ? [...prefix, ...data] : undefined
				return index + 1
			}
			// F4 cancels a segmented SysEx; any other status byte is malformed.
			this.pendingSysex = undefined
			return byte === 0xf4 ? index + 1 : -1
		}
		this.pendingSysex = undefined
		return -1
	}
}

export class AppleMidiSession extends EventEmitter {
	private control?: Socket
	private data?: Socket
	private timer?: NodeJS.Timeout
	private readonly token = uint32()
	private readonly ssrc = uint32()
	private sequence = uint32() & 0xffff
	private controlReady = false
	private dataReady = false
	private peerControl?: RemoteInfo
	private peerData?: RemoteInfo
	private peerToken?: number
	private readonly decoder = new RtpMidiCommandDecoder()
	private status: AppleMidiStatus = {
		connected: false,
		peerName: '',
		peerAddress: '',
		lastSeen: 0,
		reconnectAttempts: 0,
		lastDisconnectReason: '',
	}
	constructor(private readonly options: AppleMidiOptions) {
		super()
	}

	async open(): Promise<void> {
		this.close()
		await this.bindPair(this.options.localPort)
		this.timer = setInterval(() => this.maintain(), APPLE_MIDI_RETRY_MS)
		this.maintain()
	}

	close(): void {
		if (this.timer) clearInterval(this.timer)
		this.timer = undefined
		const control = this.control
		const data = this.data
		const peerControl = this.peerControl
		const peerData = this.peerData
		const end = this.status.connected ? endSessionPacket(this.peerToken ?? this.token, this.ssrc) : undefined
		this.control = undefined
		this.data = undefined
		this.resetPeer('Session closed')
		this.endAndCloseSocket(control, peerControl, end)
		this.endAndCloseSocket(data, peerData, end)
	}
	send(midi: readonly number[]): void {
		if (!this.status.connected || !this.data || !this.peerData) throw new Error('RTP-MIDI session is not connected')
		const packet = rtpMidiPacket(this.sequence++, Math.floor(performance.now() * 10), this.ssrc, midi)
		this.sendDatagram(this.data, packet, this.peerData.port, this.peerData.address)
	}
	getStatus(): AppleMidiStatus {
		return { ...this.status }
	}

	private async bind(socket: Socket, port: number): Promise<void> {
		return new Promise((resolve, reject) => {
			socket.once('error', reject)
			socket.bind(port, '0.0.0.0', () => {
				socket.off('error', reject)
				resolve()
			})
		})
	}
	private async bindPair(configuredPort: number): Promise<void> {
		if (configuredPort && configuredPort % 2 !== 0)
			throw new Error('The local RTP-MIDI control port must be even; its data port is the next number')
		for (let attempt = 0; attempt < 20; attempt++) {
			const controlPort = configuredPort || 49152 + (randomBytes(2).readUInt16BE(0) % 8191) * 2
			const control = dgram.createSocket('udp4')
			const data = dgram.createSocket('udp4')
			try {
				await this.bind(control, controlPort)
				await this.bind(data, controlPort + 1)
				this.control = control
				this.data = data
				control.on('message', (packet, peer) => this.onControl(packet, peer, false))
				data.on('message', (packet, peer) => this.onControl(packet, peer, true))
				control.on('error', (error) => this.handleSocketError(error))
				data.on('error', (error) => this.handleSocketError(error))
				return
			} catch (error) {
				control.close()
				data.close()
				if (configuredPort || attempt === 19) throw error
			}
		}
	}
	private maintain(): void {
		if (this.options.role === 'initiator' && !this.status.connected) {
			this.status.reconnectAttempts++
			this.emit('status', this.getStatus())
			const invite = invitationPacket(COMMAND.invitation, this.token, this.ssrc, this.options.sessionName)
			this.sendDatagram(this.control, invite, this.options.remotePort, this.options.remoteHost)
			this.sendDatagram(this.data, invite, this.options.remotePort + 1, this.options.remoteHost)
		} else if (this.status.connected && Date.now() - this.status.lastSeen > APPLE_MIDI_SESSION_TIMEOUT_MS) {
			this.resetPeer('Peer stopped responding')
		} else if (this.status.connected) this.sendSync(0)
	}
	private onControl(packet: Buffer, peer: RemoteInfo, isData: boolean): void {
		if (!this.isAllowedPeer(peer)) return
		const invitation = parseInvitation(packet)
		if (invitation) {
			this.status.lastSeen = Date.now()
			this.status.peerName = invitation.name
			this.status.peerAddress = peer.address
			if (invitation.command === COMMAND.invitation && this.options.role === 'responder') {
				this.peerToken = invitation.token
				const response = invitationPacket(COMMAND.accepted, invitation.token, this.ssrc, this.options.sessionName)
				this.sendDatagram(isData ? this.data : this.control, response, peer.port, peer.address)
				if (isData) {
					this.peerData = peer
					this.dataReady = true
				} else {
					this.peerControl = peer
					this.controlReady = true
				}
			} else if (invitation.command === COMMAND.accepted && invitation.token === this.token) {
				this.peerToken = invitation.token
				if (isData) {
					this.peerData = peer
					this.dataReady = true
				} else {
					this.peerControl = peer
					this.controlReady = true
				}
			} else if (invitation.command === COMMAND.end || invitation.command === COMMAND.rejected) {
				this.resetPeer(invitation.command === COMMAND.end ? 'Peer ended the session' : 'Peer rejected the session')
				return
			}
			this.setConnected(this.controlReady && this.dataReady)
			return
		}
		if (packet.length >= 4 && packet.readUInt16BE(0) === SIGNATURE && packet.readUInt16BE(2) === COMMAND.sync) {
			this.handleSync(packet, peer)
			return
		}
		const messages = this.decoder.decode(packet)
		if (messages) {
			this.status.lastSeen = Date.now()
			for (const midi of messages) this.emit('midi', midi)
			this.emit('status', this.getStatus())
		}
	}
	private isAllowedPeer(peer: RemoteInfo): boolean {
		// An initiator is configured with a direct IPv4 address. Do not let a
		// delayed response from another host, or an unrelated packet, replace the
		// established peer and keep a dead session alive.
		if (this.options.role === 'initiator') return peer.address === this.options.remoteHost
		return !this.status.connected || !this.status.peerAddress || peer.address === this.status.peerAddress
	}
	private sendSync(count: number, source?: Buffer, peer = this.peerData): void {
		if (!this.data || !peer) return
		const packet = Buffer.alloc(36)
		packet.writeUInt16BE(SIGNATURE, 0)
		packet.writeUInt16BE(COMMAND.sync, 2)
		packet.writeUInt32BE(this.ssrc, 4)
		packet[8] = count
		if (source) source.copy(packet, 12, 12, 36)
		if (count === 0) writeU64(packet, 12, nowTicks())
		else if (count === 1) writeU64(packet, 20, nowTicks())
		else writeU64(packet, 28, nowTicks())
		this.sendDatagram(this.data, packet, peer.port, peer.address)
	}
	private handleSync(packet: Buffer, peer: RemoteInfo): void {
		if (packet.length < 36) return
		this.status.lastSeen = Date.now()
		const count = packet[8]
		if (count === 0) this.sendSync(1, packet, peer)
		else if (count === 1 && this.options.role === 'initiator') this.sendSync(2, packet, peer)
		this.emit('status', this.getStatus())
	}
	private sendDatagram(socket: Socket | undefined, packet: Buffer, port: number, host: string): void {
		if (!socket) return
		socket.send(packet, port, host, (error) => {
			if (error) this.handleSocketError(error)
		})
	}
	private endAndCloseSocket(
		socket: Socket | undefined,
		peer: RemoteInfo | undefined,
		packet: Buffer | undefined,
	): void {
		if (!socket) return
		if (!peer || !packet) {
			socket.close()
			return
		}
		socket.send(packet, peer.port, peer.address, () => socket.close())
	}
	private handleSocketError(error: Error): void {
		this.resetPeer(`UDP socket error: ${error.message}`)
	}
	private resetPeer(reason: string): void {
		this.controlReady = false
		this.dataReady = false
		this.peerControl = undefined
		this.peerData = undefined
		this.peerToken = undefined
		this.decoder.reset()
		this.setConnected(false, reason)
	}
	private setConnected(connected: boolean, disconnectReason = ''): void {
		const changed = this.status.connected !== connected
		if (!connected && disconnectReason) this.status.lastDisconnectReason = disconnectReason
		if (!changed) {
			if (disconnectReason) this.emit('status', this.getStatus())
			return
		}
		this.status.connected = connected
		if (connected) {
			this.status.lastSeen = Date.now()
			this.status.reconnectAttempts = 0
			this.status.lastDisconnectReason = ''
			// Start clock synchronization before connected listeners send their first MIDI.
			if (this.options.role === 'initiator') this.sendSync(0)
		}
		this.emit('status', this.getStatus())
	}
}
