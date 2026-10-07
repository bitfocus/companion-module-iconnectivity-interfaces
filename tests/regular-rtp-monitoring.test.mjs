import assert from 'node:assert/strict'
import test from 'node:test'
import ModuleInstance from '../dist/main.js'
import { buildTngMessage, parseTngMessage } from '../dist/protocol/tng.js'

// Exercise the actual module handlers with isolated transports/publication.
function harness(t, regular = true) {
	t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
	const instance = Object.create(ModuleInstance.prototype)
	const sent = []
	const userPackets = []
	Object.assign(instance, {
		config: {
			transport: 'rtp-midi',
			role: 'initiator',
			statusConnection: regular ? 'automatic' : 'configuration',
			livePresetSceneMonitoring: true,
			expectedDevice: 'auto',
			presetChannel: 1,
			sceneChannel: 2,
		},
		state: {
			address: { productId: 0, serial: 0 },
			currentPreset: 0,
			currentPresetName: '',
			currentScene: 'Unknown',
			deviceCommandOutCount: 0,
			deviceResponseInCount: 0,
			midiInCount: 0,
			stateMonitoring: 'Not monitoring',
		},
		tngSession: 12345,
		tngTransaction: 0,
		pendingStateReads: new Set(),
		notificationClasses: [],
		notificationTimeoutSeconds: 5,
		regularRtpRetryAt: 0,
		regularStateReadTransactions: new Map(),
		networkConnected: true,
		liveStateMonitoringActive: false,
		lifecycleGeneration: 1,
		networkTransport: {
			send(bytes) {
				const parsed = parseTngMessage(bytes)
				if (parsed) sent.push(parsed)
				else userPackets.push(bytes)
			},
		},
		publishState() {},
		publishMidiOutputState() {},
		updateCapabilitySurface() {},
		updateStatus() {},
		log() {},
	})
	function reply(
		content,
		transaction = sent.at(-1)?.transactionId,
		session = instance.tngSession,
		address = { productId: 17, serial: 1 },
	) {
		instance.receiveUserMidi(buildTngMessage(address, session, transaction, content))
	}
	return { instance, sent, reply, userPackets }
}

function identity(h) {
	h.instance.discover(true)
	h.reply([0x41, 1, 0])
	// DeviceInfo: notification timeout and supported classes.
	h.reply([0x43, 2, 1, 10, 3, 2, 3, 0x19, 5, 4, 0x1a, 1, 6])
}

function initialState(h) {
	identity(h)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 1])
}

test('regular RTP discovers and reads status sequentially without a configuration connection', (t) => {
	const h = harness(t)
	h.instance.configNetworkTransport = {
		send() {
			assert.fail('configuration port used')
		},
	}
	initialState(h)
	assert.deepEqual(
		h.sent.slice(0, 5).map((m) => [m.messageClass, m.dataClass]),
		[
			[1, 1],
			[3, 2],
			[3, 3],
			[3, 3],
			[3, 3],
		],
	)
	assert.ok(h.sent.every((m) => m.sessionId === h.instance.tngSession))
	assert.equal(h.instance.state.currentPreset, 3)
	assert.equal(h.instance.state.currentPresetName, 'Test')
	assert.equal(h.instance.state.currentScene, 'A')
	assert.equal(h.instance.state.midiInCount, 0)
	assert.equal(h.instance.liveStateMonitoringActive, false)
	const registration = h.sent.at(-1)
	assert.equal(registration.messageClass, 0x11)
	h.reply([0x40, 0, 0x11, 0, 0], registration.transactionId + 1)
	assert.equal(h.instance.liveStateMonitoringActive, false)
	h.reply([0x40, 0, 0], registration.transactionId)
	h.reply([0x40, 0, 3, 3, 0], registration.transactionId)
	assert.equal(h.instance.liveStateMonitoringActive, false)
	h.reply([0x40, 0, 0x11, 0, 0], registration.transactionId)
	assert.equal(h.instance.liveStateMonitoringActive, true)
	assert.match(h.instance.state.stateMonitoring, /live notifications registered/)
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2], registration.transactionId)
	assert.equal(h.instance.state.currentScene, 'B')
	assert.match(h.instance.state.stateMonitoring, /live notifications registered/)
	t.mock.timers.tick(4000)
	assert.deepEqual(h.sent.at(-1).content, [])
})

