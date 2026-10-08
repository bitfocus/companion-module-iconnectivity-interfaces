import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('configuration separates Ethernet roles and keeps MIDI options together', async () => {
	const source = await readFile(new URL('../src/config.ts', import.meta.url), 'utf8')

	assert.match(source, /label: 'Connection type',[\s\S]*?tooltip:\s*'Choose how Companion connects to the interface/)
	assert.match(source, /id: 'expectedDevice',[\s\S]*?label: 'Interface model'/)
	assert.match(source, /\{ id: 'playaudio1u', label: 'PlayAUDIO1U' \}/)
	assert.match(source, /\{ id: 'rtp-midi', label: 'RTP MIDI' \}/)
	assert.match(source, /\{ id: 'usb-midi', label: 'USB MIDI' \}/)
	assert.match(source, /label: 'RTP Role',[\s\S]*?tooltip:\s*'Choose whether Companion initiates or responds/)
	assert.match(source, /\{ id: 'initiator', label: 'Initiator' \}/)
	assert.match(source, /\{ id: 'responder', label: 'Responder \(experimental\)' \}/)
	assert.match(source, /label: 'Interface IP Address',[\s\S]*?description: 'Use a reserved or static address.'/)
	assert.match(
		source,
		/id: 'remotePort',[\s\S]*?label: 'Interface RTP Port'[\s\S]*?tooltip: 'Copy this RTP port from Auracle/,
	)
	assert.match(source, /id: 'responderPort',[\s\S]*?label: 'Companion RTP Port'[\s\S]*?default: 5060/)
	assert.match(source, /label: 'RTP Name',[\s\S]*?Name that appears in Auracle/)
	assert.match(
		source,
		/label: 'Preset recall Channel',[\s\S]*?\[Preset Selector\]\(https:\/\/iconnectivitysupport\.zendesk\.com/,
	)
	assert.match(
		source,
		/label: 'Receive\/analyze MIDI Clock',[\s\S]*?tooltip:\s*'Leave this on[\s\S]*?heavy Clock traffic/,
	)
	assert.match(source, /id: 'responderPort',[\s\S]*?isVisibleExpression: responderVisible/)
	assert.match(source, /id: 'receiveMidiClock'[\s\S]*?id: 'advanced'/)
	assert.match(source, /id: 'livePresetSceneMonitoring'[\s\S]*?isVisibleExpression: configurationStatusVisible/)
	assert.match(
		source,
		/id: 'statusConnection'[\s\S]*?default: 'automatic'[\s\S]*?isVisibleExpression: advancedInitiatorVisible/,
	)
	assert.doesNotMatch(source, /id: 'regularRtpMonitoring'|Experimental:/)
	assert.match(source, /id: 'mixerSnapshotChannel'[\s\S]*?default: 0/)
	assert.doesNotMatch(source, /targetMode/)
})
