# Project context

Last reviewed: 2026-10-05

This is the primary cold-handoff document. Read `AGENTS.md` first for permanent working rules, then this file and `STATUS.md`. The private GitHub repository and its `main` branch are the authoritative known-good source baseline.

## 1. Project overview

This project is a Bitfocus Companion module for monitoring and controlling iConnectivity PlayAUDIO and mio-family audio/MIDI interfaces. It exists to give production users, especially live church environments, a reliable Companion control surface without requiring an operating-system RTP-MIDI daemon.

The current release focus is Companion running on Raspberry Pi ARM64 and connecting over Ethernet as an AppleMIDI/RTP-MIDI initiator to PlayAUDIO1U and mioXM interfaces. Local USB MIDI, responder mode, legacy devices, other TNG models, macOS and Windows are secondary or experimental until explicitly hardware-validated.

The desired result is a public Bitfocus module that:

- connects and reconnects reliably without `rtpmidid`, ALSA network MIDI or Apple Network MIDI;
- sends and receives normal MIDI, including Generic MIDI-compatible trigger state and rate-limited MIDI Clock monitoring;
- discovers the attached interface and exposes only controls supported by authoritative protocol capabilities;
- recalls and tracks presets, PlayAUDIO Scene A/B and, when configured and validated, PlayAUDIO1U mixer snapshots;
- coexists predictably with Auracle X and remains safe for live production use.

Success means the Candidate passes automated checks, the documented hardware test scope, multi-day production/endurance testing and supported-platform package tests, then is promoted to Production only with the user's explicit approval. A higher version number alone never makes a build Production.

## 2. Current status

### Release state

- **Production: 0.14.22.** promoted to Production on 2026-10-07 with the user's explicit approval after PA1U/mioXM hardware use (concurrent Ethernet Auracle access, preset/Scene feedback, module restart, Scene B at restart). Production archive: `releases/iconnectivity-interfaces-v0.14.22-PRODUCTION.tgz`, a byte-identical copy of the retained Candidate archive `iconnectivity-interfaces-v0.14.22-CANDIDATE.tgz` (original build SHA-256 `6edee0780fd7104d58e20e2323bd697b66813ab8f3f7d70f232d08caff5705b6`); it must not be rebuilt. The `docs/STABILITY_CHECKLIST.md` endurance and power-cycle scope was not completed before promotion. Previous Production: 0.13.3 (2026-08-23), retained.
- **Candidate: 0.15.1.** Built 2026-10-07 on the restored 0.14.22 source from a fresh audit; not hardware-tested. Archive `releases/iconnectivity-interfaces-v0.15.1-CANDIDATE.tgz`, SHA-256 `d7e1c030ebfbb1bc8fb6107fd52243b59a15569e14af4107ea1d74183604e555`. See `STATUS.md` for its testing scope.
- **Failed: 0.15.0.** Built from the stale 0.14.13 baseline; blocked Auracle. Never reuse.
- **Prior Candidate: 0.14.22**, promoted to Production on 2026-10-07 (rollback target). Built 2026-10-05 for correct active Scene initialization after restart. All 70 tests, lint, package build and package verification passed under Node 22.20.0/Yarn 4.17.0. Archive: `releases/iconnectivity-interfaces-v0.14.22-CANDIDATE.tgz`. The user confirmed the supplied PA1U Scene startup regression test; broader recovery/endurance qualification remains. Now Production.
- `package.json` and `companion/manifest.json` both identify the working version as 0.15.1.
- `releases/README.md` is authoritative for archive history, failed versions and promotion procedure.

### Working now

