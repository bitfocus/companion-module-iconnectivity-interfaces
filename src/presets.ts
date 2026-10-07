import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

const PRESET_BUTTONS = 8

export function UpdatePresets(self: ModuleInstance): void {
	const supportsFailover = !!self.state.profile?.failover
	const supportsScenes = !!self.state.profile?.scenes
	const supportsPresets = !!self.state.profile?.presets
	const presetNumbers = Array.from({ length: PRESET_BUTTONS }, (_, index) => index + 1)
	const structure: CompanionPresetSection[] = [
		{
			id: 'status',
			name: 'Status',
			definitions: [
				{
					id: 'status_controls',
					name: 'Status and failover',
					type: 'simple',
					presets: [
						'device_status',
						...(supportsFailover ? ['arm', 'disarm', 'clear_alarm'] : []),
						...(supportsScenes ? ['scene_a', 'scene_b'] : []),
					],
				},
			],
		},
		...(supportsPresets
			? [
					{
						id: 'device_presets',
						name: 'Device presets',
						definitions: [
							{
								id: 'preset_recall',
								name: 'Recall preset',
								type: 'simple' as const,
								presets: presetNumbers.map((preset) => `preset_${preset}`),
							},
						],
					},
				]
			: []),
	]
	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		...(supportsPresets
			? Object.fromEntries(
					presetNumbers.map((preset) => [
						`preset_${preset}`,
						{
							type: 'simple' as const,
							name: `Preset ${preset}`,
							style: { text: `PRESET\n${preset}`, size: 30, color: 0xffffff, bgcolor: 0x333333, show_topbar: false },
							steps: [{ down: [{ actionId: 'recall_preset' as const, options: { preset } }], up: [] }],
							feedbacks: [{ feedbackId: 'current_preset' as const, options: { preset }, style: { bgcolor: 0x0055aa } }],
						},
					]),
				)
			: {}),
		device_status: {
			type: 'simple',
			name: 'Device status',
			style: {
				text: '$(this:device_name)\n$(this:online)',
				size: 30,
				color: 0xffffff,
				bgcolor: 0x333333,
				show_topbar: false,
			},
			steps: [],
			feedbacks: [{ feedbackId: 'online', options: {}, style: { bgcolor: 0x008000 } }],
		},
		...(supportsFailover
			? {
					arm: {
						type: 'simple',
						name: 'Arm failover',
						style: { text: 'ARM\nFAILOVER', size: 30, color: 0xffffff, bgcolor: 0x333333, show_topbar: false },
						steps: [{ down: [{ actionId: 'failover_arm', options: {} }], up: [] }],
						feedbacks: [{ feedbackId: 'failover_armed', options: {}, style: { bgcolor: 0x008000 } }],
					},
					disarm: {
						type: 'simple',
						name: 'Disarm failover',
						style: { text: 'DISARM\nFAILOVER', size: 30, color: 0xffffff, bgcolor: 0x333333, show_topbar: false },
						steps: [{ down: [{ actionId: 'failover_disarm', options: {} }], up: [] }],
						feedbacks: [],
					},
					clear_alarm: {
						type: 'simple',
						name: 'Clear alarm',
						style: { text: 'CLEAR\nALARM', size: 30, color: 0xffffff, bgcolor: 0x333333, show_topbar: false },
						steps: [{ down: [{ actionId: 'failover_clear', options: {} }], up: [] }],
						feedbacks: [{ feedbackId: 'failover_alarm', options: {}, style: { bgcolor: 0xcc0000 } }],
					},
				}
			: {}),
		...(supportsScenes
			? {
					scene_a: {
						type: 'simple',
						name: 'Scene A',
						style: { text: 'SCENE A', size: 30, color: 0xffffff, bgcolor: 0x333333, show_topbar: false },
						steps: [{ down: [{ actionId: 'recall_scene', options: { scene: 'A' } }], up: [] }],
						feedbacks: [{ feedbackId: 'current_scene', options: { scene: 'A' }, style: { bgcolor: 0x0055aa } }],
					},
					scene_b: {
						type: 'simple',
						name: 'Scene B',
						style: { text: 'SCENE B', size: 30, color: 0xffffff, bgcolor: 0x333333, show_topbar: false },
						steps: [{ down: [{ actionId: 'recall_scene', options: { scene: 'B' } }], up: [] }],
						feedbacks: [{ feedbackId: 'current_scene', options: { scene: 'B' }, style: { bgcolor: 0x0055aa } }],
					},
				}
			: {}),
	}
	self.setPresetDefinitions(structure, presets)
}
