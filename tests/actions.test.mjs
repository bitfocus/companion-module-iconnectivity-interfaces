import assert from 'node:assert/strict'
import test from 'node:test'
import { UpdateActions } from '../dist/actions.js'
import { profileForTngProduct } from '../dist/devices.js'

function actions() {
	const sent = []
	let definitions
	UpdateActions({
		state: { profile: profileForTngProduct(17) },
		config: { mixerSnapshotChannel: 0 },
		sendMidi: (bytes) => sent.push(bytes),
		pressMidiNote: (options) => sent.push(options),
		setActionDefinitions: (value) => (definitions = value),
	})
	return { sent, run: (id, options) => definitions[id].callback({ options }) }
}

test('MIDI actions reject channels that would change the message type', async () => {
	const { sent, run } = actions()
	for (const channel of [0, 17, Number.NaN, 'abc']) {
		await assert.rejects(run('send_note', { channel, note: 60, velocity: 127 }), /MIDI channel/)
	}
	assert.deepEqual(sent, [], 'nothing (in particular no FF System Reset) may be sent')
})

test('MIDI actions clamp data bytes below the status-byte range', async () => {
	const { sent, run } = actions()
	await run('send_cc', { channel: '16', controller: 200, value: -5 })
	await run('send_note', { channel: 1.4, note: 60.6, velocity: 127 })
	await run('send_pitch_bend', { channel: 2, value: 99999 })
	assert.deepEqual(sent, [
		[0xbf, 127, 0],
		[0x90, 61, 127],
		[0xe1, 0x7f, 0x7f],
	])
})