- Self-contained AppleMIDI/RTP-MIDI initiator transport, paired control/data UDP sockets, synchronization/liveness, graceful end-session signaling, bounded reconnect behavior and multiple-instance local-port isolation.
- PlayAUDIO1U and mioXM TNG identity, device-confirmed preset/name refresh and notification monitoring over regular RTP, leaving Auracle’s configuration endpoint free.
- PlayAUDIO1U initial Scene state, preset recall/tracking, Scene A/B recall/tracking and hardware-confirmed device-originated preset/Scene updates.
- Ordinary MIDI send/receive, complete basic MIDI send actions, Generic MIDI-compatible receive variables and ordered trigger pulses.
- MIDI Clock counting/BPM with variable-publication throttling, Active Sensing separation and a bounded 2048-message incoming queue.
- Capability-aware actions, feedbacks, variables and presets.
- Candidate 0.14.13's explicit interface-model setting keeps model-specific controls available while the interface is offline; auto-detect remains the migration/default behavior. A detected mismatch produces a configuration error and blocks model-specific commands and polling.
- Optional PlayAUDIO1U mixer snapshot Program Change recall, tracking, variable, feedback and notification parsing are implemented but not hardware-validated.

### Exactly where work stopped

Candidate 0.14.21 restart bug reported 2026-10-05: the user set PA1U Scene B in Auracle, toggled the module off/on, and Companion initialized to A while the unit stayed on B. Rechecking the official TNG Rev. 1 specification established that the old query (data class 0x08, parameter 0x41) reads AudioInfo:AudioClockRestartValue, not active Scene. Earlier capture interpretation and initial-Scene hardware-validation claims were incorrect. The 0.14.18 suppression fixed live overwrites but left this incorrect startup read.

Candidate 0.14.22 replaces the old query with GetParmVal for DeviceFeature (data class 0x03), SceneNumber (parameter 0x04), without arguments (the current work area). The documented response and live notifications share this same active-Scene field. Initial reads are transaction-matched, ignore the old audio-clock value, and retain newer live notifications when a startup reply is delayed. Missing/invalid Scene replies leave Unknown. The new query also applies to the configuration-port compatibility path. Preset refresh, startup synchronization and diagnostics behavior remain as in 0.14.21. The user confirmed the PA1U B-at-module-restart fix on 2026-10-05; wider qualification remains pending.

Next: keep the user-tested 0.14.22 package unchanged for the planned week of testing. Record separately itemized A/B repetitions and a full Companion restart, then recovery/endurance outcomes in `docs/STABILITY_CHECKLIST.md`. Optional diagnostic variables remain off for new connections and on for upgrades unless changed.

Candidate 0.14.22 PA1U Scene startup verification (2026-10-05): following the supplied B-in-Auracle/module off-on regression test, the user reported testing and confirmed it works. This confirms the corrected active-Scene startup path for the reported setup. Individual A/B repetitions, full Companion restart and other live-change checks were not itemized separately. Wider recovery/endurance qualification and explicit Production promotion remain outstanding.

### Repository state at handoff

