import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('network configuration preserves the v0.13.3 direct address and port path', async () => {
	const source = await readFile(new URL('../src/config.ts', import.meta.url), 'utf8')

	assert.match(source, /label: 'iConnectivity device IP address'/)
	assert.match(source, /id: 'remotePort',[\s\S]*?default: 5004/)
	assert.doesNotMatch(source, /targetMode/)
})
