# AI handoff

## Purpose

This repository is a Bitfocus Companion module for iConnectivity PlayAUDIO and mio-family MIDI/audio interfaces. It discovers devices, selects USB or RTP-MIDI transport, exposes Companion actions/feedbacks/variables/presets, and sends documented legacy SysEx or partial TNG messages.

## Architecture

- `src/main.ts` owns the Companion module lifecycle, discovery, normalized state, transport selection, and public module wiring.
- `src/config.ts`, `src/actions.ts`, `src/feedbacks.ts`, `src/variables.ts`, `src/presets.ts`, and `src/upgrades.ts` define the Companion surface.
- `src/midi.ts` and `src/network/apple-midi.ts` provide native MIDI and AppleMIDI/RTP-MIDI transport.
- `src/protocol/legacy.ts` is the implemented legacy Rev. 26 codec; `src/protocol/tng.ts` is the TNG codec/message foundation used for discovery and selected reads.
- `src/devices.ts` contains product IDs and capability profiles. Device responses and command/parameter definitions are authoritative; model names are not.
- `tests/` contains Node test-runner coverage for transports, codecs, device behavior, and public module behavior.

## Important files and directories

- `AGENTS.md` — operating rules and verification commands for AI agents.
- `STATUS.md` — current work state and next actions.
- `docs/` — durable protocol research, sources, capability matrix, and implementation plan; start with `docs/README.md`.
- `companion/` — Companion manifest and user-facing help.
- `captures/` — local investigative captures; large captures are ignored, while the companion reference JSON remains visible.
- `dist/`, `pkg/`, root `*.tgz`, and `releases/` — generated/package artifacts, not source of truth.

## External services and APIs

The module targets Bitfocus Companion API 2 and uses `@companion-module/base`. MIDI I/O uses `@julusian/midi`; network MIDI uses the AppleMIDI/RTP-MIDI protocol over UDP. Protocol behavior is based on the iConnectivity Rev. 26 and TNG specifications listed in `docs/SOURCES.md`.

## Confirmed decisions and constraints

- Node 22 and Yarn 4 are required.
- SysEx over an operating-system MIDI endpoint is the primary control path. Do not add a second AppleMIDI session implementation inside the device protocol without a deliberate design decision.
- Legacy and TNG are different wire protocols; do not share framing or assume legacy commands work on TNG devices.
- Capability detection must follow device responses/definitions.
- Factory reset, firmware update, bootloader, shutdown, and reboot-requiring configuration writes are intentionally excluded.
- Preset/scene recall depends on channels configured and saved with iConnectivity Preset Selector; the module does not change that routing.
