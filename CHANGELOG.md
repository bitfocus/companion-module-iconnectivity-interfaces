# Changelog

## 1.0.0 (unreleased)

First release through the Bitfocus module store. It will be built from the Candidate 0.15.2 code once that build completes its endurance and recovery testing.

### Features

- **Ethernet RTP-MIDI built in.** Self-contained AppleMIDI/RTP-MIDI initiator with automatic reconnection; no operating-system network-MIDI software needed. Several connections can run side by side on independent ports.
- **Works alongside Auracle.** On PlayAUDIO1U and mioXM, device status is read over the regular RTP port, leaving the configuration port free so Auracle can stay connected over Ethernet.
- **Presets.** Recall presets 1–128, with the current preset number and name confirmed by the device and refreshed every three seconds. Ready-made preset buttons light up on the active preset.
- **PlayAUDIO Scene A/B.** Recall Scenes, with live feedback from device notifications, a correct reading at startup, and an automatic re-check after 15 quiet seconds so a missed notification cannot leave Scene feedback wrong.
- **PlayAUDIO mixer snapshots.** Recall, variable and feedback on a separate Preset Selector channel (not yet tested on hardware).
- **MIDI.** Note, CC, Program Change, aftertouch, pitch bend, transport, Clock, raw bytes and SysEx actions with input validation; incoming MIDI variables, Generic MIDI-compatible trigger variables, and MIDI Clock BPM.
- **Offline editing.** Choose the interface model to keep its actions and feedbacks available while the device is offline; a model mismatch is reported and blocks model-specific commands.
- **Diagnostics.** Optional diagnostic variables, a `state_monitoring` status variable and clear log messages for discovery, read failures and notification registration.

### Known limitations

- Tested on hardware: PlayAUDIO1U and mioXM over Ethernet. PlayAUDIO12, mioXL, USB MIDI and RTP responder mode are included but not hardware-tested.
- Responder mode carries MIDI only, without device state monitoring.
- PlayAUDIO1U failover, metering, audio controls and full routing are not implemented.

## Development history

The module was developed and tested privately before public release. Highlights:

- **0.15.2:** Scene re-check after a quiet interval; public listing cleanup; automatic test builds.
- **0.15.1:** Fixed missing status at startup and after reconfiguration, reduced Companion load from status replies, correct handling of RTP packets carrying several MIDI messages, TNG-aware Refresh, MIDI action input validation, selector channel-conflict protection, current-preset feedback and preset buttons.
- **0.14.22:** Corrected Scene read at startup (the earlier read targeted an audio-clock setting).
- **0.14.19–0.14.21:** Automatic regular-RTP monitoring alongside Auracle, faster first connection, optional diagnostic variables.
- **0.14.13:** Explicit interface-model setting for offline editing.
- **0.13.3:** First production-stable build.

Every intermediate build, failed build and archive is recorded in [`releases/README.md`](releases/README.md).
