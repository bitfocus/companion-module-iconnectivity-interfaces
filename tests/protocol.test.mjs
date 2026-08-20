import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMessage, decode7, encode7, meterToDb, parseMessage } from '../dist/protocol/legacy.js'

test('builds official wildcard discovery example', () => {
	assert.deepEqual(
		buildMessage({ productId: 0, serial: 0, transactionId: 0, query: true, command: 1, data: [] }),
		[0xf0, 0, 1, 0x73, 0x7e, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x40, 1, 0, 0, 0x3f, 0xf7],
	)
})

test('round trips a legacy message and validates checksum', () => {
	const source = { productId: 11, serial: 0x12345678, transactionId: 42, query: true, command: 0x84, data: [3, 0] }
	assert.deepEqual(parseMessage(buildMessage(source)), source)
	const damaged = buildMessage(source)
	damaged[10] ^= 1
	assert.equal(parseMessage(damaged), undefined)
})

test('7-bit conversions and meter conversion', () => {
	assert.deepEqual(encode7(0x1234, 2), [0x24, 0x34])
	assert.equal(decode7([0x24, 0x34]), 0x1234)
	assert.equal(meterToDb(8192), 0)
})
