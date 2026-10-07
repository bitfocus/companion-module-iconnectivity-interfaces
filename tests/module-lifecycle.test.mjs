import assert from 'node:assert/strict'
import test from 'node:test'
import { profileForTngProduct } from '../dist/devices.js'
import {
	allocatePort,
	createModule,
	FakeRegularRtpDevice,
	moduleConfig,
	sleep,
	waitFor,
} from './support/regular-rtp-device.mjs'

async function startMonitored(deviceOptions = {}, configOverrides = {}) {
	const device = new FakeRegularRtpDevice({ port: allocatePort(), ...deviceOptions })
	await device.start()
	const module = createModule()
	await module.instance.init(moduleConfig({ remotePort: device.port, ...configOverrides }))
	await waitFor(
		() => /live notifications registered/.test(module.record.variables.state_monitoring),
		5000,
		'registration',
	)
	return { device, ...module }
}

async function stop({ instance, device }) {
	await instance.destroy()
	device?.close()
}

test('reports Connecting at startup while the interface is offline', async () => {
	const { instance, lastStatus } = createModule()
	await instance.init(moduleConfig({ remotePort: allocatePort() }))
	try {
		assert.deepEqual(lastStatus(), { status: 'connecting', message: 'Waiting for selected RTP-MIDI port' })
	} finally {
		await instance.destroy()
	}
})

test('reports Connecting immediately after reconfiguring to an unreachable interface', async () => {
	const setup = await startMonitored()
	try {
		assert.equal(setup.lastStatus().status, 'ok')
		const checks = setup.record.feedbackChecks
		await setup.instance.configUpdated(moduleConfig({ remotePort: allocatePort() }))
		assert.equal(setup.lastStatus().status, 'connecting')
		assert.equal(setup.record.variables.online, false)
		assert.ok(setup.record.feedbackChecks > checks, 'the online feedback must be re-evaluated')
	} finally {
		await stop(setup)
	}
})

test('periodic status reads do not rebuild the Companion surface', async () => {
	const setup = await startMonitored()
	try {
		const before = setup.record.actionDefinitions
		const reads = setup.device.tngRequests().length
		await sleep(3600)
		assert.ok(setup.device.tngRequests().length > reads, 'a periodic status read must have run')
		assert.equal(setup.record.actionDefinitions, before)
	} finally {
		await stop(setup)
	}
})

test('a notification and a Program Change in one RTP packet are both delivered', async () => {
	const setup = await startMonitored({ scene: 2 })
	try {
		assert.equal(setup.record.variables.current_scene, 'B')
		const count = setup.record.variables.midi_in_count
		const notification = setup.device.notification([0x50, 3, 1, 6, 3, 1, 3, 4, 1], setup.device.hostSessionId)
		// Scene A notification, delta time 0, then Program Change on channel 5.
		setup.device.session.send([...notification, 0x00, 0xc4, 0x09])
		await waitFor(() => setup.record.variables.current_scene === 'A', 2000, 'Scene A notification')
		await waitFor(() => setup.record.variables.midi_in_count === count + 1, 2000, 'Program Change')
		assert.equal(setup.record.variables.lastMessage, 'program_5_9')
	} finally {
		await stop(setup)
	}
})

test('Refresh re-reads Scene through regular RTP and never sends legacy SysEx to TNG devices', async () => {
	const setup = await startMonitored({ scene: 1 })
	try {
		assert.equal(setup.record.variables.current_scene, 'A')
		setup.device.scene = 2
		const before = setup.device.received.length
		await waitFor(() => !setup.instance.stateReadTimeout && setup.instance.pendingStateReads.size === 0, 4000, 'idle')
		setup.instance.requestRefresh()
		await waitFor(() => setup.record.variables.current_scene === 'B', 3000, 'refreshed Scene')
		const sent = setup.device.received.slice(before)
		assert.ok(sent.length > 0)
		for (const midi of sent) assert.deepEqual(midi.slice(0, 5), [0xf0, 0x00, 0x01, 0x73, 0x7d], 'TNG prefix only')
	} finally {
		await stop(setup)
	}
})

test('Scene and mixer snapshot recalls refuse channels that would also trigger another selector', async () => {
	const { instance } = createModule()
	instance.config = moduleConfig({ presetChannel: 1, sceneChannel: 1 })
	instance.state.profile = profileForTngProduct(17)
	assert.throws(() => instance.recallScene('A'), /same as the preset recall channel/)
	instance.config = moduleConfig({ presetChannel: 1, sceneChannel: 2, mixerSnapshotChannel: 2 })
	assert.throws(() => instance.recallMixerSnapshot(1), /same as the Scene A\/B channel/)
	await instance.destroy()
})
