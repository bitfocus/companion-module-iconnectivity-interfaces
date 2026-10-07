import assert from 'node:assert/strict'
import test from 'node:test'
import { UpgradeScripts } from '../dist/upgrades.js'

test('upgrades responder configurations to a fixed Companion RTP-MIDI port', () => {
	const automaticPort = UpgradeScripts[0]({}, { config: { role: 'responder', localPort: 0 } })
	assert.equal(automaticPort.updatedConfig.responderPort, 5004)
	assert.equal(automaticPort.updatedConfig.mixerSnapshotChannel, 0)
	assert.equal(automaticPort.updatedConfig.expectedDevice, 'auto')

	const fixedPort = UpgradeScripts[0]({}, { config: { role: 'responder', localPort: 5010 } })
	assert.equal(fixedPort.updatedConfig.responderPort, 5010)
})

test('upgrades experimental settings to automatic monitoring without changing ports or channels', () => {
	for (const regularRtpMonitoring of [true, false, undefined]) {
		const original = {
			expectedDevice: 'mioxm',
			transport: 'rtp-midi',
			role: 'initiator',
			regularRtpMonitoring,
			livePresetSceneMonitoring: false,
			remotePort: 5010,
			configRemotePort: 5002,
			localPort: 5100,
			presetChannel: 5,
			sceneChannel: 2,
			mixerSnapshotChannel: 3,
		}
		const result = UpgradeScripts[1]({}, { config: original })
		assert.equal(result.updatedConfig.statusConnection, 'automatic')
		assert.equal('regularRtpMonitoring' in result.updatedConfig, false)
		for (const key of [
			'remotePort',
			'configRemotePort',
			'localPort',
			'presetChannel',
			'sceneChannel',
			'mixerSnapshotChannel',
		])
			assert.equal(result.updatedConfig[key], original[key])
		assert.deepEqual(result.updatedActions, [])
		assert.deepEqual(result.updatedFeedbacks, [])
	}
	assert.equal(UpgradeScripts[1]({}, { config: { statusConnection: 'configuration' } }).updatedConfig, null)
	assert.equal(UpgradeScripts[1]({}, { config: null }).updatedConfig, null)
})

test('diagnostic upgrade preserves existing references without overriding an explicit choice', () => {
	const result = UpgradeScripts[2]({}, { config: { presetChannel: 5, advanced: false } })
	assert.equal(result.updatedConfig.showDiagnostics, true)
	assert.equal(result.updatedConfig.presetChannel, 5)
	assert.deepEqual(result.updatedActions, [])
	assert.deepEqual(result.updatedFeedbacks, [])
	for (const showDiagnostics of [true, false])
		assert.equal(UpgradeScripts[2]({}, { config: { showDiagnostics } }).updatedConfig, null)
	assert.equal(UpgradeScripts[2]({}, { config: null }).updatedConfig, null)
})
