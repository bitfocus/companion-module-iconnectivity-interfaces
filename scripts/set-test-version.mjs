// Gives a CI test build a unique, never-reused version so Companion accepts every
// import. Writes it to package.json and companion/manifest.json in the CI
// checkout only; it is never committed.
//
// Format: <major>.<minor>.<patch + 1>-test.<run number>.<run attempt>
// e.g. 0.15.2 in package.json -> 0.15.3-test.45.1. This sorts above the last
// numbered Candidate and below the next one, and run numbers are never reused.
import { readFile, writeFile } from 'node:fs/promises'

const [runNumber, runAttempt = '1'] = process.argv.slice(2)
if (!/^\d+$/.test(runNumber ?? '') || !/^\d+$/.test(runAttempt))
	throw new Error('Usage: node scripts/set-test-version.mjs <run number> [run attempt]')

const packageUrl = new URL('../package.json', import.meta.url)
const manifestUrl = new URL('../companion/manifest.json', import.meta.url)
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'))
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(packageJson.version)
if (!match) throw new Error(`package.json version ${packageJson.version} is not a plain X.Y.Z release version`)
const version = `${match[1]}.${match[2]}.${Number(match[3]) + 1}-test.${runNumber}.${runAttempt}`

packageJson.version = version
manifest.version = version
await writeFile(packageUrl, `${JSON.stringify(packageJson, null, '\t')}\n`)
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, '\t')}\n`)
console.log(`version=${version}`)
