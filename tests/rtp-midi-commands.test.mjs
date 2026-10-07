import assert from 'node:assert/strict'
import test from 'node:test'
import { RtpMidiCommandDecoder, rtpMidiPacket } from '../dist/network/apple-midi.js'
import { buildTngMessage, parseTngMessage } from '../dist/protocol/tng.js'

const decode = (section, firstHasDelta = false) => new RtpMidiCommandDecoder().decodeSection(section, firstHasDelta)

test('decodes a single command exactly as before', () => {
	assert.deepEqual(new RtpMidiCommandDecoder().decode(rtpMidiPacket(1, 2, 3, [0x90, 60, 127])), [[0x90, 60, 127]])
})

test('splits commands separated by one- and multi-byte delta times', () => {
	assert.deepEqual(decode([0xc0, 0x02, 0x00, 0xb0, 0x07, 0x64, 0x81, 0x00, 0xf8]), [
		[0xc0, 0x02],
		[0xb0, 0x07, 0x64],
		[0xf8],
	])
})

test('honours the Z flag delta time before the first command', () => {
	assert.deepEqual(decode([0x05, 0x90, 60, 100], true), [[0x90, 60, 100]])
})

test('expands running status but not across system common messages', () => {
	assert.deepEqual(decode([0x90, 60, 100, 0x00, 62, 100, 0x00, 0xf8, 0x00, 64, 100]), [
		[0x90, 60, 100],
		[0x90, 62, 100],
		[0xf8],
		[0x90, 64, 100],
	])
	assert.deepEqual(decode([0x90, 60, 100, 0x00, 0xf6, 0x00, 62, 100]), [[0x90, 60, 100], [0xf6]])
})

test('separates two TNG replies carried in one packet', () => {
	const first = buildTngMessage({ productId: 17, serial: 1 }, 0, 1, [0x43, 0x03])
	const second = buildTngMessage({ productId: 17, serial: 1 }, 0, 2, [0x43, 0x08])
	const messages = decode([...first, 0x00, ...second])
	assert.equal(messages.length, 2)
	assert.equal(parseTngMessage(messages[0]).transactionId, 1)
	assert.equal(parseTngMessage(messages[1]).transactionId, 2)
})

test('extracts realtime bytes embedded in SysEx', () => {
	assert.deepEqual(decode([0xf0, 0x01, 0xf8, 0x02, 0xf7]), [[0xf8], [0xf0, 0x01, 0x02, 0xf7]])
})

test('reassembles SysEx segmented across packets and honours cancellation', () => {
	const decoder = new RtpMidiCommandDecoder()
	assert.deepEqual(decoder.decodeSection([0xf0, 0x01, 0x02, 0xf0]), [])
	assert.deepEqual(decoder.decodeSection([0xf7, 0x03, 0xf0]), [])
	assert.deepEqual(decoder.decodeSection([0xf7, 0x04, 0xf7]), [[0xf0, 0x01, 0x02, 0x03, 0x04, 0xf7]])
	assert.deepEqual(decoder.decodeSection([0xf0, 0x01, 0xf0]), [])
	assert.deepEqual(decoder.decodeSection([0xf7, 0x02, 0xf4]), [])
	assert.deepEqual(decoder.decodeSection([0xf7, 0x03, 0xf7]), [], 'a cancelled SysEx must not be completed')
})

test('drops malformed data instead of delivering corrupted messages', () => {
	assert.deepEqual(decode([0x40, 0x40]), [], 'data without a status byte')
	assert.deepEqual(decode([0xb0, 0x07]), [], 'truncated command')
	assert.deepEqual(decode([0xc0, 0x01, 0x00, 0xf0, 0x01, 0x90]), [[0xc0, 0x01]], 'status byte inside SysEx')
})