test('regular RTP reports a silent device and never opens the configuration endpoint', async (t) => {
	const h = harness(t)
	await h.instance.openConfigurationTransport()
	assert.equal(h.instance.configNetworkTransport, undefined)
	h.instance.discover(true)
	t.mock.timers.tick(5000)
	assert.match(h.instance.state.stateMonitoring, /no TNG identity reply/)
	h.instance.poll()
	assert.equal(h.sent.length, 1)
	t.mock.timers.tick(1999)
	h.instance.poll()
	assert.equal(h.sent.length, 1)
	t.mock.timers.tick(1)
	h.instance.poll()
	assert.equal(h.sent.length, 2)
	assert.equal(h.sent.at(-1).messageClass, 1)
})

test('regular RTP rejects foreign sessions/devices and reports registration rejection or timeout', (t) => {
	const h = harness(t)
	initialState(h)
	const transaction = h.sent.at(-1).transactionId
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2], transaction, 0)
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2], transaction, h.instance.tngSession, { productId: 17, serial: 2 })
	assert.equal(h.instance.state.currentScene, 'A')
	h.reply([0x40, 0, 0x11, 0, 0x13], transaction)
	assert.equal(h.instance.liveStateMonitoringActive, false)
	assert.match(h.instance.state.stateMonitoring, /rejected/)
	h.instance.startLiveStateMonitoring()
	t.mock.timers.tick(3000)
	assert.match(h.instance.state.stateMonitoring, /registration timed out/)
	assert.equal(h.instance.liveStateKeepaliveTimer, undefined)
})

test('regular RTP resets cached state and notification identity on reconnect', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	const oldSession = h.instance.tngSession
	h.instance.resetRegularRtpMonitoring()
	assert.equal(h.instance.liveStateMonitoringActive, false)
	assert.equal(h.instance.state.currentPreset, 0)
	assert.equal(h.instance.state.currentScene, 'Unknown')
	assert.notEqual(h.instance.tngSession, oldSession)
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2], 1, oldSession)
	assert.equal(h.instance.state.currentScene, 'Unknown')
})

test('partial regular RTP status replies remain visibly incomplete', (t) => {
	const h = harness(t)
	identity(h)
	t.mock.timers.tick(5000)
	assert.match(h.instance.state.stateMonitoring, /status read timed out.*preset/)
	assert.equal(h.instance.liveStateMonitoringActive, false)
})

test('default mode continues sending internal messages only through configuration RTP', (t) => {
	const h = harness(t, false)
	let configurationPackets = 0
	h.instance.configNetworkTransport = {
		send() {
			configurationPackets++
		},
	}
	h.instance.sendMidi(buildTngMessage({ productId: 17, serial: 1 }, 0, 1, []), true)
	assert.equal(configurationPackets, 1)
	assert.equal(h.sent.length, 0)
})

test('an unnamed preset does not prevent the subsequent Scene read', (t) => {
	const h = harness(t)
	identity(h)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 5, 3, 1, 2, 2])
	assert.equal(h.sent.at(-1).dataClass, 3)
	assert.equal(h.sent.at(-1).content[6], 4)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 2])
	assert.equal(h.instance.state.currentScene, 'B')
	assert.equal(h.sent.at(-1).messageClass, 0x11)
})

test('live preset notifications refresh the name while preserving monitoring status', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 1, 4])
	assert.equal(h.instance.state.currentPreset, 4)
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Next')])
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 2])
	assert.equal(h.instance.state.currentPresetName, 'Next')
	h.reply([0x40, 0, 0x11, 0, 0])
	assert.match(h.instance.state.stateMonitoring, /live notifications registered/)
})

test('a configured model mismatch blocks regular RTP operational queries', (t) => {
	const h = harness(t)
	h.instance.config.expectedDevice = 'mioxm'
	h.instance.discover(true)
	h.reply([0x41, 1, 0])
	assert.equal(h.instance.deviceModelMismatch, true)
	assert.equal(h.sent.length, 1)
})

