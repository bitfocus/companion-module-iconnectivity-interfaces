export const HEADER = [0xf0, 0x00, 0x01, 0x73, 0x7e] as const

export interface DeviceAddress {
	productId: number
	serial: number
}

export interface LegacyMessage extends DeviceAddress {
	transactionId: number
	query: boolean
	command: number
	data: number[]
}

export const Commands = {
	getDevice: 0x01,
	retDevice: 0x02,
	getCommandList: 0x03,
	retCommandList: 0x04,
	getInfo: 0x07,
	retInfo: 0x08,
	ack: 0x0f,
	saveRestore: 0x11,
	getEthernetPortInfo: 0x0d,
	retEthernetPortInfo: 0x0e,
	getMidiInfo: 0x20,
	getMidiPortInfo: 0x22,
	getMidiPortRoute: 0x26,
	setMidiPortRoute: 0x27,
	getRtpConnectionDetail: 0x2c,
	getAudioPortMeter: 0x3e,
	retAudioPortMeter: 0x3f,
	getSnapshotGlobal: 0x66,
	retSnapshotGlobal: 0x67,
	applySnapshot: 0x6d,
	applySnapshotList: 0x6e,
	getHardwareGlobal: 0x80,
	getHardwareValue: 0x84,
	retHardwareValue: 0x85,
} as const

export function encode7(value: number, bytes: number): number[] {
	if (!Number.isInteger(value) || value < 0 || value >= 2 ** (7 * bytes)) throw new RangeError('Value does not fit')
	return Array.from({ length: bytes }, (_, i) => (value >> (7 * (bytes - i - 1))) & 0x7f)
}

export function decode7(bytes: readonly number[]): number {
	return bytes.reduce((value, byte) => value * 128 + byte, 0)
}

export function buildMessage(message: LegacyMessage): number[] {
	const body = [
		...encode7(message.productId, 2),
		...encode7(message.serial, 5),
		...encode7(message.transactionId, 2),
		...encode7(message.command | (message.query ? 0x2000 : 0), 2),
		...encode7(message.data.length, 2),
		...message.data,
	]
	if (body.some((byte) => byte < 0 || byte > 0x7f)) throw new RangeError('SysEx data bytes must be 7-bit')
	const checksum = -body.reduce((sum, byte) => sum + byte, 0) & 0x7f
	return [...HEADER, ...body, checksum, 0xf7]
}

export function parseMessage(bytes: readonly number[]): LegacyMessage | undefined {
	if (bytes.length < 20 || HEADER.some((byte, i) => bytes[i] !== byte) || bytes.at(-1) !== 0xf7) return undefined
	const body = bytes.slice(5, -2)
	const checksum = bytes.at(-2)!
	if (((body.reduce((sum, byte) => sum + byte, 0) + checksum) & 0x7f) !== 0) return undefined
	const length = decode7(body.slice(11, 13))
	if (body.length !== 13 + length) return undefined
	const commandField = decode7(body.slice(9, 11))
	return {
		productId: decode7(body.slice(0, 2)),
		serial: decode7(body.slice(2, 7)),
		transactionId: decode7(body.slice(7, 9)),
		query: (commandField & 0x2000) !== 0,
		command: commandField & 0x03ff,
		data: body.slice(13),
	}
}

export function meterToDb(value: number): number {
	return value <= 0 ? -Infinity : 20 * Math.log10(value / 8192)
}

export function formatSerial(serial: number): string {
	return serial.toString(16).toUpperCase().padStart(8, '0')
}
