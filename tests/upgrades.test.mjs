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

test('upgrade keeps a custom configuration port while filling missing defaults', () => {
	const result = UpgradeScripts[0]({}, { config: { role: 'initiator', configRemotePort: 6002 } })
	assert.equal(result.updatedConfig.configRemotePort, 6002)
	assert.equal(result.updatedConfig.presetChannel, 1)
})
