const requiredMajor = 22
const requiredMinor = 20
const [major, minor] = process.versions.node.split('.').map(Number)

if (major !== requiredMajor || minor < requiredMinor) {
	throw new Error(
		`This project requires Node ${requiredMajor}.${requiredMinor}.x; found ${process.version}. Switch to the version in .node-version, then run corepack yarn install.`,
	)
}

const userAgent = process.env.npm_config_user_agent ?? ''
if (!userAgent.startsWith('yarn/4.')) {
	throw new Error(
		`This project requires Yarn 4; found ${userAgent || 'an unknown package manager'}. Run it with Corepack.`,
	)
}
