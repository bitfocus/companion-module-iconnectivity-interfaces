import * as Midi from '@julusian/midi'

export function listInputs(): string[] {
	const input = new Midi.Input()
	const names = Array.from({ length: input.getPortCount() }, (_, i) => input.getPortName(i))
	input.closePort()
	return uniqueNames(names)
}

export function listOutputs(): string[] {
	const output = new Midi.Output()
	const names = Array.from({ length: output.getPortCount() }, (_, i) => output.getPortName(i))
	output.closePort()
	return uniqueNames(names)
}

function uniqueNames(names: string[]): string[] {
	return names.map((name, index) =>
		names.slice(0, index).filter((other) => other === name).length
			? `${name} ${names.slice(0, index).filter((other) => other === name).length}`
			: name,
	)
}

export class MidiTransport {
	private input?: Midi.Input
	private output?: Midi.Output

	open(inputName: string, outputName: string, onMessage: (bytes: number[]) => void): boolean {
		this.close()
		this.input = new Midi.Input()
		this.output = new Midi.Output()
		this.input.ignoreTypes(false, false, false)
		const inputIndex = listInputs().indexOf(inputName)
		const outputIndex = listOutputs().indexOf(outputName)
		if (inputIndex < 0 || outputIndex < 0) return false
		this.input.openPort(inputIndex)
		this.output.openPort(outputIndex)
		this.input.on('message', (_delta: number, bytes: number[]) => onMessage(bytes))
		return this.input.isPortOpen() && this.output.isPortOpen()
	}

	send(bytes: number[]): void {
		if (!this.output?.isPortOpen()) throw new Error('MIDI output is not open')
		this.output.sendMessage(bytes)
	}

	close(): void {
		this.input?.closePort()
		this.input?.destroy()
		this.output?.closePort()
		this.output?.destroy()
		this.input = undefined
		this.output = undefined
	}
}
