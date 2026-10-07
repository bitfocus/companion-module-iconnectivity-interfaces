import assert from 'node:assert/strict'
import test from 'node:test'
import {
	APPLE_MIDI_RETRY_MS,
	APPLE_MIDI_SESSION_TIMEOUT_MS,
	AppleMidiSession,
	endSessionPacket,
	invitationPacket,
	parseInvitation,
	parseRtpMidi,
	rtpMidiPacket,
	safeAppleMidiName,
} from '../dist/network/apple-midi.js'

test('uses responsive but low-traffic reconnect timing', () => {
	assert.equal(APPLE_MIDI_RETRY_MS, 2000)
	assert.equal(APPLE_MIDI_SESSION_TIMEOUT_MS, 7000)
	assert.ok(APPLE_MIDI_SESSION_TIMEOUT_MS > APPLE_MIDI_RETRY_MS * 3)
})

test('round trips AppleMIDI invitation metadata', () => {
	const packet = invitationPacket(0x494e, 0x12345678, 0x87654321, 'Companion')
	assert.deepEqual(parseInvitation(packet), { command: 0x494e, token: 0x12345678, ssrc: 0x87654321, name: 'Companion' })
})

test('builds a standard AppleMIDI end-session packet', () => {
	const packet = endSessionPacket(0x12345678, 0x87654321)
	assert.equal(packet.length, 16)
	assert.deepEqual(parseInvitation(packet), {
		command: 0x4259,
		token: 0x12345678,
		ssrc: 0x87654321,
		name: '',
	})
})

test('normalizes session names for 7-bit iConnectivity firmware', () => {
	assert.equal(safeAppleMidiName('iConnectivity – PA1U'), 'iConnectivity - PA1U')
	assert.equal(parseInvitation(invitationPacket(0x494e, 1, 2, 'iConnectivity – PA1U')).name, 'iConnectivity - PA1U')
})

test('round trips short and extended RTP-MIDI payloads', () => {
	assert.deepEqual(parseRtpMidi(rtpMidiPacket(1, 2, 3, [0x90, 60, 127])), [0x90, 60, 127])
	const sysex = [0xf0, ...Array.from({ length: 32 }, (_, i) => i & 0x7f), 0xf7]
	assert.deepEqual(parseRtpMidi(rtpMidiPacket(2, 3, 4, sysex)), sysex)
})

test('initiator and responder reconnect and exchange MIDI', async () => {
	const port = 32000 + (process.pid % 1000) * 2
	const responder = new AppleMidiSession({
		role: 'responder',
		remoteHost: '',
		remotePort: 0,
		localPort: port,
		sessionName: 'Device',
	})
	const initiator = new AppleMidiSession({
		role: 'initiator',
		remoteHost: '127.0.0.1',
		remotePort: port,
		localPort: 0,
		sessionName: 'Companion',
	})
	try {
		await responder.open()
		const connected = new Promise((resolve) =>
			initiator.on('status', (status) => status.connected && resolve(undefined)),
		)
		await initiator.open()
		await Promise.race([
			connected,
			new Promise((_, reject) => setTimeout(() => reject(new Error('session timeout')), 2000)),
		])
		const received = new Promise((resolve) => responder.once('midi', resolve))
		initiator.send([0x90, 60, 127])
		assert.deepEqual(await received, [0x90, 60, 127])
	} finally {
		initiator.close()
		responder.close()
	}
})

test('graceful close immediately ends the peer session', async () => {
	const port = 33000 + (process.pid % 1000) * 2
	const responder = new AppleMidiSession({
		role: 'responder',
		remoteHost: '',
		remotePort: 0,
		localPort: port,
		sessionName: 'Device',
	})
	const initiator = new AppleMidiSession({
		role: 'initiator',
		remoteHost: '127.0.0.1',
		remotePort: port,
		localPort: 0,
		sessionName: 'Companion',
	})
	try {
		await responder.open()
		await initiator.open()
		await waitForStatus(initiator, (status) => status.connected, 3000)
		const ended = waitForStatus(
			responder,
			(status) => !status.connected && status.lastDisconnectReason === 'Peer ended the session',
			2000,
		)
		initiator.close()
		await ended
	} finally {
		initiator.close()
		responder.close()
	}
})

test('initiator recovers after the responder restarts', async () => {
	const port = 34000 + (process.pid % 1000) * 2
	const initiator = new AppleMidiSession({
		role: 'initiator',
		remoteHost: '127.0.0.1',
		remotePort: port,
		localPort: 0,
		sessionName: 'Companion',
	})
	let responder = new AppleMidiSession({
		role: 'responder',
		remoteHost: '',
		remotePort: 0,
		localPort: port,
		sessionName: 'Device',
	})
	try {
		await responder.open()
		await initiator.open()
		await waitForStatus(initiator, (status) => status.connected, 3000)

		responder.close()
		await waitForStatus(
			initiator,
			(status) => !status.connected && status.lastDisconnectReason === 'Peer ended the session',
			2000,
		)

		responder = new AppleMidiSession({
			role: 'responder',
			remoteHost: '',
			remotePort: 0,
			localPort: port,
			sessionName: 'Device after restart',
		})
		await responder.open()
		await waitForStatus(initiator, (status) => status.connected && status.peerName === 'Device after restart', 4000)
		assert.equal(initiator.getStatus().reconnectAttempts, 0)
	} finally {
		initiator.close()
		responder.close()
	}
})

function waitForStatus(session, predicate, timeout) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			session.off('status', listener)
			reject(new Error('session status timeout'))
		}, timeout)
		const listener = (status) => {
			if (!predicate(status)) return
			clearTimeout(timer)
			session.off('status', listener)
			resolve(status)
		}
		session.on('status', listener)
		if (predicate(session.getStatus())) listener(session.getStatus())
	})
}

test('initiator starts synchronization before connected listeners send the first MIDI', () => {
	const session = new AppleMidiSession({
		role: 'initiator',
		remoteHost: '127.0.0.1',
		remotePort: 5004,
		localPort: 0,
		sessionName: 'Companion',
	})
	const packets = []
	session.data = {}
	session.sendDatagram = (_socket, packet) => packets.push(packet)
	const peer = { address: '127.0.0.1', port: 5004 }
	session.on('status', (status) => {
		if (status.connected) session.send([0x90, 60, 127])
	})
	session.onControl(invitationPacket(0x4f4b, session.token, 1, 'Device'), peer, false)
	assert.equal(packets.length, 0)
	session.onControl(invitationPacket(0x4f4b, session.token, 1, 'Device'), { ...peer, port: 5005 }, true)
	assert.equal(packets.length, 2)
	assert.equal(packets[0].readUInt16BE(2), 0x434b)
	assert.equal(packets[0][8], 0)
	assert.deepEqual(parseRtpMidi(packets[1]), [0x90, 60, 127])
})