test('regular RTP refresh corrects a missed Auracle preset change from 2 to 1', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.instance.state.currentPreset = 2
	t.mock.timers.tick(3000)
	h.instance.poll()
	assert.equal(h.sent.at(-1).messageClass, 3)
	assert.equal(h.sent.at(-1).dataClass, 3)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 1])
	assert.equal(h.instance.state.currentPreset, 1)
	h.reply([0x43, 3, 1, 8, 3, 1, 5, 2, ...Buffer.from('One')])
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 2])
	assert.equal(h.instance.state.currentPresetName, 'One')
	assert.equal(h.instance.state.currentScene, 'A')
	assert.equal(h.sent.at(-1).messageClass, 0x11)
	h.reply([0x40, 0, 0x11, 0, 0])
	assert.equal(h.instance.liveStateMonitoringActive, true)
	assert.equal(h.instance.configNetworkTransport, undefined)
})

test('regular RTP refresh preserves a known name while refreshing unchanged preset metadata', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	const registrations = h.sent.filter((m) => m.messageClass === 0x11).length
	t.mock.timers.tick(3000)
	h.instance.poll()
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	assert.equal(h.instance.state.currentPresetName, 'Test')
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Edit')])
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 1])
	assert.equal(h.instance.state.currentPresetName, 'Edit')
	assert.equal(h.sent.filter((m) => m.messageClass === 0x11).length, registrations)
	assert.match(h.instance.state.stateMonitoring, /live notifications registered/)
})

test('regular RTP periodic reads never overlap and back off after a timeout', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	t.mock.timers.tick(3000)
	h.instance.poll()
	const queryCount = () => h.sent.filter((m) => m.messageClass === 3).length
	const started = queryCount()
	h.instance.poll()
	assert.equal(queryCount(), started)
	t.mock.timers.tick(5000)
	assert.match(h.instance.state.stateMonitoring, /status read timed out/)
	h.instance.poll()
	assert.equal(queryCount(), started)
	t.mock.timers.tick(29999)
	h.instance.poll()
	assert.equal(queryCount(), started)
	t.mock.timers.tick(1)
	h.instance.poll()
	assert.equal(queryCount(), started + 1)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 1])
	assert.match(h.instance.state.stateMonitoring, /live notifications registered/)
})

test('regular RTP monitoring is automatic even when the former live toggle was off', (t) => {
	const h = harness(t)
	h.instance.config.livePresetSceneMonitoring = false
	initialState(h)
	assert.equal(h.sent.at(-1).messageClass, 0x11)
	h.reply([0x40, 0, 0x11, 0, 0])
	assert.equal(h.instance.liveStateMonitoringActive, true)
	t.mock.timers.tick(3000)
	h.instance.poll()
	assert.equal(h.sent.at(-1).messageClass, 3)
	assert.equal(h.sent.at(-1).dataClass, 3)
})

test('regular RTP preset feedback waits for device confirmation after a Companion recall', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.instance.recallPreset(1)
	assert.deepEqual(h.userPackets.at(-1), [0xc0, 0])
	assert.equal(h.instance.state.currentPreset, 0)
	assert.equal(h.instance.state.currentPresetName, '')
	assert.match(h.instance.state.stateMonitoring, /confirming preset recall/)
	t.mock.timers.tick(3000)
	h.instance.poll()
	// The device reports 2: do not echo the requested preset 1.
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 2])
	assert.equal(h.instance.state.currentPreset, 2)
})

test('incoming Program Change traffic cannot confirm the active preset in regular RTP mode', (t) => {
	const h = harness(t)
	initialState(h)
	h.instance.trackPresetAndScene([0xc0, 0])
	assert.equal(h.instance.state.currentPreset, 3)
})

test('a missing preset reply invalidates stale feedback', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	t.mock.timers.tick(3000)
	h.instance.poll()
	t.mock.timers.tick(5000)
	assert.equal(h.instance.state.currentPreset, 0)
	assert.equal(h.instance.state.currentPresetName, '')
})

test('delayed pre-recall replies cannot restore the old preset or its name', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	t.mock.timers.tick(3000)
	h.instance.poll()
	const oldTransaction = h.sent.at(-1).transactionId
	h.instance.recallPreset(1)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3], oldTransaction)
	assert.equal(h.instance.state.currentPreset, 0)
	assert.equal(h.instance.state.currentPresetName, '')
})

test('a delayed name reply for another preset is ignored', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 1, 2])
	const nameForTwo = h.sent.at(-1).transactionId
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 1, 1])
	h.reply([0x43, 3, 1, 8, 3, 1, 5, 2, ...Buffer.from('Two')], nameForTwo)
	assert.equal(h.instance.state.currentPreset, 1)
	assert.equal(h.instance.state.currentPresetName, '')
	h.reply([0x43, 3, 1, 8, 3, 1, 5, 2, ...Buffer.from('One')])
	assert.equal(h.instance.state.currentPresetName, 'One')
})

