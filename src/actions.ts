import type ModuleInstance from './main.js'
import type { CompanionActionDefinitions } from '@companion-module/base'
import { parseMidiBytes, programChangeBytes } from './midi-message.js'

export type ActionsSchema = {
	discover: { options: Record<string, never> }
	refresh: { options: Record<string, never> }
	failover_arm: { options: Record<string, never> }
	failover_disarm: { options: Record<string, never> }
	failover_clear: { options: Record<string, never> }
	apply_snapshot: { options: { type: number; id: number } }
	apply_snapshot_list: { options: { type: number; index: number } }
	save_current: { options: Record<string, never> }
	send_note: { options: { channel: number; note: number; velocity: number } }
	send_note_off: { options: { channel: number; note: number; velocity: number } }
	send_note_press: {
		options: { channel: number; note: number; velocity: number; releaseVelocity: number; duration: number }
	}
	send_cc: { options: { channel: number; controller: number; value: number } }
	send_program: { options: { channel: number; program: number } }
	send_poly_aftertouch: { options: { channel: number; note: number; pressure: number } }
	send_channel_aftertouch: { options: { channel: number; pressure: number } }
	send_pitch_bend: { options: { channel: number; value: number } }
	send_start: { options: Record<string, never> }
	send_stop: { options: Record<string, never> }
	send_continue: { options: Record<string, never> }
	send_clock: { options: Record<string, never> }
	send_raw: { options: { data: string } }
	send_sysex: { options: { data: string } }
	recall_preset: { options: { preset: number } }
	recall_scene: { options: { scene: string } }
	recall_mixer_snapshot: { options: { snapshot: number } }
}

function finiteNumber(value: unknown, label: string): number {
	const number = Number(value)
	if (!Number.isFinite(number)) throw new Error(`${label} must be a number`)
	return number
}

/** Zero-based channel nibble. Out-of-range channels are rejected rather than sent elsewhere. */
function channelNibble(value: unknown): number {
	const channel = Math.round(finiteNumber(value, 'MIDI channel'))
	if (channel < 1 || channel > 16) throw new Error(`MIDI channel must be from 1 to 16 (got ${channel})`)
	return channel - 1
}

/** 7-bit data byte, clamped so it can never be mistaken for a status byte. */
function data7(value: unknown, label: string): number {
	return Math.max(0, Math.min(127, Math.round(finiteNumber(value, label))))
}

