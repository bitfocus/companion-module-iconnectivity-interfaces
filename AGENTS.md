# AGENTS.md: single source of truth for every coding agent (Claude Code, Codex, others)

## Working rules (read these first)

- Read `HANDOFF.md` first, update it last (newest entry at the top).
- Make small, focused commits with clear messages, and make sure the project builds (`yarn build`, plus `yarn test` and `yarn lint` for code changes) before each commit.
- Do not change architecture, rename things, or add dependencies without asking the owner first.
- The owner (Mike) is the project director, not the programmer. Explain decisions in plain language: what changed for him, and what you need from him. Do all GitHub work yourself; never ask him to run commands.
- If this file disagrees with any other document, this file wins. Fix the other document or note the conflict in `HANDOFF.md`.

## What this is and who it's for

A Bitfocus Companion module (module id `iconnectivity-interfaces`) that controls and monitors iConnectivity PlayAUDIO and mio audio/MIDI interfaces. It is used in live church production and published in Companion's module store for anyone to use. Users press Companion buttons to:

- recall device presets, PlayAUDIO Scene A/B and mixer snapshots;
- see the device's real current preset and Scene;
- send and receive MIDI over Ethernet.

| Device      | Status                            |
| ----------- | --------------------------------- |
| PlayAUDIO1U | tested on hardware over Ethernet  |
| mioXM       | tested on hardware over Ethernet  |
| PlayAUDIO12 | supported, not tested on hardware |
| mioXL       | supported, not tested on hardware |

## Build and run

Node `^22.20` (`.node-version` 22.20.0) and Yarn 4 via Corepack (`yarn@4.17.0`). There is no Xcode project and no Xcode scheme: this is a TypeScript/Node project.

```sh
corepack enable
yarn install          # exactly from yarn.lock; never npm, never package-lock.json
yarn build            # compile src/ to dist/
yarn test             # build, then run all tests in tests/ (needs local loopback UDP)
yarn lint             # ESLint
yarn format           # Prettier (writes files)
yarn package          # build the importable Companion .tgz (project root)
yarn package:verify   # check the package's version matches the source
yarn release:check    # all of the above in order
```

One test file: `yarn build && node --test tests/<name>.test.mjs`. To run it for real, import the `.tgz` on Companion's **Modules** page, add an "iConnectivity Interfaces" connection, and enter the interface's IP address and RTP port (normally 5004).

## Architecture in plain language

- `src/main.ts` is the module itself. It reads the settings, opens the connection, keeps track of the device's state, and tells Companion what to show.
- `src/network/apple-midi.ts` is a self-contained network-MIDI (RTP-MIDI/AppleMIDI) connection, so no extra network-MIDI software is needed on the computer. It reconnects on its own.
- `src/protocol/` holds the device "languages":
  - `tng.ts` is for newer devices: PlayAUDIO1U, mioXM, mioXL.
  - `legacy.ts` is for older devices: PlayAUDIO12.
  - These files only encode and decode messages; they never send anything themselves.
- `src/actions.ts`, `feedbacks.ts`, `variables.ts`, `presets.ts` define the button actions, the button colour/state checks, the readable values, and ready-made buttons. `config.ts` holds the settings page. `upgrades.ts` updates settings saved by older versions. `devices.ts` describes what each model can do.
- `src/midi.ts`, `midi-message.ts` handle USB MIDI and MIDI message parsing.
- How the device state stays accurate:
  - On PlayAUDIO1U/mioXM, the module asks the device for its state over the regular MIDI port (5004). That leaves the device's configuration port (5002) free, so Auracle can stay connected at the same time.
  - It re-reads the preset every 3 seconds.
  - It re-checks the Scene after 15 quiet seconds.
- `tests/` has Node test-runner suites, including a fake network device for connection tests. `companion/manifest.json` and `companion/HELP.md` are the store listing and in-app help.

## Code conventions

- TypeScript strict mode, ESM with `.js` import paths, the repository's Prettier settings, and Companion API 2 (`@companion-module/base` 2.0.4, tools 3.1.x) patterns.
- Keep protocol encoding and decoding pure and covered by tests. A protocol change needs a test or a cleaned-up sample message in `tests/fixtures/`.
- Trust what the device reports it can do; never assume from the model name alone. Unsupported controls are hidden or fail with a clear message.
- Commit messages: short imperative summary with a type prefix (`fix:`, `ci:`, `docs:`, `test:`, `build:`).
- Branches: TODO. The owner should confirm the naming per tool: older work used `codex/...` for Codex and `claude/...` for Claude.

