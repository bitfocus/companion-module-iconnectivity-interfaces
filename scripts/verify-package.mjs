import { access, readFile } from 'node:fs/promises'

const sourcePackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(await readFile(new URL('../companion/manifest.json', import.meta.url), 'utf8'))
const output = new URL(`../pkg/${manifest.id}-${sourcePackage.version}.tgz`, import.meta.url)

if (sourcePackage.version !== manifest.version)
	throw new Error(
		`package.json (${sourcePackage.version}) and companion/manifest.json (${manifest.version}) must match`,
	)

await access(new URL('../dist/main.js', import.meta.url))
await access(output)
console.log(`Release candidate verified: ${output.pathname}`)
