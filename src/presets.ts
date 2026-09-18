import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

export function UpdatePresets(self: ModuleInstance): void {
	const supportsFailover = !!self.state.profile?.failover
	const supportsScenes = !!self.state.profile?.scenes
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
	]
	const presets: CompanionPresetDefinitions<ModuleSchema> = {
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