test('a missing name response after a preset notification cannot block all subsequent refreshes', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 1, 2])
	t.mock.timers.tick(5000)
	assert.match(h.instance.state.stateMonitoring, /status read timed out.*presetName/)
	assert.equal(h.instance.pendingStateReads.size, 0)
	assert.equal(h.instance.state.currentPreset, 0)
	t.mock.timers.tick(30000)
	h.instance.poll()
	assert.equal(h.sent.at(-1).messageClass, 3)
	assert.equal(h.sent.at(-1).dataClass, 3)
})

test('live Scene A then B cannot be overwritten by an outstanding initial Scene read', (t) => {
	const h = harness(t)
	identity(h)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
	const sceneQuery = h.sent.at(-1)
	assert.equal(sceneQuery.dataClass, 3)
	assert.equal(sceneQuery.content[6], 4)
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 1], 100)
	assert.equal(h.instance.state.currentScene, 'A')
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2], 101)
	assert.equal(h.instance.state.currentScene, 'B')
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 1], sceneQuery.transactionId)
	assert.equal(h.instance.state.currentScene, 'B')
	assert.equal(h.instance.pendingStateReads.size, 0)
})

test('preset refreshes continue without initial Scene reads after live Scene feedback', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2])
	const sceneQueryCount = () =>
		h.sent.filter((m) => m.messageClass === 3 && m.dataClass === 3 && m.content[6] === 4).length
	const before = sceneQueryCount()
	for (let pass = 0; pass < 3; pass++) {
		t.mock.timers.tick(3000)
		h.instance.poll()
		h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
		h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
		assert.equal(h.instance.state.currentScene, 'B')
		assert.equal(h.instance.pendingStateReads.size, 0)
		assert.equal(sceneQueryCount(), before)
	}
	h.instance.resetRegularRtpMonitoring()
	assert.equal(h.instance.regularRtpSceneNotificationReceived, false)
	initialState(h)
	assert.equal(h.instance.state.currentScene, 'A')
	assert.equal(sceneQueryCount(), before + 1)
})

test('Companion Scene B is not rolled back by subsequent preset polling', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.instance.recallScene('B')
	assert.equal(h.instance.state.currentScene, 'B')
	const initialSceneQueries = h.sent.filter(
		(m) => m.messageClass === 3 && m.dataClass === 3 && m.content[6] === 4,
	).length
	t.mock.timers.tick(3000)
	h.instance.poll()
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
	assert.equal(h.instance.state.currentScene, 'B')
	assert.equal(
		h.sent.filter((m) => m.messageClass === 3 && m.dataClass === 3 && m.content[6] === 4).length,
		initialSceneQueries,
	)
	assert.equal(h.instance.pendingStateReads.size, 0)
})

test('automatic status supports PA1U and mioXM while other connection methods retain compatibility', (t) => {
	const h = harness(t)
	for (const expectedDevice of ['auto', 'playaudio1u', 'mioxm']) {
		h.instance.config.expectedDevice = expectedDevice
		assert.equal(h.instance.usesRegularRtpMonitoring(), true)
	}
	for (const expectedDevice of ['playaudio12', 'mioxl']) {
		h.instance.config.expectedDevice = expectedDevice
		assert.equal(h.instance.usesRegularRtpMonitoring(), false)
	}
	h.instance.config.expectedDevice = 'mioxm'
	h.instance.config.role = 'responder'
	assert.equal(h.instance.usesRegularRtpMonitoring(), false)
	h.instance.config.role = 'initiator'
	h.instance.config.transport = 'usb-midi'
	assert.equal(h.instance.usesRegularRtpMonitoring(), false)
	h.instance.config.transport = 'rtp-midi'
	h.instance.config.statusConnection = 'configuration'
	assert.equal(h.instance.usesRegularRtpMonitoring(), false)
	assert.equal(h.instance.shouldMonitorDeviceState(), true)
	h.instance.config.livePresetSceneMonitoring = false
	assert.equal(h.instance.shouldMonitorDeviceState(), false)
})

