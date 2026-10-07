import assert from 'node:assert/strict'
import test from 'node:test'
import { GetVariableDefinitions } from '../dist/variables.js'
import ModuleInstance from '../dist/main.js'
import { describeMidi } from '../dist/midi-message.js'

test('MIDI Clock variables follow the receive-clock setting', () => {
	const enabled = GetVariableDefinitions(undefined, true, true)
	const disabled = GetVariableDefinitions(undefined, false, true)
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

test('diagnostics default to hidden while operational variables and MIDI triggers remain', () => {
	const profile = { presets: true, scenes: true, mixerSnapshots: true }
	const normal = GetVariableDefinitions(profile)
	const diagnostic = GetVariableDefinitions(profile, true, true)
	for (const id of [
		'device_response_in_count',
		'device_command_out_count',
		'last_device_command_out',
		'last_device_response_in',
		'midi_in_count',
		'midi_out_count',
		'midi_in_queue_depth',
		'midi_in_dropped_count',
		'rtp_peer_address',
		'rtp_reconnect_attempts',
		'rtp_last_disconnect_reason',
		'rtp_last_connected_timestamp',
		'protocol_version',
		'detected_capabilities',
		'supports_scenes',
		'last_ack',
		'midi_clock_pulse_count',
		'midi_clock_last_timestamp',
	]) {
		assert.equal(normal[id], undefined, id)
		assert.ok(diagnostic[id], id)
	}
	for (const id of [
		'online',
		'identity_status',
		'state_monitoring',
		'firmware_version',
		'device_name',
		'current_preset',
		'current_preset_name',
		'current_scene',
		'current_mixer_snapshot',
		'midiIn',
		'lastMessage',
		'lastNote',
		'lastChannel',
		'lastMsgType',
		'lastValue',
		'midi_in_raw',
		'midi_out_raw',
		'midi_clock_receiving',
		'midi_clock_bpm',
	])
		assert.ok(normal[id], id)
	assert.equal(GetVariableDefinitions(profile, false, true).midi_clock_pulse_count, undefined)
})

test('partial MIDI and Clock publications respect diagnostics without suppressing receive pulses', () => {
	const instance = Object.create(ModuleInstance.prototype)
	const published = []
	Object.assign(instance, {
		config: { showDiagnostics: false },
		state: {
			midiIn: describeMidi([0x90, 60, 127]),
			midiOut: describeMidi([0xc0, 1]),
			midiInCount: 10,
			midiOutCount: 2,
			midiInDroppedCount: 0,
			midiClockReceiving: true,
			midiClockBpm: 120,
			midiClockPulseCount: 24,
			lastMidiClockAt: 1,
		},
		midiMessageQueue: [],
		setVariableValues(values) {
			published.push(values)
		},
	})
	instance.publishMidiClockState()
	instance.publishMidiInputState()
	instance.publishMidiInputState()
	instance.publishMidiOutputState()
	assert.equal(published[0].midi_clock_bpm, 120)
	assert.equal(published[1].midiIn, true)
	assert.deepEqual(published[2], { midiIn: true })
	assert.equal(published[3].midi_out_type, 'Program Change')
	for (const values of published) {
		assert.equal('midi_in_count' in values, false)
		assert.equal('midi_out_count' in values, false)
		assert.equal('midi_in_queue_depth' in values, false)
		assert.equal('midi_clock_pulse_count' in values, false)
	}
	instance.config.showDiagnostics = true
	instance.publishMidiClockState()
	assert.equal(published.at(-1).midi_clock_pulse_count, 24)
})