export function UpdateActions(self: ModuleInstance): void {
	const definitions: Partial<CompanionActionDefinitions<ActionsSchema>> = {
		discover: { name: 'Discover device', options: [], callback: async () => self.discover() },
		refresh: {
			name: 'Refresh device state',
			description:
				'Re-reads identity, current preset and Scene. Over Ethernet this briefly uses the configuration session, then releases it for Auracle.',
			options: [],
			callback: async () => self.requestRefresh(),
		},
		...(self.state.profile?.failover
			? {
					failover_arm: { name: 'Failover: Arm', options: [], callback: async () => self.setFailover(true) },
					failover_disarm: { name: 'Failover: Disarm', options: [], callback: async () => self.setFailover(false) },
					failover_clear: {
						name: 'Failover: Clear alarm',
						options: [],
						callback: async () => self.setFailover(self.state.failoverArmed, true),
					},
				}
			: {}),
		...(self.state.profile?.protocol === 'legacy'
			? {
					apply_snapshot: {
						name: 'Legacy/configuration: Apply snapshot or scene',
						options: [
							{
								type: 'dropdown',
								id: 'type',
								label: 'Type',
								default: 127,
								choices: [
									{ id: 1, label: 'MIDI patchbay' },
									{ id: 2, label: 'Audio patchbay' },
									{ id: 3, label: 'Audio control' },
									{ id: 4, label: 'Mixer control' },
									{ id: 127, label: 'Scene' },
								],
							},
							{ type: 'number', id: 'id', label: 'Snapshot/scene ID', default: 1, min: 1, max: 127 },
						],
						callback: async (event) => self.applySnapshot(event.options.type, event.options.id),
					},
					apply_snapshot_list: {
						name: 'Legacy/configuration: Apply snapshot/scene list position',
						options: [
							{
								type: 'dropdown',
								id: 'type',
								label: 'Type',
								default: 127,
								choices: [
									{ id: 1, label: 'MIDI patchbay' },
									{ id: 2, label: 'Audio patchbay' },
									{ id: 3, label: 'Audio control' },
									{ id: 4, label: 'Mixer control' },
									{ id: 127, label: 'Scene' },
								],
							},
							{ type: 'number', id: 'index', label: 'List index (0 previous, 127 next)', default: 1, min: 0, max: 127 },
						],
						callback: async (event) => self.applySnapshotList(event.options.type, event.options.index),
					},
					save_current: {
						name: 'Legacy/configuration: Save current settings to device memory',
						options: [],
						callback: async () => self.saveCurrent(),
					},
				}
			: {}),
		send_note: {
			name: 'MIDI: Send note on',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'note', label: 'Note', default: 60, min: 0, max: 127 },
				{ type: 'number', id: 'velocity', label: 'Velocity (0 sends note off)', default: 127, min: 0, max: 127 },
			],
			callback: async (event) =>
				self.sendMidi([
					0x90 | channelNibble(event.options.channel),
					data7(event.options.note, 'Note'),
					data7(event.options.velocity, 'Velocity'),
				]),
		},
		send_note_off: {
			name: 'MIDI: Send note off',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'note', label: 'Note', default: 60, min: 0, max: 127 },
				{ type: 'number', id: 'velocity', label: 'Release velocity', default: 0, min: 0, max: 127 },
			],
			callback: async (event) =>
				self.sendMidi([
					0x80 | channelNibble(event.options.channel),
					data7(event.options.note, 'Note'),
					data7(event.options.velocity, 'Release velocity'),
				]),
		},
		send_note_press: {
			name: 'MIDI: Press note (automatic release)',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'note', label: 'Note', default: 60, min: 0, max: 127 },
				{ type: 'number', id: 'velocity', label: 'Velocity', default: 127, min: 1, max: 127 },
				{ type: 'number', id: 'releaseVelocity', label: 'Release velocity', default: 0, min: 0, max: 127 },
				{ type: 'number', id: 'duration', label: 'Hold time (milliseconds)', default: 100, min: 1, max: 60000 },
			],
			callback: async (event) =>
				self.pressMidiNote({
					channel: channelNibble(event.options.channel) + 1,
					note: data7(event.options.note, 'Note'),
					velocity: Math.max(1, data7(event.options.velocity, 'Velocity')),
					releaseVelocity: data7(event.options.releaseVelocity, 'Release velocity'),
					duration: finiteNumber(event.options.duration, 'Hold time'),
				}),
		},
		send_cc: {
			name: 'MIDI: Send control change',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'controller', label: 'Controller', default: 1, min: 0, max: 127 },
				{ type: 'number', id: 'value', label: 'Value', default: 127, min: 0, max: 127 },
			],
			callback: async (event) =>
				self.sendMidi([
					0xb0 | channelNibble(event.options.channel),
					data7(event.options.controller, 'Controller'),
					data7(event.options.value, 'Value'),
				]),
		},
		send_program: {
			name: 'MIDI: Send program change',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'program', label: 'Program (1-128)', default: 1, min: 1, max: 128 },
			],
			callback: async (event) =>
				self.sendMidi(
					programChangeBytes(channelNibble(event.options.channel) + 1, finiteNumber(event.options.program, 'Program')),
				),
		},
		send_poly_aftertouch: {
			name: 'MIDI: Send polyphonic aftertouch',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'note', label: 'Note', default: 60, min: 0, max: 127 },
				{ type: 'number', id: 'pressure', label: 'Pressure', default: 127, min: 0, max: 127 },
			],
			callback: async (event) =>
				self.sendMidi([
					0xa0 | channelNibble(event.options.channel),
					data7(event.options.note, 'Note'),
					data7(event.options.pressure, 'Pressure'),
				]),
		},
		send_channel_aftertouch: {
			name: 'MIDI: Send channel pressure (aftertouch)',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{ type: 'number', id: 'pressure', label: 'Pressure', default: 127, min: 0, max: 127 },
			],
			callback: async (event) =>
				self.sendMidi([0xd0 | channelNibble(event.options.channel), data7(event.options.pressure, 'Pressure')]),
		},
		send_pitch_bend: {
			name: 'MIDI: Send pitch bend',
			options: [
				{ type: 'number', id: 'channel', label: 'Channel', default: 1, min: 1, max: 16 },
				{
					type: 'number',
					id: 'value',
					label: 'Value (-8192 to +8191; 0 is center)',
					default: 0,
					min: -8192,
					max: 8191,
				},
			],
			callback: async (event) => {
				const value = Math.max(0, Math.min(16383, Math.round(finiteNumber(event.options.value, 'Pitch bend')) + 8192))
				self.sendMidi([0xe0 | channelNibble(event.options.channel), value & 0x7f, (value >> 7) & 0x7f])
			},
		},
		send_start: { name: 'MIDI: Send Start', options: [], callback: async () => self.sendMidi([0xfa]) },
		send_stop: { name: 'MIDI: Send Stop', options: [], callback: async () => self.sendMidi([0xfc]) },
		send_continue: { name: 'MIDI: Send Continue', options: [], callback: async () => self.sendMidi([0xfb]) },
		send_clock: { name: 'MIDI: Send Clock pulse', options: [], callback: async () => self.sendMidi([0xf8]) },
		send_raw: {
			name: 'MIDI: Send raw hexadecimal bytes',
			options: [{ type: 'textinput', id: 'data', label: 'Bytes', default: '90 3C 7F' }],
			callback: async (event) => self.sendMidi(parseMidiBytes(event.options.data)),
		},
		send_sysex: {
			name: 'MIDI: Send hexadecimal SysEx',
			options: [{ type: 'textinput', id: 'data', label: 'Bytes (F0 ... F7)', default: 'F0 F7' }],
			callback: async (event) => self.sendMidi(parseMidiBytes(event.options.data, true)),
		},
		...(self.state.profile?.presets
			? {
					recall_preset: {
						name: 'iConnectivity: Recall preset',
						options: [{ type: 'number', id: 'preset', label: 'Preset (1-128)', default: 1, min: 1, max: 128 }],
						callback: async (event) => self.recallPreset(finiteNumber(event.options.preset, 'Preset')),
					},
				}
			: {}),
		...(self.state.profile?.scenes
			? {
					recall_scene: {
						name: 'PlayAUDIO: Recall Scene A or B',
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
						callback: async (event) => self.recallScene(event.options.scene),
					},
				}
			: {}),
		...(self.state.profile?.mixerSnapshots && self.config.mixerSnapshotChannel > 0
			? {
					recall_mixer_snapshot: {
						name: 'PlayAUDIO: Recall mixer snapshot',
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
						callback: async (event) => self.recallMixerSnapshot(finiteNumber(event.options.snapshot, 'Mixer snapshot')),
					},
				}
			: {}),
	}
	self.setActionDefinitions(definitions as never)
}
