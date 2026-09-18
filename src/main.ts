import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { isIPv4 } from 'node:net'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { GetVariableDefinitions, UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { MidiTransport } from './midi.js'
import { AppleMidiSession } from './network/apple-midi.js'
import {
	buildMessage,
	Commands,
	decode7,
	formatSerial,
	meterToDb,
	parseMessage,
	type DeviceAddress,
} from './protocol/legacy.js'
import {
	profileForExpectedDevice,
	profileForLegacyProduct,
	profileForTngProduct,
	type CapabilityProfile,
} from './devices.js'
import {
	describeMidi,
	formatMidi,
	genericMidiCompatibility,
	isMidiClockOnly,
	programChangeBytes,
	separateRealtimeTelemetry,
	type MidiDetails,
} from './midi-message.js'
import {
	ascii,
	firmwareVersion,
	getActivePresetMessage,
	getActiveSceneMessage,
	getDeviceInfoMessage,
	getPresetNameMessage,
	hardwareVersion,
	hostSessionMessage,
	notificationMessage,
	parseTngMessage,
	pingMessage,
	random28,
	TngDataClass,
	TngMessageClass,
	TngNotificationClass,
	type TngMessage,
} from './protocol/tng.js'

// Companion rate-limits variable publication, not MIDI transport traffic. Clock
// pulses are tracked on every input but exposed at a deliberately lower rate.
export const MIDI_CLOCK_PUBLISH_INTERVAL_MS = 250

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}
export interface DeviceState {
	online: boolean
	address: DeviceAddress
	name: string
	protocolVersion: number
	firmware: string
	manufacturer: string
	modelNumber: string
	hardwareVersion: string
	serialDisplay: string
	identityStatus: string
	profile?: CapabilityProfile
	failoverArmed: boolean
	failoverAlarm: boolean
	mainAudio: number
	mainMidi: number
	backupAudio: number
	backupMidi: number
	meterDb: number[]
	lastAck: string
	lastSeen: number
	midiInCount: number
	midiInDroppedCount: number
	midiOutCount: number
	deviceCommandOutCount: number
	deviceResponseInCount: number
	midiIn: MidiDetails
	midiOut: MidiDetails
	midiClockReceiving: boolean
	midiClockBpm: number
	midiClockPulseCount: number
	lastMidiClockAt: number
	currentPreset: number
	currentPresetName: string
	currentScene: string
	currentMixerSnapshot: number
	lastRecallAt: number
	lastDeviceCommandOut: string
	lastDeviceResponseIn: string
	rtpPeerAddress: string
	rtpReconnectAttempts: number
	rtpLastDisconnectReason: string
	rtpLastConnectedAt: number
}
export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	private usbTransport?: MidiTransport
	private networkTransport?: AppleMidiSession
	private configNetworkTransport?: AppleMidiSession
	state: DeviceState = {
		online: false,
		address: { productId: 0, serial: 0 },
		name: 'Not detected',
		protocolVersion: 0,
		firmware: '',
		manufacturer: '',
		modelNumber: '',
		hardwareVersion: '',
		serialDisplay: '',
		identityStatus: 'Waiting for device',
		failoverArmed: false,
		failoverAlarm: false,
		mainAudio: 0,
		mainMidi: 0,
		backupAudio: 0,
		backupMidi: 0,
		meterDb: [],
		lastAck: '',
		lastSeen: 0,
		midiInCount: 0,
		midiInDroppedCount: 0,
		midiOutCount: 0,
		deviceCommandOutCount: 0,
		deviceResponseInCount: 0,
		midiIn: describeMidi([]),
		midiOut: describeMidi([]),
		midiClockReceiving: false,
		midiClockBpm: 0,
		midiClockPulseCount: 0,
		lastMidiClockAt: 0,
		currentPreset: 0,
		currentPresetName: '',
		currentScene: 'Unknown',
		currentMixerSnapshot: 0,
		lastRecallAt: 0,
		lastDeviceCommandOut: '',
		lastDeviceResponseIn: '',
		rtpPeerAddress: '',
		rtpReconnectAttempts: 0,
		rtpLastDisconnectReason: '',
		rtpLastConnectedAt: 0,
	}
	private transaction = 0
	private readonly tngSession = random28()
	private tngTransaction = 0
	private pollTimer?: NodeJS.Timeout
	private discoveryFallback?: NodeJS.Timeout
	private stateReadTimeout?: NodeJS.Timeout
	private configConnectTimeout?: NodeJS.Timeout
	private configReleaseTimer?: NodeJS.Timeout
	private liveStateKeepaliveTimer?: NodeJS.Timeout
	private readonly pendingStateReads = new Set<string>()
	private notificationTimeoutSeconds = 5
	private notificationClasses: number[] = []
	private liveStateMonitoringActive = false
	private networkConnected = false
	private configNetworkConnected = false
	private identityAttemptAt = 0
	private configRetryAt = 0
	private readonly midiClockIntervals: number[] = []
	private readonly noteReleaseTimers = new Set<NodeJS.Timeout>()
	private midiInPulse = false
	private midiClockPublishTimer?: NodeJS.Timeout
	private midiOutPublishTimer?: NodeJS.Timeout
	private readonly midiMessageQueue: number[][] = []
	private processingMidiMessage = false
	private lastMidiDropWarningAt = 0
	private lastMidiInputStateSignature = ''
	private lifecycleGeneration = 0
	private detectedProfile?: CapabilityProfile
	private deviceModelMismatch = false

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.state.profile = profileForExpectedDevice(config.expectedDevice)
		this.defineSurface()
		await this.connect()
	}
	async destroy(): Promise<void> {
		this.lifecycleGeneration++
		if (this.pollTimer) clearInterval(this.pollTimer)
		if (this.discoveryFallback) clearTimeout(this.discoveryFallback)
		if (this.stateReadTimeout) clearTimeout(this.stateReadTimeout)
		if (this.configConnectTimeout) clearTimeout(this.configConnectTimeout)
		if (this.configReleaseTimer) clearTimeout(this.configReleaseTimer)
		if (this.liveStateKeepaliveTimer) clearInterval(this.liveStateKeepaliveTimer)
		if (this.midiClockPublishTimer) clearTimeout(this.midiClockPublishTimer)
		this.midiClockPublishTimer = undefined
		if (this.midiOutPublishTimer) clearTimeout(this.midiOutPublishTimer)
		this.midiOutPublishTimer = undefined
		this.midiMessageQueue.length = 0
		this.processingMidiMessage = false
		this.lastMidiInputStateSignature = ''
		for (const timer of this.noteReleaseTimers) clearTimeout(timer)
		this.noteReleaseTimers.clear()
		this.closeTransport()
		this.networkConnected = false
		this.configNetworkConnected = false
	}
	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		await this.connect()
	}
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}
	private defineSurface(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdatePresets(this)
		UpdateVariableDefinitions(this)
		this.publishState()
	}

	private updateCapabilitySurface(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdatePresets(this)
		UpdateVariableDefinitions(this)
	}

	private applyDetectedProfile(profile: CapabilityProfile): boolean {
		this.detectedProfile = profile
		const expected = profileForExpectedDevice(this.config.expectedDevice)
		this.deviceModelMismatch = !!expected && expected.name !== profile.name
		this.state.profile = expected ?? profile
		this.updateCapabilitySurface()
		if (this.deviceModelMismatch) {
			this.updateStatus(InstanceStatus.BadConfig, `Configured for ${expected?.name}, but detected ${profile.name}`)
			return false
		}
		return true
	}

	private requireMatchingDevice(): void {
		if (this.deviceModelMismatch)
			throw new Error(
				`Configured interface model does not match the detected ${this.detectedProfile?.name ?? 'device'}`,
			)
	}

	private async connect(): Promise<void> {
		const generation = ++this.lifecycleGeneration
		if (this.pollTimer) clearInterval(this.pollTimer)
		if (this.discoveryFallback) clearTimeout(this.discoveryFallback)
		if (this.stateReadTimeout) clearTimeout(this.stateReadTimeout)
		if (this.configConnectTimeout) clearTimeout(this.configConnectTimeout)
		if (this.configReleaseTimer) clearTimeout(this.configReleaseTimer)
		if (this.liveStateKeepaliveTimer) clearInterval(this.liveStateKeepaliveTimer)
		this.discoveryFallback = undefined
		this.stateReadTimeout = undefined
		this.configConnectTimeout = undefined
		this.configReleaseTimer = undefined
		this.liveStateKeepaliveTimer = undefined
		this.notificationTimeoutSeconds = 5
		this.notificationClasses = []
		this.liveStateMonitoringActive = false
		if (this.midiClockPublishTimer) clearTimeout(this.midiClockPublishTimer)
		if (this.midiOutPublishTimer) clearTimeout(this.midiOutPublishTimer)
		this.midiClockPublishTimer = undefined
		this.midiOutPublishTimer = undefined
		this.midiMessageQueue.length = 0
		this.processingMidiMessage = false
		this.lastMidiInputStateSignature = ''
		this.configRetryAt = 0
		this.identityAttemptAt = 0
		this.pendingStateReads.clear()
		this.closeTransport()
		this.state.online = false
		this.state.address = { productId: 0, serial: 0 }
		this.detectedProfile = undefined
		this.deviceModelMismatch = false
		this.state.profile = profileForExpectedDevice(this.config.expectedDevice)
		this.state.identityStatus = 'Waiting for device'
		this.state.rtpPeerAddress = ''
		this.state.rtpReconnectAttempts = 0
		this.state.rtpLastDisconnectReason = ''
		this.state.rtpLastConnectedAt = 0
		if (this.config.receiveMidiClock === false) {
			this.state.midiClockReceiving = false
			this.state.midiClockBpm = 0
			this.state.midiClockPulseCount = 0
			this.state.lastMidiClockAt = 0
			this.midiClockIntervals.length = 0
		}
		this.updateCapabilitySurface()
		try {
			if ((this.config.transport ?? 'rtp-midi') === 'rtp-midi') {
				if (!isIPv4(this.config.host ?? '')) {
					this.updateStatus(InstanceStatus.BadConfig, 'Enter the iConnectivity interface IPv4 address')
					return
				}
				const role = this.config.role ?? 'initiator'
				const localPort = role === 'responder' ? Number(this.config.responderPort || 5060) : this.config.localPort || 0
				if (
					role === 'responder' &&
					(!Number.isInteger(localPort) || localPort < 1024 || localPort > 65534 || localPort % 2)
				) {
					this.updateStatus(
						InstanceStatus.BadConfig,
						'Choose an even Companion RTP-MIDI control port from 1024 to 65534',
					)
					return
				}
				const transport = new AppleMidiSession({
					role,
					remoteHost: this.config.host,
					remotePort: this.config.remotePort || 5004,
					localPort,
					sessionName: this.config.sessionName || 'Companion iConnectivity',
				})
				this.networkTransport = transport
				transport.on('midi', (bytes: number[]) => {
					if (this.networkTransport === transport && generation === this.lifecycleGeneration)
						this.receiveUserMidi(bytes)
				})
				transport.on('status', (status) => {
					if (this.networkTransport !== transport || generation !== this.lifecycleGeneration) return
					const connectionChanged = status.connected !== this.networkConnected
					const justConnected = status.connected && !this.networkConnected
					this.networkConnected = status.connected
					this.state.lastSeen = status.lastSeen
					this.state.rtpPeerAddress = status.peerAddress
					this.state.rtpReconnectAttempts = status.reconnectAttempts
					this.state.rtpLastDisconnectReason = status.lastDisconnectReason
					if (justConnected) this.state.rtpLastConnectedAt = Date.now()
					if (connectionChanged) this.updateNetworkStatus()
					else this.publishState(false)
					if (justConnected && !this.configNetworkTransport) {
						this.configRetryAt = 0
						void this.openConfigurationTransport(generation)
					}
				})
				await transport.open()
				if (this.networkTransport !== transport || generation !== this.lifecycleGeneration) transport.close()
			} else {
				this.usbTransport = new MidiTransport()
				if (!this.usbTransport.open(this.config.inputPort, this.config.outputPort, (bytes) => this.receive(bytes))) {
					this.updateStatus(InstanceStatus.BadConfig, 'Select valid MIDI input and output ports')
					return
				}
				this.updateStatus(InstanceStatus.Connecting, 'Discovering iConnectivity device')
				this.discover()
			}
			this.pollTimer = setInterval(() => this.poll(), this.config.pollInterval || 1000)
		} catch (error) {
			this.updateStatus(InstanceStatus.ConnectionFailure, String(error))
		}
	}

	private async openConfigurationTransport(generation = this.lifecycleGeneration): Promise<void> {
		if (
			generation !== this.lifecycleGeneration ||
			this.configNetworkTransport ||
			!this.config.host ||
			Date.now() < this.configRetryAt
		)
			return
		const transport = new AppleMidiSession({
			role: 'initiator',
			remoteHost: this.config.host,
			remotePort: this.config.configRemotePort || 5002,
			localPort: this.config.configLocalPort || 0,
			sessionName: `${this.config.sessionName || 'Companion iConnectivity'} Config`,
		})
		this.configNetworkTransport = transport
		let lastDisconnectReason = ''
		transport.on('midi', (bytes: number[]) => {
			if (this.configNetworkTransport === transport && generation === this.lifecycleGeneration) this.receive(bytes)
		})
		transport.on('status', (status) => {
			if (this.configNetworkTransport !== transport || generation !== this.lifecycleGeneration) return
			const connectionChanged = status.connected !== this.configNetworkConnected
			const justConnected = status.connected && !this.configNetworkConnected
			this.configNetworkConnected = status.connected
			this.state.lastSeen = Math.max(this.state.lastSeen, status.lastSeen)
			if (status.lastDisconnectReason && status.lastDisconnectReason !== lastDisconnectReason) {
				lastDisconnectReason = status.lastDisconnectReason
				if (status.lastDisconnectReason === 'Peer rejected the session')
					this.log('warn', 'The device rejected the configuration RTP-MIDI session; it may still be in use')
			}
			if (connectionChanged) this.updateNetworkStatus()
			if (justConnected) {
				if (this.configConnectTimeout) clearTimeout(this.configConnectTimeout)
				this.configConnectTimeout = undefined
				this.configRetryAt = 0
				this.discover(true)
			}
		})
		try {
			await transport.open()
			if (this.configNetworkTransport !== transport || generation !== this.lifecycleGeneration) {
				transport.close()
				return
			}
			this.configConnectTimeout = setTimeout(() => {
				if (
					this.configNetworkTransport !== transport ||
					generation !== this.lifecycleGeneration ||
					this.configNetworkConnected
				)
					return
				this.configRetryAt = Date.now() + 30000
				this.state.identityStatus = 'Configuration discovery unavailable; retrying in 30 seconds'
				this.log(
					'warn',
					'Configuration RTP-MIDI port did not respond; user MIDI remains online; retrying in 30 seconds',
				)
				this.releaseConfigurationTransport(transport)
			}, 10000)
		} catch (error) {
			if (this.configNetworkTransport === transport) this.configNetworkTransport = undefined
			transport.close()
			if (generation === this.lifecycleGeneration) {
				this.configRetryAt = Date.now() + 30000
				this.log('warn', `Configuration session could not open: ${String(error)}`)
			}
		}
	}

	private releaseConfigurationTransport(expected?: AppleMidiSession): void {
		if (expected && this.configNetworkTransport !== expected) return
		if (this.configConnectTimeout) clearTimeout(this.configConnectTimeout)
		this.configConnectTimeout = undefined
		if (this.configReleaseTimer) clearTimeout(this.configReleaseTimer)
		this.configReleaseTimer = undefined
		if (this.liveStateKeepaliveTimer) clearInterval(this.liveStateKeepaliveTimer)
		this.liveStateKeepaliveTimer = undefined
		this.liveStateMonitoringActive = false
		const transport = this.configNetworkTransport
		if (!transport) return
		this.configNetworkTransport = undefined
		this.configNetworkConnected = false
		transport.close()
		this.updateNetworkStatus()
	}

	private nextTngTransaction(): number {
		this.tngTransaction = (this.tngTransaction + 1) & 0x0fffffff
		return this.tngTransaction
	}

	private requestInitialOperationalState(): void {
		if (!this.configNetworkTransport || !this.state.profile) {
			this.releaseConfigurationTransport()
			return
		}
		this.pendingStateReads.clear()
		this.pendingStateReads.add('preset')
		this.sendMidi(getActivePresetMessage(this.state.address, this.nextTngTransaction()), true)
		if (this.state.profile.scenes) {
			this.pendingStateReads.add('scene')
			this.sendMidi(getActiveSceneMessage(this.state.address, this.nextTngTransaction()), true)
		}
		if (this.stateReadTimeout) clearTimeout(this.stateReadTimeout)
		this.stateReadTimeout = setTimeout(() => {
			this.pendingStateReads.clear()
			if (!this.startLiveStateMonitoring()) this.releaseConfigurationTransport()
		}, 1500)
	}

	private finishStateRead(name: string): void {
		this.pendingStateReads.delete(name)
		if (this.pendingStateReads.size > 0) return
		if (this.stateReadTimeout) clearTimeout(this.stateReadTimeout)
		this.stateReadTimeout = undefined
		if (this.startLiveStateMonitoring()) return
		const transport = this.configNetworkTransport
		if (!transport) return
		if (this.configReleaseTimer) clearTimeout(this.configReleaseTimer)
		this.configReleaseTimer = setTimeout(() => {
			this.configReleaseTimer = undefined
			this.releaseConfigurationTransport(transport)
		}, 100)
	}

	private startLiveStateMonitoring(): boolean {
		if (!this.config.livePresetSceneMonitoring || !this.configNetworkTransport) return false
		if (this.liveStateMonitoringActive) return true
		const classes = [
			...(this.notificationClasses.includes(TngNotificationClass.programSelector)
				? [TngNotificationClass.programSelector]
				: []),
			...(this.state.profile?.scenes && this.notificationClasses.includes(TngNotificationClass.failoverStatus)
				? [TngNotificationClass.failoverStatus]
				: []),
		]
		if (!classes.length) {
			this.log('warn', 'The device did not report support for live preset/Scene notifications')
			return false
		}
		this.sendMidi(
			notificationMessage(this.state.address, this.tngSession, this.nextTngTransaction(), true, classes),
			true,
		)
		if (this.liveStateKeepaliveTimer) clearInterval(this.liveStateKeepaliveTimer)
		const keepaliveMs = Math.max(1000, Math.min(30000, Math.floor(this.notificationTimeoutSeconds * 800)))
		this.liveStateKeepaliveTimer = setInterval(() => {
			if (!this.configNetworkTransport || !this.configNetworkConnected) return
			this.sendMidi(pingMessage(this.state.address, this.tngSession, this.nextTngTransaction()), true)
		}, keepaliveMs)
		this.liveStateMonitoringActive = true
		this.updateNetworkStatus()
		this.log('info', 'Live device preset/Scene monitoring enabled')
		return true
	}

	private updateNetworkStatus(): void {
		const connected = this.networkConnected
		this.state.online = connected
		if (this.deviceModelMismatch) {
			this.updateStatus(
				InstanceStatus.BadConfig,
				`Configured for ${this.state.profile?.name}, but detected ${this.detectedProfile?.name}`,
			)
			this.publishState()
			return
		}
		this.updateStatus(
			connected ? InstanceStatus.Ok : InstanceStatus.Connecting,
			connected
				? this.configNetworkConnected
					? this.liveStateMonitoringActive
						? 'RTP MIDI connected; monitoring device state'
						: 'RTP MIDI connected; reading device configuration'
					: 'RTP MIDI connected'
				: 'Waiting for selected RTP-MIDI port',
		)
		this.publishState()
	}

	private receiveUserMidi(bytes: number[]): void {
		this.state.lastSeen = Date.now()
		const separated = separateRealtimeTelemetry(bytes)
		const clockPulses = separated.clockPulses
		if (clockPulses.length && this.config.receiveMidiClock !== false) {
			this.state.midiInCount += clockPulses.length
			const wasReceiving = this.state.midiClockReceiving
			this.trackMidiClock(clockPulses)
			if (!wasReceiving) this.publishMidiClockState()
			else this.scheduleMidiClockPublish()
		}
		bytes = separated.midi
		if (!bytes.length) return
		this.state.midiInCount++
		if (this.midiMessageQueue.length >= 2048) {
			this.midiMessageQueue.shift()
			this.state.midiInDroppedCount++
			const now = Date.now()
			if (now - this.lastMidiDropWarningAt >= 10000) {
				this.lastMidiDropWarningAt = now
				this.log('warn', 'Incoming MIDI trigger queue exceeded 2048 messages; oldest queued message was dropped')
			}
		}
		this.midiMessageQueue.push([...bytes])
		this.processNextMidiMessage()
	}

	private processNextMidiMessage(): void {
		if (this.processingMidiMessage) return
		const bytes = this.midiMessageQueue.shift()
		if (!bytes) return
		this.processingMidiMessage = true
		this.trackPresetAndScene(bytes)
		this.state.midiIn = describeMidi(bytes)
		this.midiInPulse = true
		this.publishMidiInputState()
		setImmediate(() => {
			this.midiInPulse = false
			this.setVariableValues({ midiIn: false })
			this.processingMidiMessage = false
			this.processNextMidiMessage()
		})
	}

	private scheduleMidiClockPublish(): void {
		if (this.midiClockPublishTimer) return
		this.midiClockPublishTimer = setTimeout(() => {
			this.midiClockPublishTimer = undefined
			this.publishMidiClockState()
		}, MIDI_CLOCK_PUBLISH_INTERVAL_MS)
	}

	private publishMidiClockState(): void {
		this.setVariableValues({
			midi_in_count: this.state.midiInCount,
			midi_clock_receiving: this.state.midiClockReceiving,
			midi_clock_bpm: this.state.midiClockBpm,
			midi_clock_pulse_count: this.state.midiClockPulseCount,
			midi_clock_last_timestamp: this.state.lastMidiClockAt ? new Date(this.state.lastMidiClockAt).toISOString() : '',
		})
	}

	private publishMidiInputState(): void {
		const details = this.state.midiIn
		const generic = genericMidiCompatibility(details)
		const signature = [
			details.type,
			details.channel,
			details.number,
			details.value,
			details.noteName,
			details.raw,
			details.summary,
			generic.lastMessage,
			generic.lastNote,
			generic.lastChannel,
			generic.lastMsgType,
			generic.lastValue,
		].join('|')
		if (signature === this.lastMidiInputStateSignature) {
			// Keep the compatibility trigger prompt without republishing unchanged
			// descriptive state for repeated identical MIDI messages.
			this.setVariableValues({
				midi_in_count: this.state.midiInCount,
				midi_in_dropped_count: this.state.midiInDroppedCount,
				midi_in_queue_depth: this.midiMessageQueue.length,
				midiIn: true,
			})
			return
		}
		this.lastMidiInputStateSignature = signature
		const values: Record<string, string | number | boolean> = {
			midi_in_count: this.state.midiInCount,
			midi_in_dropped_count: this.state.midiInDroppedCount,
			midi_in_queue_depth: this.midiMessageQueue.length,
			midi_in_type: details.type,
			midi_in_channel: details.channel,
			midi_in_number: details.number,
			midi_in_value: details.value,
			midi_in_note_name: details.noteName,
			midi_in_raw: details.raw,
			midi_in_summary: details.summary,
			midi_in_timestamp: details.timestamp,
			midiIn: true,
			lastMessage: generic.lastMessage,
			lastNote: generic.lastNote,
			lastChannel: generic.lastChannel,
			lastMsgType: generic.lastMsgType,
			lastValue: generic.lastValue,
			last_midi_in: details.raw,
			last_recall_timestamp: this.state.lastRecallAt ? new Date(this.state.lastRecallAt).toISOString() : '',
		}
		if (this.state.profile?.presets) {
			values.current_preset = this.state.currentPreset || 'Unknown'
			values.current_preset_name =
				this.state.currentPresetName || (this.state.currentPreset ? `Preset ${this.state.currentPreset}` : 'Unknown')
		}
		if (this.state.profile?.scenes) values.current_scene = this.state.currentScene
		if (this.state.profile?.mixerSnapshots) values.current_mixer_snapshot = this.state.currentMixerSnapshot || 'Unknown'
		this.setVariableValues(values)
	}

	private publishMidiOutputState(): void {
		const details = this.state.midiOut
		this.setVariableValues({
			midi_out_count: this.state.midiOutCount,
			midi_out_type: details.type,
			midi_out_channel: details.channel,
			midi_out_number: details.number,
			midi_out_value: details.value,
			midi_out_note_name: details.noteName,
			midi_out_raw: details.raw,
			midi_out_summary: details.summary,
			midi_out_timestamp: details.timestamp,
			last_midi_out: details.raw,
		})
	}

	private scheduleMidiOutputPublish(): void {
		if (this.midiOutPublishTimer) return
		this.midiOutPublishTimer = setTimeout(() => {
			this.midiOutPublishTimer = undefined
			this.publishMidiOutputState()
		}, 100)
	}

	pressMidiNote(options: {
		channel: number
		note: number
		velocity: number
		releaseVelocity: number
		duration: number
	}): void {
		const channel = Math.max(1, Math.min(16, Math.round(options.channel)))
		const note = Math.max(0, Math.min(127, Math.round(options.note)))
		this.sendMidi([0x90 | (channel - 1), note, Math.max(1, Math.min(127, Math.round(options.velocity)))])
		const timer = setTimeout(
			() => {
				this.noteReleaseTimers.delete(timer)
				try {
					this.sendMidi([0x80 | (channel - 1), note, Math.max(0, Math.min(127, Math.round(options.releaseVelocity)))])
				} catch (error) {
					this.log('warn', `Could not send scheduled MIDI note off: ${String(error)}`)
				}
			},
			Math.max(1, Math.min(60000, Math.round(options.duration))),
		)
		this.noteReleaseTimers.add(timer)
	}

	private trackPresetAndScene(bytes: readonly number[]): void {
		if (bytes.length < 2 || (bytes[0] & 0xf0) !== 0xc0) return
		const channel = (bytes[0] & 0x0f) + 1
		const program = (bytes[1] & 0x7f) + 1
		let observed = false
		if (channel === (this.config.presetChannel || 1)) {
			this.state.currentPreset = program
			this.state.currentPresetName = `Preset ${program}`
			if (this.state.profile?.mixerSnapshots) this.state.currentMixerSnapshot = 1
			observed = true
		}
		if (this.config.sceneChannel > 0 && channel === this.config.sceneChannel && this.state.profile?.scenes) {
			this.state.currentScene = program === 1 ? 'A' : program === 2 ? 'B' : String(program)
			observed = true
		}
		if (
			this.config.mixerSnapshotChannel > 0 &&
			channel === this.config.mixerSnapshotChannel &&
			this.state.profile?.mixerSnapshots
		) {
			this.state.currentMixerSnapshot = program
			observed = true
		}
		if (observed) this.state.lastRecallAt = Date.now()
	}

	recallPreset(preset: number): void {
		this.requireMatchingDevice()
		const value = Math.max(1, Math.min(128, Math.round(preset)))
		const channel = Math.max(1, Math.min(16, this.config.presetChannel || 1))
		const bytes = programChangeBytes(channel, value)
		this.log('info', `Recall preset ${value}: sending ${formatMidi(bytes)} on RTP-MIDI channel ${channel}`)
		this.sendMidi(bytes)
		this.state.currentPreset = value
		if (this.state.profile?.mixerSnapshots) this.state.currentMixerSnapshot = 1
		this.state.lastRecallAt = Date.now()
		this.publishState(false)
	}

	recallScene(scene: string): void {
		this.requireMatchingDevice()
		if (!this.state.profile?.scenes) throw new Error('The detected device does not support Scene A/B')
		if (!this.config.sceneChannel)
			throw new Error('Configure a PlayAUDIO Scene A/B MIDI channel in connection settings')
		const normalized = scene === 'B' ? 'B' : 'A'
		const channel = Math.max(1, Math.min(16, this.config.sceneChannel))
		const bytes = programChangeBytes(channel, normalized === 'A' ? 1 : 2)
		this.log('info', `Recall Scene ${normalized}: sending ${formatMidi(bytes)} on RTP-MIDI channel ${channel}`)
		this.sendMidi(bytes)
		this.state.currentScene = normalized
		this.state.lastRecallAt = Date.now()
		this.publishState()
	}

	recallMixerSnapshot(snapshot: number): void {
		this.requireMatchingDevice()
		if (!this.state.profile?.mixerSnapshots) throw new Error('The detected device does not support mixer snapshots')
		if (!this.config.mixerSnapshotChannel)
			throw new Error('Configure a PlayAUDIO mixer snapshot MIDI channel in connection settings')
		const value = Math.max(1, Math.min(128, Math.round(snapshot)))
		const channel = Math.max(1, Math.min(16, this.config.mixerSnapshotChannel))
		const bytes = programChangeBytes(channel, value)
		this.log('info', `Recall mixer snapshot ${value}: sending ${formatMidi(bytes)} on RTP-MIDI channel ${channel}`)
		this.sendMidi(bytes)
		this.state.currentMixerSnapshot = value
		this.state.lastRecallAt = Date.now()
		this.publishState()
	}

	private trackMidiClock(bytes: readonly number[]): void {
		for (const byte of bytes) {
			if (byte !== 0xf8) continue
			const now = Date.now()
			if (this.state.lastMidiClockAt) {
				const interval = now - this.state.lastMidiClockAt
				if (interval > 0 && interval < 1000) {
					this.midiClockIntervals.push(interval)
					if (this.midiClockIntervals.length > 48) this.midiClockIntervals.shift()
					const average =
						this.midiClockIntervals.reduce((sum, value) => sum + value, 0) / this.midiClockIntervals.length
					this.state.midiClockBpm = Math.round((60000 / (average * 24)) * 10) / 10
				}
			}
			this.state.lastMidiClockAt = now
			this.state.midiClockPulseCount++
			this.state.midiClockReceiving = true
		}
	}

	send(command: number, data: number[] = [], query = true, address = this.state.address): void {
		this.transaction = (this.transaction + 1) & 0x3fff
		this.sendMidi(buildMessage({ ...address, transactionId: this.transaction, query, command, data }), true)
	}
	sendMidi(bytes: number[], internal = false): void {
		if (internal) {
			if (this.configNetworkTransport) this.configNetworkTransport.send(bytes)
			else if (this.usbTransport) this.usbTransport.send(bytes)
			else throw new Error('The device configuration session is not connected')
		} else if (this.networkTransport) this.networkTransport.send(bytes)
		else if (this.usbTransport) this.usbTransport.send(bytes)
		else throw new Error('No MIDI transport is connected')
		const details = describeMidi(bytes)
		if (internal) {
			this.state.deviceCommandOutCount++
			this.state.lastDeviceCommandOut = details.raw
			this.publishState(false)
		} else {
			this.state.midiOutCount++
			this.state.midiOut = details
			if (isMidiClockOnly(bytes)) this.scheduleMidiOutputPublish()
			else this.publishMidiOutputState()
		}
	}
	discover(force = false): void {
		if (this.networkTransport && !this.configNetworkTransport) {
			if (this.networkConnected) void this.openConfigurationTransport()
			return
		}
		const now = Date.now()
		if (!force && now - this.identityAttemptAt < 5000) return
		this.identityAttemptAt = now
		this.state.identityStatus = 'Discovering TNG identity'
		this.tngTransaction = (this.tngTransaction + 1) & 0x0fffffff
		this.sendMidi(hostSessionMessage(this.tngSession, this.tngTransaction), true)
		if (this.discoveryFallback) clearTimeout(this.discoveryFallback)
		this.discoveryFallback = setTimeout(() => {
			if (!this.state.address.productId) {
				this.state.identityStatus = 'Trying compatibility identity'
				this.send(Commands.getDevice, [], true, { productId: 0, serial: 0 })
			}
		}, 2000)
	}
	poll(): void {
		if (
			this.config.receiveMidiClock !== false &&
			this.state.midiClockReceiving &&
			Date.now() - this.state.lastMidiClockAt > 1500
		) {
			this.state.midiClockReceiving = false
			this.state.midiClockBpm = 0
			this.midiClockIntervals.length = 0
			this.publishMidiClockState()
		}
		if (this.configNetworkTransport && !this.configNetworkTransport.getStatus().connected) return
		if (!this.state.address.productId) return this.discover()
		if (this.deviceModelMismatch) return
		if (
			this.state.profile?.protocol === 'tng' &&
			!['TNG identity received', 'TNG product identified via compatibility discovery'].includes(
				this.state.identityStatus,
			) &&
			Date.now() - this.identityAttemptAt >= 5000
		)
			return this.discover(true)
		if (Date.now() - this.state.lastSeen > Math.max(4000, this.config.pollInterval * 4)) {
			this.state.online = false
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Device stopped responding')
			this.publishState()
			if (!this.networkTransport) this.discover()
			return
		}
		if (this.state.profile?.protocol === 'legacy' && this.state.profile.failover)
			this.send(Commands.getHardwareValue, [3, 0])
		if (this.state.profile?.protocol === 'legacy' && this.state.profile.metering)
			this.send(Commands.getAudioPortMeter, [...this.u14(this.config.audioPortId || 3), 2])
	}
	setFailover(armed: boolean, clearAlarm = false): void {
		this.requireMatchingDevice()
		this.send(Commands.retHardwareValue, [1, 3, 0, clearAlarm ? 3 : 1, armed ? 1 : 0], true)
	}
	applySnapshot(type: number, id: number): void {
		this.requireMatchingDevice()
		// Older module presets used the published configuration-session Scene
		// snapshot command. TNG devices release that session after discovery so
		// Auracle remains available. Preserve existing Companion buttons by
		// translating those two legacy scene IDs to the native RTP Program Change.
		if (type === 127 && this.state.profile?.scenes && (id === 1 || id === 2)) {
			this.recallScene(id === 1 ? 'A' : 'B')
			return
		}
		this.send(Commands.applySnapshot, [1, type, id], true)
	}
	applySnapshotList(type: number, index: number): void {
		this.requireMatchingDevice()
		this.send(Commands.applySnapshotList, [1, type, index], true)
	}
	saveCurrent(): void {
		this.requireMatchingDevice()
		this.send(Commands.saveRestore, [1], true)
	}
	requestRefresh(): void {
		this.requireMatchingDevice()
		this.send(Commands.getCommandList)
		this.send(Commands.getInfo, [5])
		this.send(Commands.getSnapshotGlobal)
		if (this.state.profile?.failover) this.send(Commands.getHardwareValue, [3, 0])
	}
	u14(value: number): number[] {
		return [(value >> 7) & 0x7f, value & 0x7f]
	}

	private receive(bytes: number[]): void {
		const tngMessage = parseTngMessage(bytes)
		if (tngMessage) {
			this.receiveTng(tngMessage, bytes)
			return
		}
		const message = parseMessage(bytes)
		if (!message) {
			this.receiveUserMidi(bytes)
			return
		}
		this.state.deviceResponseInCount++
		this.state.lastDeviceResponseIn = describeMidi(bytes).raw
		this.state.online = true
		this.state.lastSeen = Date.now()
		this.state.address = { productId: message.productId, serial: message.serial }
		if (message.command === Commands.retDevice) {
			this.state.protocolVersion = message.data[0] ?? 0
			const knownTngProduct = [14, 15, 17].includes(message.productId)
			const detectedProfile = knownTngProduct
				? profileForTngProduct(message.productId)
				: profileForLegacyProduct(message.productId)
			const matches = this.applyDetectedProfile(detectedProfile)
			this.state.name = detectedProfile.name
			this.state.identityStatus = knownTngProduct
				? 'TNG product identified via compatibility discovery'
				: 'Legacy identity received'
			if (matches) this.updateStatus(InstanceStatus.Ok, `${detectedProfile.name} connected`)
			if (!matches) {
				this.publishState()
				return
			} else if (knownTngProduct) {
				this.identityAttemptAt = 0
				this.requestInitialOperationalState()
			} else this.requestRefresh()
		} else if (message.command === Commands.retInfo && message.data[0] === 5)
			this.state.firmware = String.fromCharCode(...message.data.slice(2, 2 + (message.data[1] ?? 0)))
		else if (message.command === Commands.ack)
			this.state.lastAck = `${decode7(message.data.slice(0, 2)).toString(16)}:${message.data[2] === 0 ? 'OK' : `error ${message.data[2]}`}`
		else if (message.command === Commands.retHardwareValue && message.data[1] === 3) {
			const flags = message.data[4] ?? 0
			this.state.failoverArmed = !!(flags & 1)
			this.state.failoverAlarm = !!(flags & 2)
			this.state.mainAudio = message.data[5] ?? 0
			this.state.mainMidi = message.data[6] ?? 0
			this.state.backupAudio = message.data[7] ?? 0
			this.state.backupMidi = message.data[8] ?? 0
		} else if (message.command === Commands.retAudioPortMeter) {
			const values: number[] = []
			let offset = 4
			const blocks = message.data[3] ?? 0
			for (let block = 0; block < blocks; block++) {
				const kind = message.data[offset++]
				const count = message.data[offset++]
				for (let i = 0; i < count; i++) {
					const value = decode7(message.data.slice(offset, offset + 2))
					offset += 2
					if (kind & 2) values.push(meterToDb(value))
				}
			}
			this.state.meterDb = values
		}
		this.publishState()
	}

	private receiveTng(message: TngMessage, raw: number[]): void {
		if (message.sessionId !== this.tngSession && message.sessionId !== 0) return
		this.identityAttemptAt = 0
		this.state.deviceResponseInCount++
		this.state.lastDeviceResponseIn = describeMidi(raw).raw
		this.state.online = true
		this.state.lastSeen = Date.now()
		this.state.address = { productId: message.productId, serial: message.serial }
		const detectedProfile = profileForTngProduct(message.productId)
		if (!this.applyDetectedProfile(detectedProfile)) {
			this.publishState()
			return
		}
		if (message.messageClass === TngMessageClass.deviceSession && message.dataClass === TngDataClass.sessionInfo) {
			if (this.discoveryFallback) clearTimeout(this.discoveryFallback)
			this.state.identityStatus = 'TNG session established; requesting identity'
			this.identityAttemptAt = Date.now()
			this.sendMidi(getDeviceInfoMessage(this.state.address, this.tngSession, this.nextTngTransaction()), true)
		} else if (
			(message.messageClass === TngMessageClass.returnParameterValue ||
				message.messageClass === TngMessageClass.notifyParameterValue) &&
			message.dataClass === TngDataClass.audioPortInfo
		) {
			const mixerSnapshot = message.parameters.get(0x50)?.[0]
			if (mixerSnapshot) {
				this.state.currentMixerSnapshot = mixerSnapshot
				this.state.lastRecallAt = Date.now()
			}
		} else if (
			(message.messageClass === TngMessageClass.returnParameterValue ||
				message.messageClass === TngMessageClass.notifyParameterValue) &&
			message.dataClass === TngDataClass.deviceInfo
		) {
			const productName = ascii(message.parameters.get(0x01))
			this.state.manufacturer = ascii(message.parameters.get(0x02))
			this.state.modelNumber = ascii(message.parameters.get(0x03))
			this.state.serialDisplay = ascii(message.parameters.get(0x04))
			this.state.firmware = firmwareVersion(message.parameters.get(0x05))
			this.state.hardwareVersion = hardwareVersion(message.parameters.get(0x06))
			this.notificationTimeoutSeconds = message.parameters.get(0x19)?.[0] || 5
			this.notificationClasses = message.parameters.get(0x1a) || []
			this.state.name = ascii(message.parameters.get(0x40)) || productName || detectedProfile.name
			this.state.identityStatus = 'TNG identity received'
			this.updateStatus(InstanceStatus.Ok, `${productName || detectedProfile.name} connected`)
			this.requestInitialOperationalState()
		} else if (
			(message.messageClass === TngMessageClass.returnParameterValue ||
				message.messageClass === TngMessageClass.notifyParameterValue) &&
			message.dataClass === TngDataClass.presetInfo
		) {
			const presetValue = message.parameters.get(0x01)?.[0]
			const presetName = ascii(message.parameters.get(0x02))
			const scene = message.parameters.get(0x04)?.[0]
			if (presetValue) {
				this.state.currentPreset = presetValue
				if (message.messageClass === TngMessageClass.notifyParameterValue && this.state.profile?.mixerSnapshots)
					this.state.currentMixerSnapshot = 1
				this.state.currentPresetName = ''
				this.pendingStateReads.delete('preset')
				this.pendingStateReads.add('presetName')
				this.sendMidi(getPresetNameMessage(this.state.address, this.nextTngTransaction(), presetValue), true)
			}
			if (presetName) {
				this.state.currentPresetName = presetName
				this.finishStateRead('presetName')
			}
			if (scene) {
				this.state.currentScene = scene === 1 ? 'A' : scene === 2 ? 'B' : String(scene)
				this.finishStateRead('scene')
			}
		} else if (
			(message.messageClass === TngMessageClass.returnParameterValue ||
				message.messageClass === TngMessageClass.notifyParameterValue) &&
			message.dataClass === TngDataClass.sceneInfo
		) {
			const scene = message.parameters.get(0x41)?.[0]
			if (scene) {
				this.state.currentScene = scene === 1 ? 'A' : scene === 2 ? 'B' : String(scene)
				this.finishStateRead('scene')
			}
		}
		this.publishState()
	}

	private publishState(checkFeedbacks = true): void {
		const s = this.state
		const generic = genericMidiCompatibility(s.midiIn)
		const values: Record<string, string | number | boolean> = {
			online: s.online,
			device_name: s.name,
			manufacturer: s.manufacturer,
			model_number: s.modelNumber,
			product_id: s.address.productId,
			serial_number: s.serialDisplay || formatSerial(s.address.serial),
			protocol_version: s.protocolVersion,
			firmware_version: s.firmware,
			hardware_version: s.hardwareVersion,
			identity_status: s.identityStatus,
			detected_capabilities: s.profile
				? [
						'midi',
						s.profile.midiRouting && 'routing',
						s.profile.rtpMidi && 'rtp-midi',
						s.profile.audio && 'audio',
						s.profile.metering && 'metering',
						s.profile.failover && 'failover',
						s.profile.scenes && 'scenes',
						s.profile.presets && 'presets',
						s.profile.mixerSnapshots && 'mixer-snapshots',
						s.profile.audioProtection && 'audio-protection',
					]
						.filter(Boolean)
						.join(', ')
				: 'detecting',
			rtp_peer_address: s.rtpPeerAddress,
			rtp_reconnect_attempts: s.rtpReconnectAttempts,
			rtp_last_disconnect_reason: s.rtpLastDisconnectReason,
			rtp_last_connected_timestamp: s.rtpLastConnectedAt ? new Date(s.rtpLastConnectedAt).toISOString() : '',
			supports_audio: !!s.profile?.audio,
			supports_failover: !!s.profile?.failover,
			supports_metering: !!s.profile?.metering,
			supports_scenes: !!s.profile?.scenes,
			supports_mixer_snapshots: !!s.profile?.mixerSnapshots,
			supports_midi_routing: !!s.profile?.midiRouting,
			supports_rtp_midi: !!s.profile?.rtpMidi,
			failover_armed: s.failoverArmed,
			failover_alarm: s.failoverAlarm,
			main_audio_status: s.mainAudio,
			main_midi_status: s.mainMidi,
			backup_audio_status: s.backupAudio,
			backup_midi_status: s.backupMidi,
			last_ack: s.lastAck,
			midi_in_count: s.midiInCount,
			midi_in_dropped_count: s.midiInDroppedCount,
			midi_in_queue_depth: this.midiMessageQueue.length,
			midi_out_count: s.midiOutCount,
			midi_in_type: s.midiIn.type,
			midi_in_channel: s.midiIn.channel,
			midi_in_number: s.midiIn.number,
			midi_in_value: s.midiIn.value,
			midi_in_note_name: s.midiIn.noteName,
			midi_in_raw: s.midiIn.raw,
			midi_in_summary: s.midiIn.summary,
			midi_in_timestamp: s.midiIn.timestamp,
			midiIn: this.midiInPulse,
			lastMessage: generic.lastMessage,
			lastNote: generic.lastNote,
			lastChannel: generic.lastChannel,
			lastMsgType: generic.lastMsgType,
			lastValue: generic.lastValue,
			midi_out_type: s.midiOut.type,
			midi_out_channel: s.midiOut.channel,
			midi_out_number: s.midiOut.number,
			midi_out_value: s.midiOut.value,
			midi_out_note_name: s.midiOut.noteName,
			midi_out_raw: s.midiOut.raw,
			midi_out_summary: s.midiOut.summary,
			midi_out_timestamp: s.midiOut.timestamp,
			midi_clock_receiving: s.midiClockReceiving,
			midi_clock_bpm: s.midiClockBpm,
			midi_clock_pulse_count: s.midiClockPulseCount,
			midi_clock_last_timestamp: s.lastMidiClockAt ? new Date(s.lastMidiClockAt).toISOString() : '',
			current_preset: s.currentPreset || 'Unknown',
			current_preset_name: s.currentPresetName || (s.currentPreset ? `Preset ${s.currentPreset}` : 'Unknown'),
			current_scene: s.currentScene,
			current_mixer_snapshot: s.currentMixerSnapshot || 'Unknown',
			last_recall_timestamp: s.lastRecallAt ? new Date(s.lastRecallAt).toISOString() : '',
			last_midi_in: s.midiIn.raw,
			last_midi_out: s.midiOut.raw,
			device_command_out_count: s.deviceCommandOutCount,
			device_response_in_count: s.deviceResponseInCount,
			last_device_command_out: s.lastDeviceCommandOut,
			last_device_response_in: s.lastDeviceResponseIn,
		}
		for (let i = 0; i < (s.profile?.meterChannels ?? 0); i++)
			values[`meter_${i + 1}_db`] = Number.isFinite(s.meterDb[i]) ? Math.round(s.meterDb[i] * 10) / 10 : -99
		const allowed = new Set(Object.keys(GetVariableDefinitions(s.profile, this.config.receiveMidiClock !== false)))
		this.setVariableValues(Object.fromEntries(Object.entries(values).filter(([id]) => allowed.has(id))))
		if (checkFeedbacks) this.checkAllFeedbacks()
	}

	private closeTransport(): void {
		if (this.configConnectTimeout) clearTimeout(this.configConnectTimeout)
		this.configConnectTimeout = undefined
		if (this.configReleaseTimer) clearTimeout(this.configReleaseTimer)
		this.configReleaseTimer = undefined
		this.usbTransport?.close()
		this.networkTransport?.close()
		this.configNetworkTransport?.close()
		this.usbTransport = undefined
		this.networkTransport = undefined
		this.configNetworkTransport = undefined
		this.networkConnected = false
		this.configNetworkConnected = false
	}
}
