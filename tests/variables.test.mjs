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
})
