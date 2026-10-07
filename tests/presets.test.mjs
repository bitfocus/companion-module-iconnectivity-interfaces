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

test('Preset recall buttons highlight the current preset', () => {
	let structure
	let definitions
	UpdatePresets({
		state: { profile: { presets: true, scenes: false, failover: false } },
		setPresetDefinitions(sections, presets) {
			structure = sections
			definitions = presets
		},
	})
	assert.deepEqual(definitions.preset_3.steps[0].down, [{ actionId: 'recall_preset', options: { preset: 3 } }])
	assert.deepEqual(definitions.preset_3.feedbacks, [
		{ feedbackId: 'current_preset', options: { preset: 3 }, style: { bgcolor: 0x0055aa } },
	])
	assert.deepEqual(
		structure.at(-1).definitions[0].presets,
		Array.from({ length: 8 }, (_, i) => `preset_${i + 1}`),
	)
})
