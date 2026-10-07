// Loopback stand-ins for Companion and an iConnectivity TNG interface. They
// exercise the compiled module without hardware; replies follow the shapes in
// docs/PROTOCOL_NOTES.md and the parser in src/protocol/tng.ts.
import ModuleInstance from '../../dist/main.js'
import { AppleMidiSession } from '../../dist/network/apple-midi.js'
import { buildTngMessage, parseTngMessage } from '../../dist/protocol/tng.js'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function waitFor(predicate, timeoutMs = 5000, message = 'condition') {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (predicate()) return
		await sleep(20)
	}
	throw new Error(`Timed out waiting for ${message}`)
}

let nextPort = 36000 + (process.pid % 500) * 16
export function allocatePorts(count = 1) {
	const ports = Array.from({ length: count }, (_, index) => nextPort + index * 2)
	nextPort += count * 2
	return ports
}

/** Creates a module instance whose Companion host calls are recorded. */
export function createModule() {
	const record = { statuses: [], variables: {}, feedbackChecks: 0, actionDefinitions: 0, actions: {}, feedbacks: {} }
	const context = new Proxy(
		{ id: 'test', _isInstanceContext: true },
		{
			get(target, key) {
				if (key in target) return target[key]
				if (key === 'updateStatus') return (status, message) => record.statuses.push({ status, message })
				if (key === 'setVariableValues') return (values) => Object.assign(record.variables, values)
				if (key === 'checkAllFeedbacks') return () => record.feedbackChecks++
				if (key === 'setActionDefinitions')
					return (definitions) => {
						record.actionDefinitions++
						record.actions = definitions
					}
				if (key === 'setFeedbackDefinitions') return (definitions) => (record.feedbacks = definitions)
				return () => {}
			},
		},
	)
	const instance = new ModuleInstance(context)
	instance.log = () => {}
	return { instance, record, lastStatus: () => record.statuses.at(-1) }
}

export function moduleConfig(overrides = {}) {
	return {
		expectedDevice: 'auto',
		transport: 'rtp-midi',
		role: 'initiator',
		host: '127.0.0.1',
		remotePort: 0,
		localPort: 0,
		responderPort: 5060,
		configRemotePort: 0,
		configLocalPort: 0,
		sessionName: 'Test',
		pollInterval: 1000,
		audioPortId: 3,
		presetChannel: 1,
		sceneChannel: 2,
		mixerSnapshotChannel: 0,
		advanced: false,
		receiveMidiClock: true,
		livePresetSceneMonitoring: false,
		...overrides,
	}
}

function parameterContent(dataClass, parameters) {
	const items = Object.entries(parameters).flatMap(([id, value]) => [2 + value.length, Number(id), ...value])
	return [0x43, dataClass, 1, 3 + items.length, 0x03, Object.keys(parameters).length, ...items]
}

const bytes = (text) => [...Buffer.from(text, 'ascii')]

/** A PlayAUDIO1U-like interface with a user RTP port and a TNG configuration port. */
export class FakeTngDevice {
	constructor({ userPort, configPort, productId = 17, preset = 3, presetName = 'Sunday Band', scene = 1 }) {
		Object.assign(this, { userPort, configPort, productId, preset, presetName, scene })
		this.address = { productId, serial: 1 }
		this.requests = []
		this.registrations = 0
		this.userMidi = []
	}

	async start() {
		this.user = new AppleMidiSession({
			role: 'responder',
			remoteHost: '',
			remotePort: 0,
			localPort: this.userPort,
			sessionName: 'Device',
		})
		this.user.on('midi', (midi) => this.userMidi.push(midi))
		await this.user.open()
		await this.startConfig()
	}

	async startConfig() {
		this.config = new AppleMidiSession({
			role: 'responder',
			remoteHost: '',
			remotePort: 0,
			localPort: this.configPort,
			sessionName: 'Device Config',
		})
		this.config.on('midi', (midi) => this.handleConfig(midi))
		await this.config.open()
	}

	/** Simulates an interface reboot of the configuration endpoint. */
	async restartConfig() {
		this.config.close()
		// close() sends the end-session packet before releasing the port.
		for (let attempt = 0; ; attempt++) {
			try {
				await this.startConfig()
				return
			} catch (error) {
				if (error.code !== 'EADDRINUSE' || attempt > 50) throw error
				await sleep(20)
			}
		}
	}

	configConnected() {
		return this.config.getStatus().connected
	}

	requestCount(kind) {
		return this.requests.filter((request) => request === kind).length
	}

	reply(message, content) {
		this.config.send(buildTngMessage(this.address, message.sessionId, message.transactionId, content))
	}

	handleConfig(midi) {
		const message = parseTngMessage(midi)
		if (!message) return
		const content = message.content
		if (!content.length) {
			this.requests.push('ping')
			this.reply(message, [])
		} else if (content[0] === 0x01) {
			this.requests.push('hostSession')
			this.reply(message, [0x41, 0x01])
		} else if (content[0] === 0x11) {
			this.requests.push('notify')
			this.registrations++
		} else if (content[0] === 0x03 && content[1] === 0x02) {
			this.requests.push('deviceInfo')
			this.reply(message, parameterContent(0x02, { 0x01: bytes('PlayAUDIO1U'), 0x19: [5], 0x1a: [0x01, 0x06] }))
		} else if (content[0] === 0x03 && content[1] === 0x03 && content[2] === 0x01) {
			this.requests.push('preset')
			this.reply(message, parameterContent(0x03, { 0x01: [this.preset] }))
		} else if (content[0] === 0x03 && content[1] === 0x03) {
			this.requests.push('presetName')
			this.reply(message, parameterContent(0x03, { 0x02: bytes(this.presetName) }))
		} else if (content[0] === 0x03 && content[1] === 0x08) {
			this.requests.push('scene')
			this.reply(message, parameterContent(0x08, { 0x41: [this.scene] }))
		}
	}

	close() {
		this.user?.close()
		this.config?.close()
	}
}
