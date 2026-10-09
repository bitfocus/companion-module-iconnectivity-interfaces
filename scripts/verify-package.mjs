import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)
const sourcePackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(await readFile(new URL('../companion/manifest.json', import.meta.url), 'utf8'))
const output = new URL(`../pkg/${manifest.id}-${sourcePackage.version}.tgz`, import.meta.url)

if (sourcePackage.version !== manifest.version)
	throw new Error(
		`package.json (${sourcePackage.version}) and companion/manifest.json (${manifest.version}) must match`,
	)

await access(new URL('../dist/main.js', import.meta.url))
await access(output)

// The version Companion reads comes from inside the package, so check it there too.
async function packedJson(path) {
	const { stdout } = await run('tar', ['-xzOf', output.pathname, path], { maxBuffer: 16 * 1024 * 1024 })
	return JSON.parse(stdout)
}
const packedManifest = await packedJson(`${manifest.id}/companion/manifest.json`)
const packedPackage = await packedJson(`${manifest.id}/package.json`)
for (const [label, version] of [
	['packaged companion/manifest.json', packedManifest.version],
	['packaged package.json', packedPackage.version],
]) {
	if (version !== sourcePackage.version) throw new Error(`${label} says ${version}, expected ${sourcePackage.version}`)
}

console.log(`Package verified: ${output.pathname} (version ${sourcePackage.version})`)
