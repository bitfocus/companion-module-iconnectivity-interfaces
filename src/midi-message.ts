export interface MidiDetails {
	type: string
	channel: number | ''
	number: number | ''
	value: number | ''
	noteName: string
	raw: string
	summary: string
	timestamp: string
}

export function formatMidi(bytes: readonly number[]): string {
	return bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ')
}

export function isMidiClockOnly(bytes: readonly number[]): boolean {
	return bytes.length > 0 && bytes.every((byte) => byte === 0xf8)
}

export function isActiveSensingOnly(bytes: readonly number[]): boolean {
	return bytes.length > 0 && bytes.every((byte) => byte === 0xfe)
}

export function separateRealtimeTelemetry(bytes: readonly number[]): {
	clockPulses: number[]
	midi: number[]
} {
	return {
		clockPulses: bytes.filter((byte) => byte === 0xf8),
		midi: bytes.filter((byte) => byte !== 0xf8 && byte !== 0xfe),
	}
}

export function programChangeBytes(channel: number, displayedProgram: number): number[] {
	const safeChannel = Math.max(1, Math.min(16, Math.round(channel)))
	const safeProgram = Math.max(1, Math.min(128, Math.round(displayedProgram)))
	return [0xc0 | (safeChannel - 1), safeProgram - 1]
}

export function parseMidiBytes(text: string, sysexOnly = false): number[] {
	const values = text
		.trim()
		.split(/[\s,]+/)
		.filter(Boolean)
	if (!values.length) throw new Error('Enter at least one MIDI byte')
	const bytes = values.map((value) => {
		const normalized = value.replace(/^0x/i, '')
		if (!/^[0-9a-f]{1,2}$/i.test(normalized)) throw new Error(`Invalid hexadecimal MIDI byte: ${value}`)
		return Number.parseInt(normalized, 16)
	})
	if (sysexOnly && (bytes[0] !== 0xf0 || bytes.at(-1) !== 0xf7))
		throw new Error('SysEx must begin with F0 and end with F7')
	return bytes
}

export function genericMidiCompatibility(details: MidiDetails): {
	midiIn: boolean
	lastMessage: string
	lastNote: number | ''
	lastChannel: number | ''
	lastMsgType: string
	lastValue: number | ''
} {
	const type =
		(
			{
				'Note On': 'noteon',
				'Note Off': 'noteoff',
				'Control Change': 'cc',
				'Program Change': 'program',
				'Poly Aftertouch': 'aftertouch',
				'Channel Aftertouch': 'channelpressure',
				'Pitch Bend': 'pitch',
				SysEx: 'sysex',
			} as Record<string, string>
		)[details.type] ?? details.type.toLowerCase().replaceAll(' ', '')
	const parts: Array<string | number> = [type]
	if (details.channel !== '') parts.push(details.channel)
	if (details.number !== '') parts.push(details.number)
	if (details.value !== '') parts.push(details.value)
	return {
		midiIn: true,
		lastMessage: details.type === 'SysEx' ? `sysex_${details.raw.replaceAll(' ', '_')}` : parts.join('_'),
		lastNote: details.number,
		lastChannel: details.channel,
		lastMsgType: type,
		lastValue: details.value,
	}
}

function noteName(note: number): string {
	const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
	return `${names[note % 12]}${Math.floor(note / 12) - 1}`
}

export function describeMidi(bytes: readonly number[]): MidiDetails {
	const raw = formatMidi(bytes)
	const timestamp = new Date().toISOString()
	const status = bytes[0] ?? 0
	const channel = status >= 0x80 && status <= 0xef ? (status & 0x0f) + 1 : ('' as const)
	const command = status & 0xf0
	const number = bytes[1] ?? 0
	const value = bytes[2] ?? 0
	let type = 'Unknown'
	let messageNumber: number | '' = ''
	let messageValue: number | '' = ''
	let name = ''
	let summary: string

	if (command === 0x80 || (command === 0x90 && value === 0)) {
		type = 'Note Off'
		messageNumber = number
		messageValue = value
		name = noteName(number)
		summary = `${type} | Ch ${channel} | ${name} (${number}) | Velocity ${value}`
	} else if (command === 0x90) {
		type = 'Note On'
		messageNumber = number
		messageValue = value
		name = noteName(number)
		summary = `${type} | Ch ${channel} | ${name} (${number}) | Velocity ${value}`
	} else if (command === 0xa0) {
		type = 'Poly Aftertouch'
		messageNumber = number
		messageValue = value
		name = noteName(number)
		summary = `${type} | Ch ${channel} | ${name} (${number}) | Pressure ${value}`
	} else if (command === 0xb0) {
		type = 'Control Change'
		messageNumber = number
		messageValue = value
		summary = `${type} | Ch ${channel} | CC ${number} | Value ${value}`
	} else if (command === 0xc0) {
		type = 'Program Change'
		messageNumber = number
		summary = `${type} | Ch ${channel} | Program ${number}`
	} else if (command === 0xd0) {
		type = 'Channel Aftertouch'
		messageValue = number
		summary = `${type} | Ch ${channel} | Pressure ${number}`
	} else if (command === 0xe0) {
		type = 'Pitch Bend'
		messageValue = number | (value << 7)
		summary = `${type} | Ch ${channel} | Value ${messageValue}`
	} else if (status === 0xf0) {
		type = 'SysEx'
		summary = `${type} | ${bytes.length} bytes | ${raw}`
	} else {
		const system: Record<number, string> = {
			0xf1: 'MTC Quarter Frame',
			0xf2: 'Song Position',
			0xf3: 'Song Select',
			0xf6: 'Tune Request',
			0xf8: 'Clock',
			0xfa: 'Start',
			0xfb: 'Continue',
			0xfc: 'Stop',
			0xfe: 'Active Sensing',
			0xff: 'Reset',
		}
		type = system[status] ?? type
		summary = `${type} | ${raw}`
	}

	return { type, channel, number: messageNumber, value: messageValue, noteName: name, raw, summary, timestamp }
}