test('mioXM automatic monitoring reads presets and registers without a Scene query or old toggles', (t) => {
	const h = harness(t)
	h.instance.config.expectedDevice = 'mioxm'
	h.instance.config.livePresetSceneMonitoring = false
	const address = { productId: 15, serial: 1 }
	const reply = (content) => h.reply(content, undefined, undefined, address)
	h.instance.discover(true)
	reply([0x41, 1, 0])
	reply([0x43, 2, 1, 10, 3, 2, 3, 0x19, 5, 4, 0x1a, 1, 1])
	reply([0x43, 3, 1, 6, 3, 1, 3, 1, 2])
	reply([0x43, 3, 1, 8, 3, 1, 5, 2, ...Buffer.from('Two')])
	assert.equal(h.sent.at(-1).messageClass, 0x11)
	reply([0x40, 0, 0x11, 0, 0])
	assert.equal(h.instance.liveStateMonitoringActive, true)
	t.mock.timers.tick(3000)
	h.instance.poll()
	reply([0x43, 3, 1, 6, 3, 1, 3, 1, 1])
	reply([0x43, 3, 1, 8, 3, 1, 5, 2, ...Buffer.from('One')])
	assert.equal(h.instance.state.currentPreset, 1)
	assert.equal(h.instance.state.currentPresetName, 'One')
	assert.equal(
		h.sent.some((m) => m.messageClass === 3 && m.dataClass === 3 && m.content[6] === 4),
		false,
	)
	assert.equal(h.instance.configNetworkTransport, undefined)
})

test('startup waits for session settling and restarts the wait after reconnection', (t) => {
	const h = harness(t)
	h.instance.beginRegularRtpMonitoring()
	assert.match(h.instance.state.stateMonitoring, /waiting for session readiness/)
	h.instance.poll()
	assert.equal(h.sent.length, 0)
	t.mock.timers.tick(999)
	h.instance.poll()
	assert.equal(h.sent.length, 0)
	t.mock.timers.tick(1)
	h.instance.poll()
	assert.equal(h.sent.length, 1)
	assert.equal(h.sent[0].messageClass, 1)

	h.instance.networkConnected = false
	h.instance.resetRegularRtpMonitoring()
	t.mock.timers.tick(5000)
	h.instance.poll()
	assert.equal(h.sent.length, 1)
	h.instance.networkConnected = true
	h.instance.beginRegularRtpMonitoring()
	h.instance.poll()
	assert.equal(h.sent.length, 1)
	t.mock.timers.tick(1000)
	h.instance.poll()
	assert.equal(h.sent.length, 2)
	assert.equal(h.sent[1].messageClass, 1)
})

test('restart while the device remains on B reads B without needing a new Scene notification', (t) => {
	const h = harness(t)
	initialState(h)
	h.reply([0x40, 0, 0x11, 0, 0])
	h.reply([0x50, 3, 1, 6, 3, 1, 3, 4, 2])
	assert.equal(h.instance.state.currentScene, 'B')
	h.instance.resetRegularRtpMonitoring()
	assert.equal(h.instance.state.currentScene, 'Unknown')
	identity(h)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
	const sceneQuery = h.sent.at(-1)
	assert.deepEqual(sceneQuery.content, [3, 3, 1, 4, 1, 1, 4])
	// The old audio-clock parameter must not initialize Scene, even with this transaction.
	h.reply([0x43, 8, 1, 6, 3, 1, 3, 0x41, 1], sceneQuery.transactionId)
	assert.equal(h.instance.state.currentScene, 'Unknown')
	assert.equal(h.instance.pendingStateReads.has('scene'), true)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 2], sceneQuery.transactionId)
	assert.equal(h.instance.state.currentScene, 'B')
	assert.equal(h.instance.pendingStateReads.size, 0)
	h.reply([0x40, 0, 0x11, 0, 0])
	assert.equal(h.instance.liveStateMonitoringActive, true)
})

test('missing or invalid startup Scene replies keep Scene unknown', (t) => {
	const h = harness(t)
	identity(h)
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 1, 3])
	h.reply([0x43, 3, 1, 9, 3, 1, 6, 2, ...Buffer.from('Test')])
	h.reply([0x43, 3, 1, 6, 3, 1, 3, 4, 0])
	assert.equal(h.instance.state.currentScene, 'Unknown')
	t.mock.timers.tick(5000)
	assert.equal(h.instance.state.currentScene, 'Unknown')
	assert.match(h.instance.state.stateMonitoring, /status read timed out.*scene/)
	assert.equal(h.instance.state.currentPreset, 3)
})
