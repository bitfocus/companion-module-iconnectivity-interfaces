import type { DropdownChoice, SomeCompanionConfigField } from '@companion-module/base'
import { listInputs, listOutputs } from './midi.js'
import type { ExpectedDevice } from './devices.js'

export type ModuleConfig = {
	expectedDevice: ExpectedDevice
	transport: 'rtp-midi' | 'usb-midi'
	inputPort: string
	outputPort: string
	role: 'initiator' | 'responder'
	host: string
	remotePort: number
	localPort: number
	responderPort: number
	configRemotePort: number
	configLocalPort: number
	sessionName: string
	pollInterval: number
	audioPortId: number
	presetChannel: number
	sceneChannel: number
	mixerSnapshotChannel: number
	advanced: boolean
	receiveMidiClock: boolean
	livePresetSceneMonitoring: boolean
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	const choices = (names: string[]): DropdownChoice[] => names.map((name) => ({ id: name, label: name }))
	const inputs = listInputs()
	const outputs = listOutputs()
	const networkVisible = "$(options:transport) == 'rtp-midi'"
	const usbVisible = "$(options:transport) == 'usb-midi'"
	const initiatorVisible = "$(options:transport) == 'rtp-midi' && $(options:role) == 'initiator'"
	const responderVisible = "$(options:transport) == 'rtp-midi' && $(options:role) == 'responder'"
	const advancedNetworkVisible = "$(options:transport) == 'rtp-midi' && $(options:advanced) == true"
	const advancedInitiatorVisible =
		"$(options:transport) == 'rtp-midi' && $(options:role) == 'initiator' && $(options:advanced) == true"
	const advancedVisible = '$(options:advanced) == true'
	const midiChannels: DropdownChoice[] = Array.from({ length: 16 }, (_, index) => ({
		id: index + 1,
		label: `Channel ${index + 1}`,
	}))
	return [
		{
			type: 'dropdown',
			id: 'expectedDevice',
			label: 'Interface model',
			tooltip:
				'Select the interface used by this Companion connection so its controls remain available while it is offline. Auto-detect waits for a device connection before showing model-specific controls.',
			width: 12,
			default: 'auto',
			disableAutoExpression: true,
			choices: [
				{ id: 'auto', label: 'Auto-detect (model controls require a connection)' },
				{ id: 'playaudio1u', label: 'PlayAUDIO1U' },
				{ id: 'playaudio12', label: 'PlayAUDIO12' },
				{ id: 'mioxm', label: 'mioXM' },
				{ id: 'mioxl', label: 'mioXL' },
			],
		},
		{
			type: 'dropdown',
			id: 'transport',
			label: 'Connection type',
			tooltip:
				'Choose how Companion connects to the interface. RTP MIDI connects over the network while USB uses local device connections.',
			width: 12,
			default: 'rtp-midi',
			disableAutoExpression: true,
			choices: [
				{ id: 'rtp-midi', label: 'RTP MIDI' },
				{ id: 'usb-midi', label: 'USB MIDI' },
			],
		},
		{
			type: 'dropdown',
			id: 'role',
			label: 'RTP Role',
			tooltip: 'Choose whether Companion initiates or responds to RTP connections.',
			width: 12,
			default: 'initiator',
			disableAutoExpression: true,
			isVisibleExpression: networkVisible,
			choices: [
				{ id: 'initiator', label: 'Initiator' },
				{ id: 'responder', label: 'Responder' },
			],
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Interface IP Address',
			description: 'Use a reserved or static address.',
			width: 8,
			default: '',
			isVisibleExpression: networkVisible,
		},
		{
			type: 'number',
			id: 'remotePort',
			label: 'Interface RTP Port',
			tooltip: 'Copy this RTP port from Auracle for the selected interface RTP-MIDI session.',
			width: 4,
			default: 5004,
			min: 1,
			max: 65534,
			isVisibleExpression: initiatorVisible,
		},
		{
			type: 'number',
			id: 'responderPort',
			label: 'Companion RTP Port',
			tooltip: 'Enter this port in the interface RTP-MIDI session as the Companion computer’s destination port.',
			width: 4,
			default: 5060,
			min: 1024,
			max: 65534,
			isVisibleExpression: responderVisible,
		},
		{
			type: 'textinput',
			id: 'sessionName',
			label: 'RTP Name',
			description: 'Name that appears in Auracle when showing this connection.',
			width: 12,
			default: 'Companion iConnectivity',
			isVisibleExpression: networkVisible,
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
			type: 'dropdown',
			id: 'presetChannel',
			label: 'Preset recall Channel',
			description:
				'Must match the preset receive channel saved with [Preset Selector](https://iconnectivitysupport.zendesk.com/hc/en-us/articles/27166593354139-Preset-Selector-App).',
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
			type: 'dropdown',
			id: 'mixerSnapshotChannel',
			label: 'PlayAUDIO mixer snapshot channel (optional)',
			description: 'Must match the Mixer Snapshot channel saved with Preset Selector. Leave disabled when unused.',
			width: 6,
			default: 0,
			choices: [{ id: 0, label: 'Disabled / Not used' }, ...midiChannels],
		},
		{
			type: 'checkbox',
			id: 'receiveMidiClock',
			label: 'Receive/analyze MIDI Clock',
			tooltip:
				'Leave this on when you need MIDI Clock BPM and receive-state variables. Turn it off if the connection carries heavy Clock traffic you do not use.',
			width: 12,
			default: true,
			disableAutoExpression: true,
		},
		{
			type: 'checkbox',
			id: 'livePresetSceneMonitoring',
			label: 'Monitor device preset/Scene/mixer changes',
			tooltip:
				'Immediately updates Companion when a preset, Scene or mixer snapshot is changed from the device or another app. This keeps the configuration RTP session connected, so Auracle may be unable to connect at the same time.',
			width: 12,
			default: false,
			disableAutoExpression: true,
			isVisibleExpression: initiatorVisible,
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
			type: 'number',
			id: 'localPort',
			label: 'Initiator local RTP-MIDI control port',
			description: 'Leave at 0 for an automatically assigned port. If specified, it must be even.',
			width: 4,
			default: 0,
			min: 0,
			max: 65534,
			isVisibleExpression: advancedInitiatorVisible,
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
			label: 'Local discovery control port',
			description: 'Leave at 0 for automatic assignment.',
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
