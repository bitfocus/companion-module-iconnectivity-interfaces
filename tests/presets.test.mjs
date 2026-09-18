import assert from 'node:assert/strict'
import test from 'node:test'
import { UpdatePresets } from '../dist/presets.js'

test('Scene presets use the persistent RTP-MIDI scene action', () => {
	let definitions
	UpdatePresets({
		state: { profile: { scenes: true, failover: false } },
		setPresetDefinitions(_structure, presets) {
			definitions = presets
		},
	})

	assert.deepEqual(definitions.scene_a.steps[0].down, [{ actionId: 'recall_scene', options: { scene: 'A' } }])
	assert.deepEqual(definitions.scene_b.steps[0].down, [{ actionId: 'recall_scene', options: { scene: 'B' } }])
	assert.deepEqual(definitions.scene_a.feedbacks, [
		{ feedbackId: 'current_scene', options: { scene: 'A' }, style: { bgcolor: 0x0055aa } },
	])
	assert.deepEqual(definitions.scene_b.feedbacks, [
		{ feedbackId: 'current_scene', options: { scene: 'B' }, style: { bgcolor: 0x0055aa } },
	])
})

test('Preset buttons default to 30-point shrink-to-fit text', () => {
	let definitions
	UpdatePresets({
		state: { profile: { scenes: true, failover: true } },
		setPresetDefinitions(_structure, presets) {
			definitions = presets
		},
	})

	for (const preset of Object.values(definitions)) {
		assert.equal(preset.style.size, 30)
	}
})
