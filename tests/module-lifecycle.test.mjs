import assert from 'node:assert/strict'
import test from 'node:test'
import { profileForTngProduct } from '../dist/devices.js'
import { allocatePorts, createModule, FakeTngDevice, moduleConfig, sleep, waitFor } from './support/fake-device.mjs'

async function startDiscovered(configOverrides = {}, deviceOptions = {}) {
	const [userPort, configPort] = allocatePorts(2)
	const device = new FakeTngDevice({ userPort, configPort, ...deviceOptions })
	await device.start()
	const module = createModule()
	await module.instance.init(moduleConfig({ remotePort: userPort, configRemotePort: configPort, ...configOverrides }))
	return { device, ...module, ports: { userPort, configPort } }
}

/** Waits until initial TNG discovery has completed and the configuration session was released. */
async function discovered(setup) {
	await waitFor(
		() => setup.device.requestCount('scene') >= 1 && !setup.device.configConnected() && setup.instance.networkConnected,
		3000,
		'discovery and configuration release',
	)
}

async function stop({ instance, device }) {
	await instance.destroy()
	device.close()
}

test('discovers TNG state and then releases the configuration session for Auracle', async () => {
	const setup = await startDiscovered()
	try {
		await waitFor(() => setup.record.variables.current_preset_name === 'Sunday Band', 3000, 'preset name')
		assert.equal(setup.record.variables.current_preset, 3)
		assert.equal(setup.record.variables.current_scene, 'A')
		await waitFor(() => !setup.device.configConnected(), 3000, 'configuration session release')
		assert.equal(setup.lastStatus().status, 'ok')
		assert.equal(setup.device.registrations, 0)
	} finally {
		await stop(setup)
	}
})

test('reports Connecting immediately after reconfiguring to an unreachable interface', async () => {
	const setup = await startDiscovered()
	try {
		await waitFor(() => setup.lastStatus()?.status === 'ok', 3000, 'initial connection')
		const checks = setup.record.feedbackChecks
		const [unusedPort] = allocatePorts(1)
		await setup.instance.configUpdated(
			moduleConfig({ remotePort: unusedPort, configRemotePort: setup.ports.configPort }),
		)
		assert.equal(setup.lastStatus().status, 'connecting')
		assert.equal(setup.record.variables.online, false)
		assert.ok(setup.record.feedbackChecks > checks, 'the online feedback must be re-evaluated')
	} finally {
		await stop(setup)
	}
})

test('a gap in RTP traffic does not latch a false "stopped responding" failure', async () => {
	const setup = await startDiscovered()
	try {
		await discovered(setup)
		// Simulate a lost sync reply: the AppleMIDI session timeout, not polling, owns RTP liveness.
		setup.instance.state.lastSeen = Date.now() - 6000
		setup.instance.poll()
		assert.notEqual(setup.lastStatus().status, 'connection_failure')
		assert.equal(setup.record.variables.online, true)
	} finally {
		await stop(setup)
	}
})

test('live monitoring re-registers notifications after the interface reconnects', async () => {
	const setup = await startDiscovered({ livePresetSceneMonitoring: true })
	try {
		await waitFor(() => setup.device.registrations === 1, 3000, 'first notification registration')
		assert.ok(setup.device.configConnected(), 'live monitoring retains the configuration session')
		await setup.device.restartConfig()
		await waitFor(() => setup.device.registrations === 2, 8000, 'notification re-registration')
		assert.equal(setup.device.requestCount('hostSession'), 2)
	} finally {
		await stop(setup)
	}
})

test('a model mismatch releases the configuration session without model-specific reads', async () => {
	const setup = await startDiscovered({ expectedDevice: 'mioxm' })
	try {
		await waitFor(() => setup.lastStatus()?.status === 'bad_config', 3000, 'mismatch status')
		await waitFor(() => !setup.device.configConnected(), 3000, 'configuration session release')
		assert.match(setup.lastStatus().message, /Configured for mioXM, but detected PlayAUDIO1U/)
		assert.deepEqual(setup.device.requests, ['hostSession'])
		await sleep(300)
		assert.equal(setup.lastStatus().status, 'bad_config')
		assert.throws(() => setup.instance.recallPreset(2), /does not match/)
	} finally {
		await stop(setup)
	}
})

test('device replies do not rebuild the Companion surface unless the profile changes', async () => {
	const setup = await startDiscovered({ expectedDevice: 'playaudio1u' })
	try {
		await discovered(setup)
		const before = setup.record.actionDefinitions
		setup.instance.requestRefresh()
		await waitFor(() => setup.device.requestCount('deviceInfo') === 2, 3000, 'refresh')
		await waitFor(() => !setup.device.configConnected(), 3000, 'release after refresh')
		assert.equal(setup.record.actionDefinitions, before)
	} finally {
		await stop(setup)
	}
})

test('refresh re-reads TNG state through a brief configuration session', async () => {
	const setup = await startDiscovered()
	try {
		await discovered(setup)
		setup.device.preset = 5
		setup.device.presetName = 'Wedding'
		setup.device.scene = 2
		setup.instance.requestRefresh()
		await waitFor(() => setup.record.variables.current_preset_name === 'Wedding', 3000, 'refreshed preset')
		assert.equal(setup.record.variables.current_preset, 5)
		assert.equal(setup.record.variables.current_scene, 'B')
		await waitFor(() => !setup.device.configConnected(), 3000, 'release after refresh')
		assert.equal(setup.device.requestCount('notify'), 0, 'refresh must not register notifications')
	} finally {
		await stop(setup)
	}
})

test('recalling a preset clears the previous preset name', async () => {
	const setup = await startDiscovered()
	try {
		await waitFor(() => setup.record.variables.current_preset_name === 'Sunday Band', 3000, 'preset name')
		setup.instance.recallPreset(4)
		assert.equal(setup.record.variables.current_preset, 4)
		assert.equal(setup.record.variables.current_preset_name, 'Preset 4')
		await waitFor(() => setup.device.userMidi.length === 1, 2000, 'program change')
		assert.deepEqual(setup.device.userMidi[0], [0xc0, 3])
	} finally {
		await stop(setup)
	}
})

test('every MIDI command in a multi-command RTP packet is delivered in order', async () => {
	const setup = await startDiscovered()
	try {
		await discovered(setup)
		// Program Change ch1 (preset 7), delta 0, Control Change ch1 7=100, delta 0, running-status CC 8=50.
		setup.device.user.send([0xc0, 0x06, 0x00, 0xb0, 0x07, 0x64, 0x00, 0x08, 0x32])
		await waitFor(() => setup.record.variables.midi_in_count === 3, 2000, 'three messages')
		assert.equal(setup.record.variables.current_preset, 7)
		assert.equal(setup.record.variables.lastMessage, 'cc_1_8_50')
	} finally {
		await stop(setup)
	}
})

test('Scene recall refuses a channel that would also recall a preset', async () => {
	const { instance } = createModule()
	instance.config = moduleConfig({ presetChannel: 1, sceneChannel: 1 })
	instance.state.profile = profileForTngProduct(17)
	assert.throws(() => instance.recallScene('A'), /same as the preset recall channel/)
	instance.config = moduleConfig({ presetChannel: 1, sceneChannel: 2, mixerSnapshotChannel: 2 })
	assert.throws(() => instance.recallMixerSnapshot(1), /same as the Scene A\/B channel/)
	await instance.destroy()
})
