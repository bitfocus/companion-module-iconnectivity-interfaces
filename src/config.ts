import type { DropdownChoice, SomeCompanionConfigField } from '@companion-module/base'
import { listInputs, listOutputs } from './midi.js'

export type ModuleConfig = {
	transport: 'rtp-midi' | 'usb-midi'
	inputPort: string
	outputPort: string
	role: 'initiator' | 'responder'
	host: string
	remotePort: number
	localPort: number
	configRemotePort: number
	configLocalPort: number
	sessionName: string
	pollInterval: number
	audioPortId: number
	presetChannel: number
	sceneChannel: number
	advanced: boolean
	receiveMidiClock: boolean
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	const choices = (names: string[]): DropdownChoice[] => names.map((name) => ({ id: name, label: name }))
	const inputs = listInputs()
	const outputs = listOutputs()
	const networkVisible = "$(options:transport) == 'rtp-midi'"
	const usbVisible = "$(options:transport) == 'usb-midi'"
	const advancedNetworkVisible = "$(options:transport) == 'rtp-midi' && $(options:advanced) == true"
	const advancedVisible = '$(options:advanced) == true'
	const midiChannels: DropdownChoice[] = Array.from({ length: 16 }, (_, index) => ({
		id: index + 1,
		label: `Channel ${index + 1}`,
	}))
	return [
		{
			type: 'dropdown',
			id: 'transport',
			label: 'How is Companion connected?',
			width: 12,
			default: 'rtp-midi',
			disableAutoExpression: true,
			choices: [
				{ id: 'rtp-midi', label: 'Network — Ethernet RTP-MIDI (recommended)' },
				{ id: 'usb-midi', label: 'Local — USB MIDI connected to this Companion computer' },
			],
		},
		{
			type: 'textinput',
			id: 'sessionName',
			label: 'RTP-MIDI session name',
			description: 'The name shown to the interface and other RTP-MIDI software.',
			width: 12,
			default: 'Companion iConnectivity',
			isVisibleExpression: networkVisible,
		},
		{
			type: 'static-text',
			id: 'networkIntro',
			label: 'Network connection',
			width: 12,
			isVisibleExpression: networkVisible,
			value:
				'Enter the device IP address and the RTP port shown in Auracle. For example, RTP 10 on your mioXM uses control port 5022. Companion calculates the matching data port automatically.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'iConnectivity device IP address',
			description: 'Example: 172.16.50.22',
			width: 8,
			default: '',
			isVisibleExpression: networkVisible,
		},
		{
			type: 'number',
			id: 'remotePort',
			label: 'RTP control port',
			description: 'Use the port shown in Auracle. The data port is this number + 1.',
			width: 4,
			default: 5004,
			min: 1,
			max: 65534,
			isVisibleExpression: networkVisible,
		},
		{
			type: 'dropdown',
			id: 'role',
			label: 'Who starts the RTP connection?',
			width: 12,
			default: 'initiator',
			disableAutoExpression: true,
			isVisibleExpression: networkVisible,
			choices: [
				{ id: 'initiator', label: 'Companion starts the connection (recommended)' },
				{ id: 'responder', label: 'Device starts the connection (advanced)' },
			],
		},
		{
			type: 'dropdown',
			id: 'inputPort',
			label: 'USB MIDI input from the interface',
			width: 6,
			default: inputs[0] ?? '',
			choices: inputs.length ? choices(inputs) : [{ id: '', label: 'No local MIDI inputs detected' }],
			allowCustom: true,
			isVisibleExpression: usbVisible,
		},
		{
			type: 'dropdown',
			id: 'outputPort',
			label: 'USB MIDI output to the interface',
			width: 6,
			default: outputs[0] ?? '',
			choices: outputs.length ? choices(outputs) : [{ id: '', label: 'No local MIDI outputs detected' }],
			allowCustom: true,
			isVisibleExpression: usbVisible,
		},
		{
			type: 'static-text',
			id: 'recallIntro',
			label: 'Preset and scene recall',
			width: 12,
			value:
				'These channels must match what was saved in the interface with iConnectivity Preset Selector. Companion does not change that device setting.',
		},
		{
			type: 'dropdown',
			id: 'presetChannel',
			label: 'Preset recall channel',
			description: 'Must match the preset receive channel saved on this device with Preset Selector.',
			width: 6,
			default: 1,
			choices: midiChannels,
		},
		{
			type: 'dropdown',
			id: 'sceneChannel',
			label: 'PlayAUDIO Scene A/B channel (optional)',
			description: 'mio devices do not use this setting.',
			width: 6,
			default: 0,
			choices: [{ id: 0, label: 'Disabled / Not used' }, ...midiChannels],
		},
		{
			type: 'checkbox',
			id: 'advanced',
			label: 'Show advanced settings',
			width: 12,
			default: false,
			disableAutoExpression: true,
		},
		{
			type: 'checkbox',
			id: 'receiveMidiClock',
			label: 'Receive and analyze MIDI Clock',
			description: 'Disable to ignore incoming MIDI Clock and hide all clock variables.',
			width: 12,
			default: true,
			disableAutoExpression: true,
			isVisibleExpression: advancedVisible,
		},
		{
			type: 'number',
			id: 'localPort',
			label: 'Local RTP control port',
			description: 'Leave at 0 for an automatically assigned port. If specified, it must be even.',
			width: 4,
			default: 0,
			min: 0,
			max: 65534,
			isVisibleExpression: advancedNetworkVisible,
		},
		{
			type: 'number',
			id: 'configRemotePort',
			label: 'Device discovery/configuration port',
			description: 'Normally 5002. Companion uses this briefly during discovery, then releases it for Auracle.',
			width: 4,
			default: 5002,
			min: 1,
			max: 65534,
			isVisibleExpression: advancedNetworkVisible,
		},
		{
			type: 'number',
			id: 'configLocalPort',
			label: 'Local discovery port',
			description: 'Leave at 0 for automatic assignment. If specified, it must be even.',
			width: 4,
			default: 0,
			min: 0,
			max: 65534,
			isVisibleExpression: advancedNetworkVisible,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Status refresh interval (milliseconds)',
			width: 3,
			default: 1000,
			min: 250,
			max: 10000,
			isVisibleExpression: advancedVisible,
		},
		{
			type: 'number',
			id: 'audioPortId',
			label: 'Legacy audio meter port ID',
			width: 3,
			default: 3,
			min: 1,
			max: 16383,
			isVisibleExpression: advancedVisible,
		},
	]
}
