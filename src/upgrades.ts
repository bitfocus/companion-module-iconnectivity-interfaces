import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	(
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, undefined>,
	): CompanionStaticUpgradeResult<ModuleConfig, undefined> => {
		const config = props.config
		const needsConfigurationDefaults =
			!!config &&
			(!config.configRemotePort ||
				config.configLocalPort === undefined ||
				!config.presetChannel ||
				config.sceneChannel === undefined ||
				config.advanced === undefined ||
				config.receiveMidiClock === undefined)
		return {
			updatedConfig: needsConfigurationDefaults
				? {
						...config,
						configRemotePort: 5002,
						configLocalPort: config.configLocalPort || 0,
						presetChannel: config.presetChannel || 1,
						sceneChannel: config.sceneChannel ?? 0,
						advanced: config.advanced ?? false,
						receiveMidiClock: config.receiveMidiClock ?? true,
					}
				: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
	},
]
