// Sets the version for an automatic release build in package.json and
// companion/manifest.json (in the build checkout only; never committed).
//
// Usage: node scripts/set-release-version.mjs [--test] <published.txt> [requested version]
// published.txt lists every release tag, title and file name already on GitHub,
// one per line. With --test the version is the next test build above the store
// version in package.json (for example 1.0.2-test.3 above 1.0.1). Otherwise it
// is package.json's own version when it is higher than all of those, otherwise
// the next patch number above the highest of them, or the requested version.
// The script stops with an error rather than produce a version Companion could
// refuse.
import { readFile, writeFile } from 'node:fs/promises'
import { chooseReleaseVersion, chooseTestVersion } from './lib/release-version.mjs'

const args = process.argv.slice(2)
const testBuild = args[0] === '--test'
const [publishedFile, requested = ''] = testBuild ? args.slice(1) : args
if (!publishedFile)
	throw new Error('Usage: node scripts/set-release-version.mjs [--test] <published.txt> [requested version]')

const packageUrl = new URL('../package.json', import.meta.url)
const manifestUrl = new URL('../companion/manifest.json', import.meta.url)
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'))
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
const published = (await readFile(publishedFile, 'utf8')).split('\n').filter((line) => line.trim())

const { version, previous } = testBuild
	? chooseTestVersion(packageJson.version, published)
	: chooseReleaseVersion(packageJson.version, published, requested)

packageJson.version = version
manifest.version = version
await writeFile(packageUrl, `${JSON.stringify(packageJson, null, '\t')}\n`)
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, '\t')}\n`)
console.log(`version=${version}`)
console.log(`previous=${previous}`)
