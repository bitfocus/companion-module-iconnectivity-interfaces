import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseReleaseVersion, compareVersions, parseVersion, versionsIn } from '../scripts/lib/release-version.mjs'

const v = (text) => parseVersion(text)

test('orders versions the way Companion and npm do', () => {
	assert.ok(compareVersions(v('0.15.3'), v('0.15.3-test.6.1')) > 0)
	assert.ok(compareVersions(v('0.15.3-test.10.1'), v('0.15.3-test.9.2')) > 0)
	assert.ok(compareVersions(v('0.15.10'), v('0.15.9')) > 0)
	assert.ok(compareVersions(v('1.0.0'), v('0.99.99')) > 0)
	assert.equal(compareVersions(v('v1.2.3'), v('1.2.3')), 0)
})

test('finds versions in release tags, titles and file names', () => {
	assert.deepEqual(
		versionsIn('iconnectivity-interfaces-0.15.3-test.6.1.tgz').map((x) => x.prerelease),
		[['test', '6', '1']],
	)
	assert.equal(versionsIn('Latest test build 0.15.3-test.12.1').length, 1)
	assert.equal(versionsIn('v1.0.0')[0].major, 1)
	assert.deepEqual(versionsIn('test-build'), [])
})

test('first release goes above the old test builds', () => {
	const published = [
		'test-build',
		'Latest test build 0.15.3-test.12.1',
		'iconnectivity-interfaces-0.15.3-test.12.1.tgz',
	]
	assert.deepEqual(chooseReleaseVersion('0.15.2', published), { version: '0.15.3', previous: '0.15.3-test.12.1' })
})

test('each later release bumps the last number above the highest release', () => {
	assert.equal(chooseReleaseVersion('0.15.2', ['v0.15.3', 'v0.15.4']).version, '0.15.5')
	assert.equal(chooseReleaseVersion('0.15.4', ['v0.15.3', 'v0.15.4']).version, '0.15.5')
})

test('releases a deliberate package.json bump under exactly that number', () => {
	assert.deepEqual(chooseReleaseVersion('1.0.0', ['v0.15.3', 'v0.15.4']), { version: '1.0.0', previous: '0.15.4' })
	assert.equal(chooseReleaseVersion('0.16.0', ['v0.15.9']).version, '0.16.0')
	assert.equal(chooseReleaseVersion('0.15.2', []).version, '0.15.2')
	// Once published, the next run moves on.
	assert.equal(chooseReleaseVersion('1.0.0', ['v1.0.0']).version, '1.0.1')
})

test('accepts a higher requested version such as 1.0.0', () => {
	assert.equal(chooseReleaseVersion('0.15.2', ['v0.15.7'], '1.0.0').version, '1.0.0')
})

test('refuses a requested version that is not higher', () => {
	assert.throws(() => chooseReleaseVersion('0.15.2', ['v0.15.7'], '0.15.7'), /not higher than 0\.15\.7/)
	assert.throws(() => chooseReleaseVersion('0.15.2', ['v0.15.7'], '0.15.5'), /not higher/)
	assert.throws(() => chooseReleaseVersion('0.15.2', ['v0.15.2'], '0.15.2'), /not higher/)
	assert.throws(() => chooseReleaseVersion('1.0.0', ['v0.15.7'], '0.16.0'), /lower than package\.json/)
	assert.throws(() => chooseReleaseVersion('0.15.2', [], '1.0.0-beta.1'), /plain number/)
})
