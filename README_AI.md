# AI handoff

Start with `PROJECT_CONTEXT.md` for the complete cold handoff, then use this file as the short architecture summary.

## Purpose

Bitfocus Companion module for monitoring and controlling iConnectivity PlayAUDIO and mio-family interfaces. The currently hardware-validated path is Companion on Raspberry Pi ARM64 connecting as an AppleMIDI/RTP-MIDI initiator to PlayAUDIO1U and mioXM devices over Ethernet.

## Architecture

- `src/main.ts` owns lifecycle, transport selection, discovery, normalized state and reconnect behavior.
- `src/network/apple-midi.ts` is the authoritative pure-Node AppleMIDI/RTP-MIDI transport.
- `src/midi.ts` provides optional local USB MIDI through the native `@julusian/midi` addon.
- `src/protocol/legacy.ts` is the production legacy SysEx codec.
- `src/protocol/tng.ts` implements TNG framing, identity, selected preset/Scene reads, notification registration and keepalive; it is not a complete TNG control surface.
- `src/devices.ts` contains provisional capability profiles. Public protocol responses/definitions are authoritative; profile names alone are not permission to send a command.
- Companion actions, feedbacks, variables, presets and configuration are defined in the corresponding `src/*.ts` files.
- Tests are under `tests/`; user help and store metadata are under `companion/`; durable research is under `docs/`.

## External interfaces

- Bitfocus Companion module API 2 on Node 22.
- AppleMIDI/RTP-MIDI over UDP for Ethernet sessions.
- `@julusian/midi` for local USB MIDI; packaged builds require approved native addons and supported prebuilds.
- iConnectivity legacy Rev. 26 and TNG SysEx specifications listed in `docs/SOURCES.md`.

## Confirmed decisions

- Network mode is self-contained and does not require `rtpmidid`, ALSA network-MIDI setup or Apple Network MIDI.
- Companion is normally the RTP initiator. Each instance owns independent local UDP port pairs and reconnects after either endpoint restarts.
- Build, test and package commands require Node 22.20+ and Yarn 4. The disposable compiler output is `dist/`; retained testable Companion packages belong only in `releases/` and follow the two-tier procedure in `releases/README.md`.
- Candidate 0.14.19 makes regular-RTP discovery and live monitoring automatic for PA1U/mioXM and Auto-detect Ethernet initiators. Preset/name reads reconcile state every three seconds; presets require device confirmation. The configuration port stays free for Auracle.
- Explicit PlayAUDIO12/mioXL selections and the advanced configuration-port override preserve the older status path. Its optional monitoring can contend with Auracle and retains a scoped warning.
- Preset and PlayAUDIO Scene recalls use one-based MIDI Program Change values on channels configured beforehand with iConnectivity Preset Selector.
- Incoming MIDI Clock is separated and rate-limited so it cannot overwhelm Companion trigger variables.
- Device state must be normalized before actions, variables or feedbacks consume it. Unsupported controls must be hidden or rejected clearly.
- Destructive operations, firmware updates, factory reset and reboot-required writes are excluded.

## Current boundary

PlayAUDIO1U and mioXM identity, online state, user MIDI, preset state/recall and PlayAUDIO1U Scene state/recall have been exercised on hardware. Full TNG routing, failover, meters, audio controls, notifications and RTP configuration are unfinished. PlayAUDIO12, mioXL, legacy mio, USB MIDI, responder mode and non-Linux platforms require release-level hardware validation. See `STATUS.md` first, then `docs/CAPABILITY_MATRIX.md` only when capability scope matters.

## Current handoff (2026-10-07)

Candidate 0.14.22 includes automatic PA1U/mioXM regular-RTP monitoring alongside Auracle, device-confirmed preset/name refresh every three seconds, faster startup, optional diagnostic variables and the corrected DeviceFeature:SceneNumber startup read. The user confirmed the PA1U B-at-module-restart fix on 2026-10-05 and chose to test this same package through the week. Production remains 0.13.3. Wider recovery/endurance and explicit promotion remain outstanding.

The full source and original research/release records were recovered and merged into GitHub `main` through [PR #2](https://github.com/mikecreates86/companion-module-iconnectivity/pull/2) on 2026-10-07 (merge commit `06cccb3c779e84c6d81d51c08245a00956dfe332`). GitHub Test/Lint jobs passed and the merged source matched the validated recovery tree. All 70 tests and lint passed again under Node 22.20.0/Yarn 4.17.0. Verify the selected remote ref contains 0.14.22 before resuming. Read `docs/PERSISTENCE_AUDIT_0_14_22.md` for the complete 0.14.14–0.14.22 progression, original package availability and the independent 0.15.0 branch. Follow `docs/STABILITY_CHECKLIST.md` for remaining tests. Do not rebuild or replace the user's tested 0.14.22 archive.
