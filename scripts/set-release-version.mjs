// Sets the version for an automatic release build in package.json and
// companion/manifest.json (in the build checkout only; never committed).
//
// Usage: node scripts/set-release-version.mjs <published.txt> [requested version]
// published.txt lists every release tag, title and file name already on GitHub,
// one per line. The new version is package.json's own version when it is higher
// than all of those, otherwise the next patch number above the highest of them,
// or the requested version. The script stops with an error rather than produce
// a version Companion could refuse.
import { readFile, writeFile } from 'node:fs/promises'
import { chooseReleaseVersion } from './lib/release-version.mjs'

const [publishedFile, requested = ''] = process.argv.slice(2)
if (!publishedFile) throw new Error('Usage: node scripts/set-release-version.mjs <published.txt> [requested version]')

const packageUrl = new URL('../package.json', import.meta.url)
const manifestUrl = new URL('../companion/manifest.json', import.meta.url)
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'))
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
const published = (await readFile(publishedFile, 'utf8')).split('\n').filter((line) => line.trim())

const { version, previous } = chooseReleaseVersion(packageJson.version, published, requested)

packageJson.version = version
manifest.version = version
await writeFile(packageUrl, `${JSON.stringify(packageJson, null, '\t')}\n`)
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, '\t')}\n`)
console.log(`version=${version}`)
console.log(`previous=${previous}`)
