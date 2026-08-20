import assert from 'node:assert/strict'
import test from 'node:test'
import {
	describeMidi,
	genericMidiCompatibility,
	isActiveSensingOnly,
	isMidiClockOnly,
	parseMidiBytes,
	programChangeBytes,
	separateRealtimeTelemetry,
} from '../dist/midi-message.js'

test('describes note on and velocity-zero note off', () => {
	const { timestamp, ...note } = describeMidi([0x90, 60, 127])
	assert.ok(timestamp)
	assert.deepEqual(note, {
		type: 'Note On',
		channel: 1,
		number: 60,
		value: 127,
		noteName: 'C4',
		raw: '90 3C 7F',
		summary: 'Note On | Ch 1 | C4 (60) | Velocity 127',
	})
	const off = describeMidi([0x91, 60, 0])
	assert.equal(off.type, 'Note Off')
	assert.equal(off.channel, 2)
})

test('provides Generic MIDI compatible incoming variables', () => {
	assert.deepEqual(genericMidiCompatibility(describeMidi([0xb0 | 11, 102, 127])), {
		midiIn: true,
		lastMessage: 'cc_12_102_127',
		lastNote: 102,
		lastChannel: 12,
		lastMsgType: 'cc',
		lastValue: 127,
	})
	assert.equal(genericMidiCompatibility(describeMidi([0x90 | 15, 60, 100])).lastMsgType, 'noteon')
})

test('parses raw MIDI and validates SysEx framing', () => {
	assert.deepEqual(parseMidiBytes('90, 3c 0x7F'), [0x90, 0x3c, 0x7f])
	assert.deepEqual(parseMidiBytes('F0 00 01 73 F7', true), [0xf0, 0, 1, 0x73, 0xf7])
	assert.throws(() => parseMidiBytes('90 3c 7f', true), /begin with F0/)
})

test('separates high-rate realtime telemetry from trigger messages', () => {
	assert.equal(isMidiClockOnly([0xf8]), true)
	assert.equal(isMidiClockOnly([0xf8, 0xf8]), true)
	assert.equal(isMidiClockOnly([0xfa]), false)
	assert.equal(isActiveSensingOnly([0xfe]), true)
	assert.equal(isActiveSensingOnly([0x90, 60, 127]), false)
	assert.deepEqual(separateRealtimeTelemetry([0xf8, 0x90, 60, 0xfe, 127, 0xf8]), {
		clockPulses: [0xf8, 0xf8],
		midi: [0x90, 60, 127],
	})
})

test('describes control change and pitch bend', () => {
	assert.equal(describeMidi([0xb2, 7, 100]).summary, 'Control Change | Ch 3 | CC 7 | Value 100')
	assert.equal(describeMidi([0xe0, 0, 64]).value, 8192)
})

test('matches Generic MIDI one-based program change behavior', () => {
	assert.deepEqual(programChangeBytes(1, 1), [0xc0, 0])
	assert.deepEqual(programChangeBytes(2, 2), [0xc1, 1])
	assert.deepEqual(programChangeBytes(16, 128), [0xcf, 127])
})
