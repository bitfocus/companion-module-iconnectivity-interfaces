import assert from 'node:assert/strict'
import test from 'node:test'
import {
	APPLE_MIDI_RETRY_MS,
	APPLE_MIDI_SESSION_TIMEOUT_MS,
	AppleMidiSession,
	invitationPacket,
	parseInvitation,
	parseRtpMidi,
	rtpMidiPacket,
	safeAppleMidiName,
} from '../dist/network/apple-midi.js'

test('uses responsive but low-traffic reconnect timing', () => {
	assert.equal(APPLE_MIDI_RETRY_MS, 2000)
	assert.equal(APPLE_MIDI_SESSION_TIMEOUT_MS, 7000)
	assert.ok(APPLE_MIDI_SESSION_TIMEOUT_MS > APPLE_MIDI_RETRY_MS * 3)
})

test('round trips AppleMIDI invitation metadata', () => {
	const packet = invitationPacket(0x494e, 0x12345678, 0x87654321, 'Companion')
	assert.deepEqual(parseInvitation(packet), { command: 0x494e, token: 0x12345678, ssrc: 0x87654321, name: 'Companion' })
})

test('normalizes session names for 7-bit iConnectivity firmware', () => {
	assert.equal(safeAppleMidiName('iConnectivity – PA1U'), 'iConnectivity - PA1U')
	assert.equal(parseInvitation(invitationPacket(0x494e, 1, 2, 'iConnectivity – PA1U')).name, 'iConnectivity - PA1U')
})

test('round trips short and extended RTP-MIDI payloads', () => {
	assert.deepEqual(parseRtpMidi(rtpMidiPacket(1, 2, 3, [0x90, 60, 127])), [0x90, 60, 127])
	const sysex = [0xf0, ...Array.from({ length: 32 }, (_, i) => i & 0x7f), 0xf7]
	assert.deepEqual(parseRtpMidi(rtpMidiPacket(2, 3, 4, sysex)), sysex)
})

test('initiator and responder reconnect and exchange MIDI', async () => {
	const port = 32000 + (process.pid % 1000) * 2
	const responder = new AppleMidiSession({
		role: 'responder',
		remoteHost: '',
		remotePort: 0,
		localPort: port,
		sessionName: 'Device',
	})
	const initiator = new AppleMidiSession({
		role: 'initiator',
		remoteHost: '127.0.0.1',
		remotePort: port,
		localPort: 0,
		sessionName: 'Companion',
	})
	try {
		await responder.open()
		const connected = new Promise((resolve) =>
			initiator.on('status', (status) => status.connected && resolve(undefined)),
		)
		await initiator.open()
		await Promise.race([
			connected,
			new Promise((_, reject) => setTimeout(() => reject(new Error('session timeout')), 2000)),
		])
		const received = new Promise((resolve) => responder.once('midi', resolve))
		initiator.send([0x90, 60, 127])
		assert.deepEqual(await received, [0x90, 60, 127])
	} finally {
		initiator.close()
		responder.close()
	}
})
