import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
})

export default [
	...baseConfig,
	{
		files: ['tests/**/*.mjs'],
		rules: { 'n/no-unpublished-import': 'off', 'n/no-missing-import': 'off' },
	},
]