## Decisions already made (and why)

- **One home.** `bitfocus/companion-module-iconnectivity-interfaces` has been the only place to develop since 2026-11-12, because that is what Bitfocus publishes from.
- **Download page.** `mikecreates86/companion-module-iconnectivity-interfaces` is only the download page. Bitfocus does not let its repositories publish downloads, so the owner's copy builds the Bitfocus `main` every hour and posts the `.tgz`. Never develop there. Its workflow source is `.github/workflows/release.yaml` here; copy it over when it changes.
- **Version numbers only go up**, so Companion never refuses an import:
  - Store versions are plain `X.Y.Z`. They are set in `package.json` and the manifest only after the owner approves; `store-tag.yaml` then tags `vX.Y.Z`, and the owner submits it in the Bitfocus Developer Portal.
  - Every other change becomes a test download `X.Y.Z-test.N`, above the current store version.
- **The project follows the Bitfocus module template** (ignore files, scripts, package name), because the 1.0.0 review required it.
- **The module never takes Auracle's configuration port**, and never changes device routing or Preset Selector settings. This keeps Auracle usable alongside Companion.
- **The module id stays `iconnectivity-interfaces`.** Existing connections and the store listing depend on it.

## Do not change without asking

- Architecture, file or module names, the module id, settings field ids (saved user settings depend on them), and dependencies.
- Anything that writes to the device beyond preset, Scene and snapshot recall. No factory reset, firmware update, reboot or routing writes.
- `companion/manifest.json`, `companion/HELP.md` and `.github/workflows/`, unless the task is about them.
- Generated or private files are never source: `dist/`, `pkg/`, `*.tgz`, `releases/` archives and `captures/` stay out of the repository (see `.gitignore`).
- Never commit personal Companion exports, device serial numbers, private IP addresses, church or people's names, passwords or keys. This repository is public.

## Current state (2026-11-19)

**Released:**

- 1.0.0 (2026-11-10) was submitted to the Bitfocus store. The review asked for 5 template changes and no code fixes.
- 1.0.1 (2026-11-12) contains those changes and was submitted by the owner.
- The 1.0.1 review result is TODO: the owner should check the Developer Portal.
- The download page published 1.0.1 as Latest on 2026-11-18.
- 1.0.x has the same module code as 0.15.3, which the owner ran in live use without issues.

**Trusted for live use:** TODO. Records disagree: `WHATS_NEW.md` says 1.0.1, but `STATUS.md` still lists Production 0.14.22 and Candidate 0.15.2. The owner should confirm.

**Working:**

- Ethernet connection with automatic reconnect.
- Preset recall and feedback (number and name).
- PlayAUDIO1U Scene A/B recall and feedback, including Scene B at startup.
- Running alongside Auracle.
- MIDI send/receive, Clock BPM, Generic MIDI-compatible variables.
- 102 automated tests.

**Half-built or untested:**

- Mixer snapshots (untested).
- PlayAUDIO12 and mioXL.
- USB MIDI.
- Responder mode (experimental, MIDI only).
- PlayAUDIO12 failover.
- Full routing, meters and audio control are not implemented.

**Known bugs (from the 1.0.0 review, not blocking; they change behaviour, so they need a hardware-tested build):**

- M1: saving settings with a fixed local RTP port fails (port still in use).
- M2: the preset name can stay stale on the configuration-port and responder paths.
- M3: legacy snapshot/Scene type uses numeric ids.
- L1: a log line repeats every 3 s when notification registration fails.
- L2: every packet republishes all variables.
- L3: the Scene 1/2 translation is applied to PlayAUDIO12.
- L4: the USB MIDI library import stops the module on Linux without ALSA.
- L5: USB never reads the current preset/Scene.
- L6: a settings upgrade can reset a custom configuration port to 5002.
- L7: `as never` casts on the action and feedback definitions.

**Open question:** after updating Companion 5.0.7 → 5.1.0, the owner lost the module's IP address and settings. The cause is unconfirmed; the module never saves settings itself. TODO: did other connections keep their settings?

**Other records:**

- `STATUS.md` has the detailed history.
- `docs/` has protocol notes (`PROTOCOL_NOTES.md`), the capability matrix and the stability checklist.
- `releases/README.md` has the release history.
- `PROJECT_CONTEXT.md` and `README_AI.md` are older context notes. TODO: owner decides whether to keep or retire them now that this file exists.
