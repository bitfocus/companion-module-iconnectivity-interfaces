import type ModuleInstance from './main.js'
import type { CompanionFeedbackDefinitions } from '@companion-module/base'

export type FeedbacksSchema = {
	online: { type: 'boolean'; options: Record<string, never> }
	failover_armed: { type: 'boolean'; options: Record<string, never> }
	failover_alarm: { type: 'boolean'; options: Record<string, never> }
	current_scene: { type: 'boolean'; options: { scene: string } }
	current_mixer_snapshot: { type: 'boolean'; options: { snapshot: number } }
	host_healthy: { type: 'boolean'; options: { host: string; minimum: number } }
	signal_present: { type: 'boolean'; options: { channel: number; threshold: number } }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const definitions: Partial<CompanionFeedbackDefinitions<FeedbacksSchema>> = {
		online: {
			name: 'Device online',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
			options: [],
			callback: () => self.state.online,
		},
		...(self.state.profile?.failover
			? {
					failover_armed: {
						name: 'Failover armed',
						type: 'boolean',
						defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
						options: [],
						callback: () => self.state.failoverArmed,
					},
					failover_alarm: {
						name: 'Failover alarm active',
						type: 'boolean',
						defaultStyle: { bgcolor: 0xcc0000, color: 0xffffff },
						options: [],
						callback: () => self.state.failoverAlarm,
					},
					host_healthy: {
						name: 'Host health meets level',
						type: 'boolean',
						defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
						options: [
							{
								type: 'dropdown',
								id: 'host',
								label: 'Host',
								default: 'main_audio',
								choices: [
									{ id: 'main_audio', label: 'Main audio' },
									{ id: 'main_midi', label: 'Main MIDI' },
									{ id: 'backup_audio', label: 'Backup audio' },
									{ id: 'backup_midi', label: 'Backup MIDI' },
								],
							},
							{
								type: 'number',
								id: 'minimum',
								label: 'Minimum status (1 connected, 2 data, 3 monitored signal)',
								default: 1,
								min: 1,
								max: 3,
							},
						],
						callback: (event) =>
							(({
								main_audio: self.state.mainAudio,
								main_midi: self.state.mainMidi,
								backup_audio: self.state.backupAudio,
								backup_midi: self.state.backupMidi,
							})[event.options.host] ?? 0) >= event.options.minimum,
					},
				}
			: {}),
		...(self.state.profile?.scenes
			? {
					current_scene: {
						name: 'Current Scene A/B',
						type: 'boolean',
						defaultStyle: { bgcolor: 0x0055aa, color: 0xffffff },
						options: [
							{
								type: 'dropdown',
								id: 'scene',
								label: 'Scene',
								default: 'A',
								choices: [
									{ id: 'A', label: 'Scene A' },
									{ id: 'B', label: 'Scene B' },
								],
							},
						],
						callback: (event) => self.state.currentScene === event.options.scene,
					},
				}
			: {}),
		...(self.state.profile?.mixerSnapshots && self.config.mixerSnapshotChannel > 0
			? {
					current_mixer_snapshot: {
						name: 'Current mixer snapshot',
						type: 'boolean',
						defaultStyle: { bgcolor: 0x7a4eab, color: 0xffffff },
						options: [
							{
								type: 'number',
								id: 'snapshot',
								label: 'Mixer snapshot (1-128)',
								default: 1,
								min: 1,
								max: 128,
							},
						],
						callback: (event) => self.state.currentMixerSnapshot === event.options.snapshot,
					},
				}
			: {}),
		...(self.state.profile?.metering
			? {
					signal_present: {
						name: 'Audio signal present',
						type: 'boolean',
						defaultStyle: { bgcolor: 0x00aa00, color: 0xffffff },
						options: [
							{ type: 'number', id: 'channel', label: 'Output channel', default: 1, min: 1, max: 16 },
							{ type: 'number', id: 'threshold', label: 'Threshold (dBFS)', default: -50, min: -99, max: 0 },
						],
						callback: (event) =>
							(self.state.meterDb[event.options.channel - 1] ?? -Infinity) >= event.options.threshold,
					},
				}
			: {}),
	}
	self.setFeedbackDefinitions(definitions as never)
}
