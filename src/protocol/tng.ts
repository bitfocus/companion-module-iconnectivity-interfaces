import { randomBytes } from 'node:crypto'

const PREFIX = [0xf0, 0x00, 0x01, 0x73, 0x7d]

export const TngMessageClass = {
	hostSession: 0x01,
	getParameterValue: 0x03,
	deviceSession: 0x41,
	returnParameterValue: 0x43,
	notifyParameterValue: 0x50,
} as const

export const TngNotificationClass = { programSelector: 0x01, failoverStatus: 0x06 } as const

export const TngDataClass = {
	sessionInfo: 0x01,
	deviceInfo: 0x02,
	presetInfo: 0x03,
	sceneInfo: 0x08,
	audioPortInfo: 0x09,
} as const

export interface TngAddress {
	productId: number
	serial: number
}
export interface TngMessage extends TngAddress {
	sessionId: number
	transactionId: number
	messageClass: number
	dataClass: number
	content: number[]
	parameters: Map<number, number[]>
}

export function random28(): number {
	return randomBytes(4).readUInt32BE(0) & 0x0fffffff
}

export function encode7(value: number, length: number): number[] {
	return Array.from({ length }, (_, index) => (value >>> (7 * (length - index - 1))) & 0x7f)
}

export function decode7(bytes: readonly number[]): number {
	return bytes.reduce((value, byte) => value * 128 + byte, 0) >>> 0
}

function checksum(body: readonly number[]): number {
	return -body.reduce((sum, byte) => sum + byte, 0) & 0x7f
}

export function buildTngMessage(
	address: TngAddress,
	sessionId: number,
	transactionId: number,
	content: readonly number[],
): number[] {
	const body = [
		...encode7(address.productId, 2),
		...encode7(address.serial, 5),
		...encode7(sessionId, 4),
		...encode7(transactionId, 4),
		...encode7(content.length, 2),
		...content,
	]
	return [...PREFIX, ...body, checksum(body), 0xf7]
}

export function hostSessionMessage(sessionId: number, transactionId: number, inputSize = 512): number[] {
	const content = [0x01, 0x01, 0x01, 0x07, 0x03, 0x01, 0x04, 0x01, ...encode7(inputSize, 2)]
	return buildTngMessage({ productId: 0, serial: 0 }, sessionId, transactionId, content)
}

export function getDeviceInfoMessage(address: TngAddress, sessionId: number, transactionId: number): number[] {
	const parameterIds = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x19, 0x1a, 0x40]
	const content = [0x03, 0x02, 0x01, 3 + parameterIds.length, 0x01, parameterIds.length, ...parameterIds]
	return buildTngMessage(address, sessionId, transactionId, content)
}

export function notificationMessage(
	address: TngAddress,
	sessionId: number,
	transactionId: number,
	register: boolean,
	notificationClasses: readonly number[],
): number[] {
	const commandSize = 3 + notificationClasses.length
	const blockSize = 3 + commandSize
	return buildTngMessage(address, sessionId, transactionId, [
		0x11,
		0x00,
		0x01,
		blockSize,
		0x06,
		0x01,
		commandSize,
		0x05,
		register ? 0x01 : 0x02,
		...notificationClasses,
	])
}

export function pingMessage(address: TngAddress, sessionId: number, transactionId: number): number[] {
	return buildTngMessage(address, sessionId, transactionId, [])
}

export function getActivePresetMessage(address: TngAddress, transactionId: number): number[] {
	return buildTngMessage(address, 0, transactionId, [0x03, 0x03, 0x01, 0x04, 0x01, 0x01, 0x01])
}

export function getPresetNameMessage(address: TngAddress, transactionId: number, preset: number): number[] {
	return buildTngMessage(address, 0, transactionId, [
		0x03,
		0x03,
		0x02,
		0x05,
		0x04,
		0x01,
		0x09,
		preset & 0x7f,
		0x04,
		0x01,
		0x01,
		0x02,
	])
}

export function getActiveSceneMessage(address: TngAddress, transactionId: number): number[] {
	return buildTngMessage(
		address,
		0,
		transactionId,
		[0x03, 0x08, 0x02, 0x05, 0x04, 0x01, 0x13, 0x7f, 0x04, 0x01, 0x01, 0x41],
	)
}

function parseParameters(content: readonly number[]): Map<number, number[]> {
	const parameters = new Map<number, number[]>()
	if (content.length < 3) return parameters
	let offset = 3
	const blockCount = content[2]
	for (let blockIndex = 0; blockIndex < blockCount && offset < content.length; blockIndex++) {
		const size = content[offset]
		const type = content[offset + 1]
		const end = offset + size
		if (size < 3 || end > content.length) break
		if (type === 0x03) {
			let itemOffset = offset + 3
			const count = content[offset + 2]
			for (let item = 0; item < count && itemOffset < end; item++) {
				const itemSize = content[itemOffset]
				if (itemSize < 2 || itemOffset + itemSize > end) break
				parameters.set(content[itemOffset + 1], [...content.slice(itemOffset + 2, itemOffset + itemSize)])
				itemOffset += itemSize
			}
		}
		offset = end
	}
	return parameters
}

export function parseTngMessage(bytes: readonly number[]): TngMessage | undefined {
	if (bytes.length < 24 || !PREFIX.every((byte, index) => bytes[index] === byte) || bytes.at(-1) !== 0xf7) return
	const body = bytes.slice(5, -2)
	if (((body.reduce((sum, byte) => sum + byte, 0) + bytes[bytes.length - 2]) & 0x7f) !== 0) return
	const length = decode7(bytes.slice(20, 22))
	if (bytes.length !== 24 + length) return
	const content = [...bytes.slice(22, 22 + length)]
	return {
		productId: decode7(bytes.slice(5, 7)),
		serial: decode7(bytes.slice(7, 12)),
		sessionId: decode7(bytes.slice(12, 16)),
		transactionId: decode7(bytes.slice(16, 20)),
		messageClass: content[0] ?? 0,
		dataClass: content[1] ?? 0,
		content,
		parameters: parseParameters(content),
	}
}

export function ascii(value: readonly number[] | undefined): string {
	return value ? String.fromCharCode(...value).replace(/\0.*$/, '') : ''
}

export function firmwareVersion(value: readonly number[] | undefined): string {
	if (!value || value.length < 4) return ''
	return `${value[0]}.${value[1]}.${value[2]}${value[3] ? `b${value[3]}` : ''}`
}

export function hardwareVersion(value: readonly number[] | undefined): string {
	return value && value.length >= 2 ? `${value[0]}.${value[1]}` : ''
}
