// Loopback stand-ins for Companion and a PlayAUDIO1U answering TNG status reads
// on its regular RTP port, as used by automatic (regular-RTP) monitoring.
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

let nextPort = 37000 + (process.pid % 400) * 12
export function allocatePort() {
	nextPort += 2
	return nextPort
}

/** Creates a module instance whose Companion host calls are recorded. */
export function createModule() {
	const record = { statuses: [], variables: {}, feedbackChecks: 0, actionDefinitions: 0 }
	const context = new Proxy(
		{ id: 'test', _isInstanceContext: true },
		{
			get(target, key) {
				if (key in target) return target[key]
				if (key === 'updateStatus') return (status, message) => record.statuses.push({ status, message })
				if (key === 'setVariableValues') return (values) => Object.assign(record.variables, values)
				if (key === 'checkAllFeedbacks') return () => record.feedbackChecks++
				if (key === 'setActionDefinitions') return () => record.actionDefinitions++
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
		expectedDevice: 'playaudio1u',
		transport: 'rtp-midi',
		role: 'initiator',
		host: '127.0.0.1',
		remotePort: 0,
		localPort: 0,
		responderPort: 5060,
		configRemotePort: 5002,
		configLocalPort: 0,
		sessionName: 'Test',
		pollInterval: 1000,
		audioPortId: 3,
		presetChannel: 1,
		sceneChannel: 2,
		mixerSnapshotChannel: 0,
		advanced: false,
		showDiagnostics: true,
		receiveMidiClock: true,
		livePresetSceneMonitoring: false,
		statusConnection: 'automatic',
		...overrides,
	}
}

export class FakeRegularRtpDevice {
	constructor({ port, preset = 3, presetName = 'Band', scene = 2 } = {}) {
		Object.assign(this, { port, preset, presetName, scene })
		this.address = { productId: 17, serial: 1 }
		this.received = []
	}

	async start() {
		this.session = new AppleMidiSession({
			role: 'responder',
			remoteHost: '',
			remotePort: 0,
			localPort: this.port,
			sessionName: 'PA1U',
		})
		this.session.on('midi', (midi) => this.handle(midi))
		await this.session.open()
	}

	close() {
		this.session?.close()
	}

	/** Raw MIDI messages received from Companion, oldest first. */
	tngRequests() {
		return this.received.map((midi) => parseTngMessage(midi)).filter(Boolean)
	}

	notification(content, sessionId) {
		return buildTngMessage(this.address, sessionId, 0x7f, content)
	}

	handle(midi) {
		this.received.push(midi)
		const message = parseTngMessage(midi)
		if (!message) return
		this.hostSessionId = message.sessionId
		const content = message.content
		const reply = (body) =>
			this.session.send(buildTngMessage(this.address, message.sessionId, message.transactionId, body))
		if (!content.length) reply([])
		else if (content[0] === 0x01) reply([0x41, 1, 0])
		else if (content[0] === 0x11) reply([0x40, 0, 0x11, 0, 0])
		else if (content[0] === 0x03 && content[1] === 0x02) reply([0x43, 2, 1, 10, 3, 2, 3, 0x19, 5, 4, 0x1a, 1, 6])
		else if (content[0] === 0x03 && content[1] === 0x03 && content[2] === 0x02)
			reply([
				0x43,
				3,
				1,
				3 + 2 + this.presetName.length,
				3,
				1,
				2 + this.presetName.length,
				2,
				...Buffer.from(this.presetName),
			])
		else if (content[0] === 0x03 && content[1] === 0x03 && content.at(-1) === 0x01)
			reply([0x43, 3, 1, 6, 3, 1, 3, 1, this.preset])
		else if (content[0] === 0x03 && content[1] === 0x03 && content.at(-1) === 0x04)
			reply([0x43, 3, 1, 6, 3, 1, 3, 4, this.scene])
	}
}
