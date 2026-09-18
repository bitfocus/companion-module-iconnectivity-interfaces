import assert from 'node:assert/strict'
import test from 'node:test'
import {
	ascii,
	buildTngMessage,
	firmwareVersion,
	getActivePresetMessage,
	getActiveSceneMessage,
	getDeviceInfoMessage,
	getPresetNameMessage,
	hardwareVersion,
	hostSessionMessage,
	notificationMessage,
	parseTngMessage,
	pingMessage,
} from '../dist/protocol/tng.js'

test('builds the documented wildcard TNG host-session request', () => {
	const packet = hostSessionMessage(0, 0)
	assert.deepEqual(packet.slice(0, 22), [0xf0, 0, 1, 0x73, 0x7d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10])
	assert.deepEqual(packet.slice(22, -2), [1, 1, 1, 7, 3, 1, 4, 1, 4, 0])
	assert.equal(parseTngMessage(packet).messageClass, 1)
})

test('builds the captured one-time preset and scene queries', () => {
	const address = { productId: 15, serial: 0x4078 }
	assert.deepEqual(
		parseTngMessage(getActivePresetMessage(address, 1)).content,
		[0x03, 0x03, 0x01, 0x04, 0x01, 0x01, 0x01],
	)
	assert.deepEqual(
		parseTngMessage(getPresetNameMessage(address, 2, 3)).content,
		[0x03, 0x03, 0x02, 0x05, 0x04, 0x01, 0x09, 0x03, 0x04, 0x01, 0x01, 0x02],
	)
	assert.deepEqual(
		parseTngMessage(getActiveSceneMessage({ productId: 17, serial: 0x3318 }, 3)).content,
		[0x03, 0x08, 0x02, 0x05, 0x04, 0x01, 0x13, 0x7f, 0x04, 0x01, 0x01, 0x41],
	)
})

test('parses captured active preset, preset name, and scene replies', () => {
	const address = { productId: 15, serial: 0x4078 }
	const preset = parseTngMessage(buildTngMessage(address, 0, 1, [0x43, 0x03, 0x01, 0x06, 0x03, 0x01, 0x03, 0x01, 0x03]))
	assert.deepEqual(preset.parameters.get(1), [3])
	const nameBytes = [...Buffer.from('Tune>Companion')]
	const name = parseTngMessage(
		buildTngMessage(address, 0, 2, [
			0x43,
			0x03,
			0x02,
			0x05,
			0x04,
			0x01,
			0x09,
			0x03,
			nameBytes.length + 5,
			0x03,
			0x01,
			nameBytes.length + 2,
			0x02,
			...nameBytes,
		]),
	)
	assert.equal(ascii(name.parameters.get(2)), 'Tune>Companion')
	const scene = parseTngMessage(
		buildTngMessage(
			{ productId: 17, serial: 0x3318 },
			0,
			3,
			[0x43, 0x08, 0x02, 0x05, 0x04, 0x01, 0x13, 0x7f, 0x06, 0x03, 0x01, 0x03, 0x41, 0x01],
		),
	)
	assert.deepEqual(scene.parameters.get(0x41), [1])
})

test('parses documented SceneNumber notifications from DeviceFeature', () => {
	const notification = parseTngMessage(
		buildTngMessage({ productId: 17, serial: 0x3318 }, 4, 5, [0x50, 0x03, 0x01, 0x06, 0x03, 0x01, 0x03, 0x04, 0x02]),
	)
	assert.equal(notification.messageClass, 0x50)
	assert.equal(notification.dataClass, 0x03)
	assert.deepEqual(notification.parameters.get(0x04), [2])
})

test('parses documented mixer snapshot notifications from AudioPortInfo', () => {
	const notification = parseTngMessage(
		buildTngMessage({ productId: 17, serial: 0x3318 }, 4, 6, [0x50, 0x09, 0x01, 0x06, 0x03, 0x01, 0x03, 0x50, 0x05]),
	)
	assert.equal(notification.messageClass, 0x50)
	assert.equal(notification.dataClass, 0x09)
	assert.deepEqual(notification.parameters.get(0x50), [5])
})

test('parses TNG DeviceInfo parameter values', () => {
	const values = [
		[1, [...Buffer.from('mioXM')]],
		[4, [...Buffer.from('SN123')]],
		[5, [2, 4, 0, 0]],
		[6, [1, 2]],
	]
	const items = values.flatMap(([id, value]) => [value.length + 2, id, ...value])
	const block = [3 + items.length, 3, values.length, ...items]
	const packet = buildTngMessage({ productId: 15, serial: 0x12345678 }, 123, 4, [0x43, 0x02, 1, ...block])
	const parsed = parseTngMessage(packet)
	assert.equal(parsed.productId, 15)
	assert.deepEqual(parsed.parameters.get(1), [...Buffer.from('mioXM')])
	assert.equal(firmwareVersion(parsed.parameters.get(5)), '2.4.0')
	assert.equal(hardwareVersion(parsed.parameters.get(6)), '1.2')
})

test('requests the documented identity parameter set', () => {
	const parsed = parseTngMessage(getDeviceInfoMessage({ productId: 17, serial: 1 }, 2, 3))
	assert.equal(parsed.messageClass, 3)
	assert.equal(parsed.dataClass, 2)
	assert.deepEqual(parsed.content.slice(-9), [1, 2, 3, 4, 5, 6, 0x19, 0x1a, 0x40])
})

test('builds notification registration and keepalive messages', () => {
	const address = { productId: 17, serial: 0x3318 }
	assert.deepEqual(
		parseTngMessage(notificationMessage(address, 4, 5, true, [1, 6])).content,
		[0x11, 0, 1, 8, 6, 1, 5, 5, 1, 1, 6],
	)
	assert.deepEqual(
		parseTngMessage(notificationMessage(address, 4, 6, false, [0])).content,
		[0x11, 0, 1, 7, 6, 1, 4, 5, 2, 0],
	)
	assert.deepEqual(parseTngMessage(pingMessage(address, 4, 7)).content, [])
})

test('ignores malformed TNG packets without throwing', () => {
	assert.equal(parseTngMessage([0xf0, 0, 1, 0x73, 0x7d, 0xf7]), undefined)
	const message = buildTngMessage({ productId: 15, serial: 1 }, 1, 1, [0x43, 0x02, 0])
	message.splice(-2, 0, 0)
	assert.equal(parseTngMessage(message), undefined)
})
