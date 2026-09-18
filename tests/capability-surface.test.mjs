import assert from 'node:assert/strict'
import test from 'node:test'
import { UpdateActions } from '../dist/actions.js'
import { profileForExpectedDevice, profileForLegacyProduct, profileForTngProduct } from '../dist/devices.js'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { UpdatePresets } from '../dist/presets.js'

function definitionsFor(profile, config = { mixerSnapshotChannel: 0 }) {
	const state = {
		profile,
		online: false,
		failoverArmed: false,
		failoverAlarm: false,
		currentScene: 'Unknown',
		currentMixerSnapshot: 0,
		meterDb: [],
	}
	let actions
	let feedbacks
	let presets
	UpdateActions({
		state,
		config,
		setActionDefinitions(definitions) {
			actions = definitions
		},
	})
	UpdateFeedbacks({
		state,
		config,
		setFeedbackDefinitions(definitions) {
			feedbacks = definitions
		},
	})
	UpdatePresets({
		state,
		config,
		setPresetDefinitions(_structure, definitions) {
			presets = definitions
		},
	})
	return { actions, feedbacks, presets }
}

test('PlayAUDIO1U exposes only its documented and validated controls', () => {
	const profile = profileForTngProduct(17)
	const { actions, feedbacks, presets } = definitionsFor(profile)

	assert.ok(actions.send_note)
	assert.ok(actions.recall_preset)
	assert.ok(actions.recall_scene)
	assert.equal(actions.failover_arm, undefined)
	assert.equal(actions.apply_snapshot, undefined)
	assert.ok(feedbacks.online)
	assert.ok(feedbacks.current_scene)
	assert.equal(feedbacks.failover_armed, undefined)
	assert.equal(feedbacks.signal_present, undefined)
	assert.ok(presets.scene_a)
	assert.equal(presets.arm, undefined)
})

test('an expected PlayAUDIO1U exposes its controls before device discovery', () => {
	const profile = profileForExpectedDevice('playaudio1u')
	const { actions, feedbacks, presets } = definitionsFor(profile, { mixerSnapshotChannel: 3 })

	assert.ok(actions.recall_preset)
	assert.ok(actions.recall_scene)
	assert.ok(actions.recall_mixer_snapshot)
	assert.ok(feedbacks.current_scene)
	assert.ok(presets.scene_a)
})

test('auto-detect has no model-specific controls before device discovery', () => {
	const { actions, feedbacks, presets } = definitionsFor(profileForExpectedDevice('auto'))

	assert.equal(actions.recall_scene, undefined)
	assert.equal(feedbacks.current_scene, undefined)
	assert.equal(presets.scene_a, undefined)
})

test('legacy capabilities add only the matching configuration controls', () => {
	const { actions, feedbacks, presets } = definitionsFor(profileForLegacyProduct(11))

	assert.ok(actions.apply_snapshot)
	assert.ok(actions.failover_arm)
	assert.ok(actions.recall_preset)
	assert.ok(actions.recall_scene)
	assert.ok(feedbacks.failover_armed)
	assert.ok(feedbacks.signal_present)
	assert.ok(presets.arm)
	assert.ok(presets.scene_a)
})

test('PlayAUDIO1U exposes mixer snapshots only when their MIDI channel is configured', () => {
	const profile = profileForTngProduct(17)
	const disabled = definitionsFor(profile)
	assert.equal(disabled.actions.recall_mixer_snapshot, undefined)
	assert.equal(disabled.feedbacks.current_mixer_snapshot, undefined)

	const enabled = definitionsFor(profile, { mixerSnapshotChannel: 3 })
	assert.ok(enabled.actions.recall_mixer_snapshot)
	assert.ok(enabled.feedbacks.current_mixer_snapshot)
})