- Private source-of-truth repository: `https://github.com/mikecreates86/companion-module-iconnectivity`.
- Resume source development from GitHub `main`: full source and documentation through 0.14.22 were recovered and merged on 2026-10-07 through [PR #2](https://github.com/mikecreates86/companion-module-iconnectivity/pull/2), merge commit `06cccb3c779e84c6d81d51c08245a00956dfe332`. GitHub Test/Lint jobs passed and the merged tree matched the validated recovery tree. The previous main commit `34285fc5c1321e3850d3421db5e8f088616b9819` contained only 0.14.13.
- Recovery passed all 70 tests and lint under Node 22.20.0/Yarn 4.17.0. See `docs/PERSISTENCE_AUDIT_0_14_22.md` for the complete version progression and the separate 0.15.0 branch reconciliation requirement.
- Start future work on a focused `codex/` branch. Preserve unrelated changes; when remote publication is authorized, commit/publish and verify the remote commit before reporting work as saved.
- Generated output, dependencies, private captures/exports and package archives are excluded. Original package hashes are historical records, not evidence that binaries are included in a GitHub clone. No replacement 0.14.22 package was created during recovery.

## 3. Requirements and constraints

### Functional and user requirements

- Reliability, simplicity and maintainability take priority over additional features. Church-service use is a production environment.
- Normal network setup uses a fixed or DHCP-reserved IPv4 address, direct device control port and Companion as RTP initiator.
- Preset, Scene and mixer snapshot receive channels must first be configured and saved on the device with iConnectivity Preset Selector. Companion must use the same channels and must not alter device routing.
- Displayed Program Change, preset and snapshot values are one-based; MIDI Program Change data bytes are zero-based.
- Model-specific controls should remain editable offline when the user selects an explicit model.
- User MIDI and internal discovery/status SysEx must have separate counters and last-message state.
- Incoming actionable MIDI must remain ordered. Clock telemetry may be coalesced for Companion publication but every clock pulse must still be counted.

### Safety and compatibility constraints

- Do not add firmware updates, factory reset, bootloader, shutdown, destructive operations or reboot-required writes without explicit approval.
- Public protocol replies and TNG parameter definitions are authoritative. A model name or Auracle feature is not permission to send a command.
- Unsupported actions must be absent or fail with a clear capability-level message, never a low-level transport failure.
- Preserve reconnect behavior, per-instance port isolation, bounded queues and Auracle access to the released TNG configuration session.
- Direct IPv4 address/port is the only supported network target. Removed Bonjour/session-name discovery must not be restored without an exact, tested design that retains manual addressing.
- Package native addons only through the established Companion packaging flow. Current package prebuilds are 64-bit; 32-bit Raspberry Pi is unsupported.
- Use strict TypeScript, ESM `.js` import suffixes and existing Companion API 2 patterns.
- Preserve unrelated working-tree changes and all retained release archives. Never reuse a failed or previously packaged version.
- Never commit private addresses, device serials, personal Companion exports or unsanitized packet captures.

## 4. Important decisions

### Firm decisions

- Network mode is pure Node AppleMIDI/RTP-MIDI and has no external daemon dependency.
- Companion is normally the RTP initiator. Each instance owns its own even/odd local UDP port pair.
- The normal user RTP session stays connected. The compatibility path uses a second session on control/data ports 5002/5003 and reads identity and initial state, then closes so Auracle can use the endpoint.
- Automatic PA1U/mioXM monitoring uses the regular RTP session and leaves Auracle’s configuration port free. Only optional compatibility monitoring retains the configuration session and may exclude Auracle.
- State is normalized before Companion actions, feedbacks, variables or triggers consume it.
- Device capabilities gate the public control surface. TNG definitions and device replies override provisional profiles.
- Production and Candidate are distinct, manually managed states. Promotion requires explicit user approval.
- Retained packages belong only in `releases/` and use the naming/history rules in `releases/README.md`.
- Destructive and reboot-required device operations are excluded.

### Current preferences

- Center the first public beta on PlayAUDIO1U and mioXM Ethernet initiator mode.
- Keep direct manual IPv4/port configuration as the dependable baseline.
- Make PA1U/mioXM status monitoring automatic; keep optional configuration-port compatibility monitoring off by default because it can contend with Auracle.
- Prefer incremental, hardware-testable changes over large protocol-surface expansions.

### Temporary choices

- Default user RTP control port is 5004 and default configuration control port is 5002. These are editable and must match the actual device setup.
- Default responder control port is 5060. Responder mode is still incomplete.
- Legacy polling defaults to 1000 ms, with a configurable 250–10000 ms range.
- Mixer snapshot state starts as unknown because an initial TNG read requires authoritative mixer AudioPortID discovery that has not been implemented.

### Unverified assumptions

- The UI offers mixer snapshot values 1–128, but the PA1U's actual supported range is unknown and must be measured.
- Preset recall is assumed to reset the PA1U mixer snapshot to 1 based on current implementation expectations; hardware verification remains pending.
- USB MIDI and various device/platform profiles may work from implementation or packaging evidence, but are not release-qualified unless marked **H** in `docs/CAPABILITY_MATRIX.md`.

## 5. Architecture and workflow

### Components

- `src/main.ts` owns Companion lifecycle, configuration changes, both transports, discovery, normalized device state, polling, reconnect interactions, live notification registration, rate limiting and publication.
- `src/network/apple-midi.ts` implements AppleMIDI invitations, paired UDP sockets, RTP-MIDI packets, synchronization, liveness, peer filtering, graceful close and reconnection.
- `src/midi.ts` wraps optional local USB MIDI through `@julusian/midi`.
- `src/protocol/legacy.ts` is the production legacy SysEx codec and command map.
- `src/protocol/tng.ts` is a partial TNG foundation: framing/parsing, sessions, device info, active preset/name, active Scene, notification registration and ping.
- `src/devices.ts` supplies deliberately conservative provisional profiles.
- `src/actions.ts`, `feedbacks.ts`, `variables.ts` and `presets.ts` build the Companion surface from the active profile.
- `src/midi-message.ts` parses/describes MIDI, supplies Generic MIDI compatibility, separates real-time telemetry and converts one-based Program Change values.
- `src/upgrades.ts` migrates older saved configurations.

### Network and state flow

```text
Companion instance
  |-- persistent user RTP session --> selected device RTP port
  |       |-- ordinary MIDI and liveness/reconnect
  |       |-- PA1U/mioXM host session, identity and setup Scene read
  |       `-- preset/name refresh, live notifications and keepalive
  |
  `-- configuration RTP session --> usually 5002/5003
          `-- explicit other models / advanced compatibility only

protocol reply / notification / observed Program Change
  -> normalized DeviceState in main.ts
  -> capability-filtered variables, feedbacks, actions and presets
```

The initiator sends control and data invitations every two seconds while disconnected. An established session is considered lost after roughly seven seconds without traffic. Configuration discovery times out after ten seconds and waits thirty seconds before retrying, while the user MIDI session can remain online.

TNG notification monitoring registers only notification classes the device advertises. Keepalive pings are derived from the reported notification timeout. Initial one-time Scene replies and live Scene notifications have different documented parameter shapes; both normalize to `currentScene`.

## 6. Environment and system information

- Runtime requirement: Node `^22.20`; `.node-version` pins `22.20.0`.
- Package manager: Yarn 4 via Corepack; `package.json` pins Yarn `4.17.0`.
- Language/tooling: TypeScript `~6.0.3`, ESLint 9, Prettier 3, strict Node 22 ESM configuration.
- Companion dependency: `@companion-module/base` 2.0.4; packaging tools `@companion-module/tools` 3.x.
- USB dependency: native `@julusian/midi` 3.6.x. The Candidate archive contains Darwin/Linux/Windows x64 and arm64 prebuild directories.
- Main production target: Bitfocus Companion on Raspberry Pi ARM64 over Ethernet.
- Locally exercised interfaces: PlayAUDIO1U and mioXM. The planned endurance rig is one PA1U plus two mioXM interfaces.
- Network protocol: AppleMIDI/RTP-MIDI over UDP. Each session uses an even control port and the next odd data port.
- TNG devices use manufacturer SysEx prefix `F0 00 01 73 7D`; legacy devices use `F0 00 01 73 7E`.
- The 2026-09-17 portability review selected Node 22.20.0 with Corepack Yarn 4.17.0 and successfully ran a locked install, all tests, lint, package build and package verification. Do not bypass the runtime guard in other environments.
- No credentials or cloud services are required to build or run the module. Hardware validation requires physical interfaces, Companion and access to configure device-side Preset Selector/Auracle settings.

Standard commands, run from the repository root:

```sh
corepack yarn install
corepack yarn build
corepack yarn test
corepack yarn lint
corepack yarn package
```

`yarn release:check` runs the test, lint, package and package-verification sequence. The AppleMIDI integration tests open local UDP sockets and require an environment that permits loopback UDP.

## 7. Important identifiers and conventions

- Module package name: `iconnectivity`; Companion module ID: `iconnectivity-interfaces`.
- Current working version: `0.15.1` in both package and manifest.
- Git branch prefix for new work: `codex/`, unless the user requests another name.
- Capability matrix legend: **H** hardware-validated, **I** implemented but needing release validation, **P** planned/publicly documented, **N/A** not applicable.
- Device product IDs used in active TNG mapping: mioXL 14, mioXM 15, PlayAUDIO1U 17. Legacy PlayAUDIO12 is product ID 11.
- Normalized unknown preset/snapshot value is numeric `0` internally and the string `Unknown` in Companion variables. Scene begins as `Unknown` and normalizes to `A` or `B` when known.
- New retained archives: `releases/iconnectivity-interfaces-vX.Y.Z-CANDIDATE.tgz` or `...-PRODUCTION.tgz`.
- `dist/`, `pkg/`, root `.tgz` files and release archives are generated artifacts, not implementation inputs.
- `captures/` is intentionally ignored and may contain private network/device information. Sanitized reusable protocol samples belong in `tests/fixtures/`.

## 8. Project file map

- `AGENTS.md`: permanent safety, release and coding instructions. Read first.
- `PROJECT_CONTEXT.md`: primary cold handoff and orientation.
- `STATUS.md`: concise current Production/Candidate state, completed work, known issues and next steps. Keep its four-section structure.
- `README_AI.md`: short architecture and confirmed-decision summary.
- `README.md`: public/developer overview.
- `companion/HELP.md`: user-facing setup and behavior documentation.
- `companion/manifest.json`: Companion store/runtime metadata; version must match `package.json`.
- `docs/README.md`: router to focused durable documentation.
- `docs/CAPABILITY_MATRIX.md`: device-by-device implementation and hardware-validation authority.
- `docs/PROTOCOL_NOTES.md`: confirmed wire behavior and protocol decisions.
- `docs/IMPLEMENTATION_PLAN.md`: beta gates and deferred feature slices; use `STATUS.md` for what is current.
- `docs/SOURCES.md`: vendor specifications/manuals and Bitfocus references.
- `releases/README.md`: authoritative release policy, inventory and failed-version history.
- `src/`: authoritative TypeScript implementation.
- `tests/`: Node test-runner suites. They import compiled files from `dist/`, so `yarn test` builds first.
- `scripts/check-runtime.mjs`: rejects unsupported Node/Yarn runtimes.
- `scripts/verify-package.mjs`: checks version agreement and expected package output.
- `build-config.cjs`: includes `@julusian/midi` native prebuilds.
- `captures/`: ignored private research. It currently contains packet captures, two UI screenshots and a personal Companion configuration export. Preserve locally, do not commit or share without sanitizing.
- `releases/`: retained package history. Preserve all files; do not infer status from filenames alone.
- `dist/`, `pkg/`, `node_modules/`, `.yarn/install-state.gz`: disposable/generated local state.

## 9. Testing and verified findings

### Automated evidence

- On 2026-10-05, Candidate 0.14.14 passed an immutable install, all 47 tests (including nine focused regular-RTP monitoring tests), lint, package build and package verification under Node 22.20.0/Yarn 4.17.0. The UDP integration tests ran with network-enabled execution.

- On 2026-09-17, the current 0.14.13 source passed a locked dependency install, all 38 automated tests, lint, package build and package verification under Node 22.20.0/Yarn 4.17.0.
- Tests cover legacy/TNG codec framing and malformed-packet rejection, TNG identity/state/notification messages, MIDI parsing and Generic MIDI compatibility, capability-gated surfaces, configuration visibility, upgrade migration, variables, AppleMIDI packet/session behavior, graceful shutdown and restart recovery.
- The AppleMIDI integration tests use loopback UDP and passed during the 2026-09-17 verification in an environment that permitted local UDP sockets.

### Hardware-verified facts

- Ethernet initiator mode and reconnect path have been exercised with PA1U and mioXM.
- PA1U and mioXM identity, online state, user MIDI and preset state/recall have been exercised.
- PA1U Scene recalls/live notifications have been exercised. Earlier startup mapping was wrong; correct SceneNumber reads in 0.14.22 await B-at-restart validation.
- On 2026-08-27, Candidate 0.14.11 promptly obtained PA1U identity and Companion updated from device-originated preset and Scene A/B changes.
- Captures support the documented TNG active preset, preset name and initial PA1U Scene query/reply shapes summarized in `docs/PROTOCOL_NOTES.md`.

### Not yet verified to release level

- Candidate 0.14.13 offline model persistence and deliberate mismatch protection on real hardware.
- PA1U mixer snapshot recall, live update, feedback, snapshot reset behavior and supported range.
- Multi-day live-monitor keepalive, full application/interface recovery and firmware-specific behavior; ordinary coexistence and module-connection restart are user-confirmed on PA1U/mioXM.
- Responder identity/configuration discovery.
- Multi-day recovery/endurance with PA1U plus two mioXM devices.
- USB MIDI and packaged operation on Raspberry Pi ARM64, macOS Apple Silicon and Windows x64 for the current Candidate.
- PlayAUDIO12, mioXL and other advertised devices at release level.
- Full TNG routing, failover/host health, meters, output control, RTP configuration and audio protection.

## 10. Previous attempts and dead ends

- An operating-system network-MIDI dependency was rejected. Network mode is self-contained by design.
- RTP session-name/Bonjour discovery was removed before the production baseline because it was unproven and misleading. Keep direct IPv4/port configuration.
- Applying legacy configuration commands to TNG products was rejected; the protocols are not compatible.
- Auracle-visible PA1U failover, metering and audio protection were previously overrepresented by product profiles. Those unsafe public controls are now disabled until public definitions and hardware evidence exist.
- Failover alarm was previously used as a proxy for the active computer Scene. That was incorrect and was replaced by normalized `current_scene`.
- Continuously retaining the TNG configuration session blocks or competes with Auracle. The standard PA1U/mioXM path now avoids that endpoint; the older initial-read/optional-retention behavior remains an advanced compatibility path.
- Failed versions 0.14.7, 0.14.8, 0.14.9 and 0.15.0 must never be reused. See `releases/README.md` for exact failures.
- Candidate 0.14.2 was built under unsupported Node 24.19.0 before the runtime guard was fixed and must not be treated as qualified.
- Two different 0.14.0 archives exist. Neither is authoritative or policy-conforming; preserve both for history and do not treat `-verified` as an overwrite/replacement.
- Unbounded or per-pulse Companion Clock publication was too costly. Clock pulses are fully counted but published at a controlled interval, and identical normal message descriptions do not force redundant state publication.
- Stale timers/callbacks could close a newer configuration connection. Lifecycle-generation and expected-transport checks now protect the new session.

## 11. Known issues and risks

- Production 0.14.22 and Candidate 0.15.1 remain distinct release states. Git recency or version order never promotes a release; promotion requires explicit user approval.
- Candidate 0.14.19 is not Production. Regular-RTP coexistence/feedback was user-confirmed on PA1U and mioXM using 0.14.18, but the cleaned defaults/migration, retained offline-model/mixer-snapshot scope and broader endurance/platform checks are not release-qualified.
- Live monitoring can prevent Auracle from connecting. Broader keepalive/reconnect and contention behavior remains unverified.
- Responder mode accepts MIDI sessions but lacks a complete identity/configuration discovery path.
- Silent power-cycle/network recovery has loopback coverage but lacks multi-day three-device hardware evidence.
- The PA1U mixer snapshot range and initial state are unknown. Do not present the configured 1–128 UI range as a verified device limit.
- Provisional profiles can become stale as TNG definitions are learned. Future commands must be authorized by the device, not merely added to a profile.
- The local `captures/` material includes private identifiers/network context. It prevents the raw folder from being safely public even though it improves local forensic continuity.
- Historical generated archives consume space and include ambiguous legacy states, but release policy requires preserving them unless the user explicitly authorizes removal.
- Root package metadata names the upstream Bitfocus repository while the configured Git remote is the user's fork. This is normal for module metadata, but a maintainer should know they are different.

## 12. Open questions

- Does PA1U hardware preserve 0.14.13's offline model-specific surface through both module reload and full Companion restart?
- Does a configured/detected model mismatch avoid every model-specific command and poll on real hardware?
- What mixer snapshot numbers does PA1U actually support, and does preset recall always select snapshot 1?
- Which authoritative AudioPortID should be used for an initial PA1U mixer snapshot query?
- How reliably do notification registration and keepalive survive interface, Companion and network restarts?
- Exactly how does live monitoring contend with each tested Auracle X version, and is sequential/multi-client behavior device-dependent?
- Does mioXM preset monitoring remain accurate across extended interface/network recovery and supported firmware versions?
- Should responder mode gain full discovery or be explicitly limited to MIDI-only/experimental for beta?
- Which current device firmware, Companion version and OS images should define the release-validation matrix? These versions are not fully recorded in the folder.
- Are the private captures still needed after sanitized fixtures are created, or should they remain only in a separate private research archive?
- Which future change should be the first focused `codex/` branch from the known-good `main` baseline?

## 13. TODO and next steps

1. **Recommended immediate action:** test Candidate 0.14.21 using `docs/ETHERNET_COEXISTENCE_TEST.md` and record regular-RTP discovery and live-feedback results with Auracle on Ethernet. Continue the retained offline-model/mixer validation afterward. Do not promote the Candidate without explicit user approval.
2. Record each hardware result in `STATUS.md`, `docs/CAPABILITY_MATRIX.md` and `releases/README.md` as appropriate. Separate PA1U preset/Scene notification evidence from still-unverified mixer, keepalive, Auracle and mioXM behavior.
3. Decide whether responder mode will receive full discovery or an explicit MIDI-only/experimental limitation; implement and test the chosen boundary.
4. Run multi-day PA1U plus two-mioXM endurance tests across interface, Companion and network restarts, high MIDI/Clock load and Auracle coexistence.
5. Validate the packaged Candidate on Raspberry Pi ARM64, macOS Apple Silicon and Windows x64; exercise USB MIDI on at least one supported platform.
6. Before public beta, sanitize or exclude private captures/exports, run Bitfocus shared checks, reconcile public help claims and prepare release notes.
7. Only after explicit user approval, promote the validated Candidate by retaining its Candidate archive and creating a separately named Production archive under the release procedure.
8. Keep GitHub `main` as the known-good source baseline; make future development in focused branches and preserve the documented Production/Candidate distinction.

## 14. Handoff notes

- Read `STATUS.md` before reporting what is Production or Candidate. Never infer release state from Git, semantic version order or archive names.
- Read only the focused protocol document selected by `docs/README.md` before protocol/capability changes.
- Do not edit generated output as source. Make changes in `src/` and tests, then rebuild.
- Do not use the private Companion export as a distributable test fixture. Create minimal sanitized fixtures instead.
- If a hardware observation conflicts with current profiles or documentation, record the observation, firmware/model context and reproducible test before widening the control surface.
- A passing automated suite is necessary but insufficient for promotion. The user is the authority for real-production stability and promotion.
- No passwords, API keys or tokens are documented or required. The unavailable resources are physical hardware, its local configuration, current firmware/software versions and production-testing time.

## Cold-handoff result

A new AI or developer can understand the current architecture, release boundary, safety rules, known hardware evidence and immediate test plan from this folder. The project is self-contained for continued source development. It is not self-contained for release qualification because that requires physical PA1U/mioXM hardware, local network/device configuration, current Companion/Auracle installations and the user's explicit Production approval.
