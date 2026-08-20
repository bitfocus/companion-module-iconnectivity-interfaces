export interface CapabilityProfile {
	name: string
	protocol: 'legacy' | 'tng'
	midiRouting: boolean
	rtpMidi: boolean
	audio: boolean
	metering: boolean
	failover: boolean
	scenes: boolean
	presets: boolean
	audioProtection: 'documented-tng' | false
	meterChannels: number
}

const legacy = (name: string, overrides: Partial<CapabilityProfile> = {}): CapabilityProfile => ({
	name,
	protocol: 'legacy',
	midiRouting: true,
	rtpMidi: false,
	audio: false,
	metering: false,
	failover: false,
	scenes: false,
	presets: true,
	audioProtection: false,
	meterChannels: 0,
	...overrides,
})

export const LEGACY_PRODUCTS: Record<number, CapabilityProfile> = {
	2: legacy('mio10', { rtpMidi: true }),
	3: legacy('mio'),
	4: legacy('iConnectMIDI1'),
	5: legacy('iConnectMIDI2+'),
	6: legacy('iConnectMIDI4+', { rtpMidi: true }),
	7: legacy('iConnectAUDIO4+', { audio: true, metering: true }),
	8: legacy('iConnectAUDIO2+', { audio: true, metering: true }),
	9: legacy('mio2'),
	10: legacy('mio4', { rtpMidi: true }),
	11: legacy('PlayAUDIO12', {
		rtpMidi: true,
		audio: true,
		metering: true,
		meterChannels: 12,
		failover: true,
		scenes: true,
	}),
	12: legacy('AUDIO4c', { audio: true, metering: true }),
	13: legacy('ConnectAUDIO2/4', { audio: true, metering: true }),
}

export const TNG_FAMILIES: Record<string, CapabilityProfile> = {
	PlayAUDIO1U: {
		name: 'PlayAUDIO1U',
		protocol: 'tng',
		midiRouting: true,
		rtpMidi: true,
		audio: true,
		metering: true,
		failover: true,
		scenes: true,
		presets: true,
		audioProtection: 'documented-tng',
		meterChannels: 12,
	},
	mioXM: {
		name: 'mioXM',
		protocol: 'tng',
		midiRouting: true,
		rtpMidi: true,
		audio: false,
		metering: false,
		failover: false,
		scenes: false,
		presets: true,
		audioProtection: false,
		meterChannels: 0,
	},
	mioXL: {
		name: 'mioXL',
		protocol: 'tng',
		midiRouting: true,
		rtpMidi: true,
		audio: false,
		metering: false,
		failover: false,
		scenes: false,
		presets: true,
		audioProtection: false,
		meterChannels: 0,
	},
}

export function profileForLegacyProduct(productId: number): CapabilityProfile {
	return LEGACY_PRODUCTS[productId] ?? legacy(`Unknown iConnectivity PID ${productId}`)
}

export function profileForTngProduct(productId: number): CapabilityProfile {
	const key = ({ 14: 'mioXL', 15: 'mioXM', 17: 'PlayAUDIO1U' } as Record<number, keyof typeof TNG_FAMILIES>)[productId]
	return key ? TNG_FAMILIES[key] : { ...TNG_FAMILIES.mioXM, name: `Unknown TNG PID ${productId}` }
}
