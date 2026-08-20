import type ModuleInstance from './main.js'
import type { CapabilityProfile } from './devices.js'

export type VariablesSchema = Record<string, string | number | boolean>

export function GetVariableDefinitions(
	profile?: CapabilityProfile,
	receiveMidiClock = true,
): Record<string, { name: string }> {
	const definitions: Record<string, { name: string }> = {
		online: { name: 'Device online' },
		device_name: { name: 'Device name/model' },
		manufacturer: { name: 'Manufacturer' },
		model_number: { name: 'Model number' },
		product_id: { name: 'Product ID' },
		serial_number: { name: 'Serial number' },
		protocol_version: { name: 'Protocol version' },
		firmware_version: { name: 'Firmware version' },
		hardware_version: { name: 'Hardware version' },
		identity_status: { name: 'Identity discovery status' },
		detected_capabilities: { name: 'Detected device capabilities' },
		supports_audio: { name: 'Supports audio controls' },
		supports_failover: { name: 'Supports failover' },
		supports_metering: { name: 'Supports audio metering' },
		supports_scenes: { name: 'Supports scenes' },
		supports_midi_routing: { name: 'Supports MIDI routing' },
		supports_rtp_midi: { name: 'Supports RTP-MIDI' },
		last_ack: { name: 'Last command acknowledgement' },
		midi_in_count: { name: 'Observed incoming MIDI message count' },
		midi_in_dropped_count: { name: 'Incoming MIDI messages dropped due to queue overload' },
		midi_in_queue_depth: { name: 'Incoming MIDI trigger queue depth' },
		midi_out_count: { name: 'Companion outgoing MIDI message count' },
		midi_in_type: { name: 'MIDI in: type' },
		midi_in_channel: { name: 'MIDI in: channel' },
		midi_in_number: { name: 'MIDI in: note/controller/program number' },
		midi_in_value: { name: 'MIDI in: value/velocity' },
		midi_in_note_name: { name: 'MIDI in: note name' },
		midi_in_raw: { name: 'MIDI in: raw bytes' },
		midi_in_summary: { name: 'MIDI in: summary' },
		midi_in_timestamp: { name: 'MIDI in: timestamp' },
		midiIn: { name: 'Generic MIDI compatibility: incoming message pulse' },
		lastMessage: { name: 'Generic MIDI compatibility: last message' },
		lastNote: { name: 'Generic MIDI compatibility: last note/controller/program' },
		lastChannel: { name: 'Generic MIDI compatibility: last channel' },
		lastMsgType: { name: 'Generic MIDI compatibility: last message type' },
		lastValue: { name: 'Generic MIDI compatibility: last value/velocity' },
		midi_out_type: { name: 'MIDI out: type' },
		midi_out_channel: { name: 'MIDI out: channel' },
		midi_out_number: { name: 'MIDI out: note/controller/program number' },
		midi_out_value: { name: 'MIDI out: value/velocity' },
		midi_out_note_name: { name: 'MIDI out: note name' },
		midi_out_raw: { name: 'MIDI out: raw bytes' },
		midi_out_summary: { name: 'MIDI out: summary' },
		midi_out_timestamp: { name: 'MIDI out: timestamp' },
		last_recall_timestamp: { name: 'Last observed scene/preset recall timestamp' },
		last_midi_in: { name: 'Last user MIDI in (legacy raw-byte alias)' },
		last_midi_out: { name: 'Last user MIDI out (legacy raw-byte alias)' },
		device_command_out_count: { name: 'Internal device commands sent' },
		device_response_in_count: { name: 'Internal device responses received' },
		last_device_command_out: { name: 'Last internal device command' },
		last_device_response_in: { name: 'Last internal device response' },
	}
	if (receiveMidiClock) {
		definitions.midi_clock_receiving = { name: 'MIDI clock receiving' }
		definitions.midi_clock_bpm = { name: 'MIDI clock tempo (BPM)' }
		definitions.midi_clock_pulse_count = { name: 'MIDI clock pulse count' }
		definitions.midi_clock_last_timestamp = { name: 'MIDI clock last received timestamp' }
	}
	if (profile?.presets) {
		definitions.current_preset = { name: 'Current preset number (observed/cached)' }
		definitions.current_preset_name = { name: 'Current preset name (observed/cached)' }
	}
	if (profile?.scenes) definitions.current_scene = { name: 'Current Scene A/B (observed/cached)' }
	if (profile?.failover) {
		definitions.failover_armed = { name: 'Failover armed' }
		definitions.failover_alarm = { name: 'Failover alarm' }
		definitions.main_audio_status = { name: 'Main host audio status (0-3)' }
		definitions.main_midi_status = { name: 'Main host MIDI status (0-3)' }
		definitions.backup_audio_status = { name: 'Backup host audio status (0-3)' }
		definitions.backup_midi_status = { name: 'Backup host MIDI status (0-3)' }
	}
	if (profile?.metering)
		for (let i = 1; i <= profile.meterChannels; i++) definitions[`meter_${i}_db`] = { name: `Output ${i} meter (dBFS)` }
	return definitions
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions(GetVariableDefinitions(self.state.profile, self.config.receiveMidiClock !== false))
}
