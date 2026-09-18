import assert from 'node:assert/strict'
import test from 'node:test'
import { GetVariableDefinitions } from '../dist/variables.js'

test('MIDI Clock variables follow the receive-clock setting', () => {
	const enabled = GetVariableDefinitions(undefined, true)
	const disabled = GetVariableDefinitions(undefined, false)
	assert.ok(enabled.midi_clock_receiving)
	assert.ok(enabled.midi_clock_bpm)
	assert.equal(disabled.midi_clock_receiving, undefined)
	assert.equal(disabled.midi_clock_bpm, undefined)
	assert.ok(disabled.midi_in_type)
	assert.ok(disabled.rtp_peer_address)
	assert.ok(disabled.rtp_reconnect_attempts)
	assert.ok(disabled.rtp_last_disconnect_reason)
	assert.ok(disabled.supports_mixer_snapshots)
})

test('mixer snapshot variables follow the detected capability', () => {
	const profile = {
		presets: true,
		scenes: true,
		mixerSnapshots: true,
	}
	assert.ok(GetVariableDefinitions(profile).current_mixer_snapshot)
	assert.equal(GetVariableDefinitions(undefined).current_mixer_snapshot, undefined)
})
