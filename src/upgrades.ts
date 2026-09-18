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
				config.expectedDevice === undefined ||
				config.configLocalPort === undefined ||
				!config.presetChannel ||
				config.sceneChannel === undefined ||
				config.mixerSnapshotChannel === undefined ||
				config.advanced === undefined ||
				config.receiveMidiClock === undefined ||
				config.responderPort === undefined)
		return {
			updatedConfig: needsConfigurationDefaults
				? {
						...config,
						expectedDevice: config.expectedDevice ?? 'auto',
						configRemotePort: 5002,
						configLocalPort: config.configLocalPort || 0,
						presetChannel: config.presetChannel || 1,
						sceneChannel: config.sceneChannel ?? 0,
						mixerSnapshotChannel: config.mixerSnapshotChannel ?? 0,
						advanced: config.advanced ?? false,
						receiveMidiClock: config.receiveMidiClock ?? true,
						responderPort:
							config.responderPort ?? (config.role === 'responder' && config.localPort ? config.localPort : 5004),
					}
				: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
	},
]
