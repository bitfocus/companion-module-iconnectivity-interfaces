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
- The normal user RTP session remains connected for MIDI and liveness. On TNG devices, the configuration session on 5002/5003 is opened briefly for identity and initial preset/scene reads, then released for Auracle.
- Preset and PlayAUDIO Scene recalls use one-based MIDI Program Change values on channels configured beforehand with iConnectivity Preset Selector.
- Incoming MIDI Clock is separated and rate-limited so it cannot overwhelm Companion trigger variables.
- Device state must be normalized before actions, variables or feedbacks consume it. Unsupported controls must be hidden or rejected clearly.
- Destructive operations, firmware updates, factory reset and reboot-required writes are excluded.

## Current boundary

PlayAUDIO1U and mioXM identity, online state, user MIDI, preset state/recall and PlayAUDIO1U Scene state/recall have been exercised on hardware. Full TNG routing, failover, meters, audio controls, notifications and RTP configuration are unfinished. PlayAUDIO12, mioXL, legacy mio, USB MIDI, responder mode and non-Linux platforms require release-level hardware validation. See `STATUS.md` first, then `docs/CAPABILITY_MATRIX.md` only when capability scope matters.
