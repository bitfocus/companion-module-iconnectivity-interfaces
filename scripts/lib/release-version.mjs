// Pure version logic for the automatic release build. Kept free of I/O so it can be tested.

/** Parses X.Y.Z or X.Y.Z-pre, optionally prefixed by "v". Returns null for anything else. */
export function parseVersion(text) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(String(text).trim())
	if (!match) return null
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] ? match[4].split('.') : [],
	}
}

/** Finds every version mentioned in a release tag, title or file name such as iconnectivity-interfaces-0.15.3-test.6.1.tgz. */
export function versionsIn(text) {
	const found = []
	const cleaned = String(text).replace(/\.tgz\b/gi, ' ')
	for (const match of cleaned.matchAll(/\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?/g)) {
		const version = parseVersion(match[0])
		if (version) found.push(version)
	}
	return found
}

export function formatVersion(version) {
	const core = `${version.major}.${version.minor}.${version.patch}`
	return version.prerelease.length ? `${core}-${version.prerelease.join('.')}` : core
}

function compareIdentifier(a, b) {
	const aNumeric = /^\d+$/.test(a)
	const bNumeric = /^\d+$/.test(b)
	if (aNumeric && bNumeric) return Number(a) - Number(b)
	if (aNumeric) return -1
	if (bNumeric) return 1
	return a < b ? -1 : a > b ? 1 : 0
}

/** Semantic-version ordering: a pre-release such as 0.15.3-test.6.1 sorts below 0.15.3. */
export function compareVersions(a, b) {
	for (const key of ['major', 'minor', 'patch']) {
		if (a[key] !== b[key]) return a[key] - b[key]
	}
	if (!a.prerelease.length || !b.prerelease.length) return b.prerelease.length - a.prerelease.length
	const length = Math.max(a.prerelease.length, b.prerelease.length)
	for (let index = 0; index < length; index++) {
		if (a.prerelease[index] === undefined) return -1
		if (b.prerelease[index] === undefined) return 1
		const difference = compareIdentifier(a.prerelease[index], b.prerelease[index])
		if (difference !== 0) return difference
	}
	return 0
}

/** The smallest plain X.Y.Z that is higher than the given version. */
export function nextPatch(version) {
	if (version.prerelease.length) return { ...version, prerelease: [] }
	return { major: version.major, minor: version.minor, patch: version.patch + 1, prerelease: [] }
}

/**
 * Chooses the version for a new release.
 * @param {string} packageVersion version currently in package.json
 * @param {string[]} published every release tag, title and file name already on GitHub
 * @param {string} [requested] an explicit version; it must be plain X.Y.Z and higher than everything else
 * @returns {{ version: string, previous: string }}
 */
export function chooseReleaseVersion(packageVersion, published, requested = '') {
	const current = parseVersion(packageVersion)
	if (!current) throw new Error(`package.json version "${packageVersion}" is not a valid version`)

	let highest = current
	for (const text of published) {
		for (const version of versionsIn(text)) {
			if (compareVersions(version, highest) > 0) highest = version
		}
	}

	let chosen
	if (requested.trim()) {
		chosen = parseVersion(requested)
		if (!chosen || chosen.prerelease.length)
			throw new Error(`Requested version "${requested}" must be a plain number such as 1.0.0`)
	} else {
		chosen = nextPatch(highest)
	}

	if (compareVersions(chosen, highest) <= 0)
		throw new Error(
			`Version ${formatVersion(chosen)} is not higher than ${formatVersion(highest)}, which already exists. ` +
				'Companion would refuse it, so nothing was published.',
		)
	return { version: formatVersion(chosen), previous: formatVersion(highest) }
}
