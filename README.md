# iConnectivity Companion module

An extensible Bitfocus Companion module for iConnectivity PlayAUDIO and mio-family interfaces.

Version 0.13 adds optional MIDI Clock reception with dynamic variables, promotes the RTP session name into normal setup, and hardens offline recovery: normal RTP retries remain responsive while configuration discovery waits for the user session, times out cleanly and backs off. Version 0.12 separated high-rate RTP liveness, Clock and Active Sensing from trigger-worthy MIDI.

## Current v1 implementation

- Cross-platform USB/RTP MIDI-port transport using the same native MIDI library as Bitfocus's Generic MIDI module.
- Pure Node.js AppleMIDI/RTP-MIDI initiator and responder transport for Raspberry Pi, with invitations, synchronization heartbeat and automatic reconnect.
- Legacy SysEx Rev. 26 framing, checksum, discovery, identity, command probing, ACK handling and liveness monitoring.
- Capability detection by product ID rather than user-selected model.
- PlayAUDIO12 failover read/write: arm, disarm, clear alarm, main/backup audio and MIDI health, active-computer inference.
- Snapshot and scene recall, list navigation and device-memory save.
- Capability-driven Companion variables: unsupported failover, host and meter variables are hidden after device detection; PlayAUDIO1U/12 expose twelve meter channels while mioXM remains MIDI-only.
- Short-lived TNG configuration discovery so Auracle X can use the device after Companion reads identity, while the user RTP-MIDI session remains online.
- Incoming MIDI Clock detection with receiving state, smoothed BPM, pulse count and timestamp variables.
- Native one-based preset and PlayAUDIO Scene A/B recalls over the normal RTP-MIDI session, with configurable Preset Selector channels and observed/cached state variables.

## Scene and preset prerequisite

Use iConnectivity's Preset Selector application over USB once for each interface to configure and save the device-side MIDI receive channels for preset recall and, on PlayAUDIO, Scene A/B. The module's channel settings must match that saved configuration. The module sends the working Program Change messages over RTP-MIDI but intentionally does not change Preset Selector routing or control-port configuration.

- Audio output meter polling with dBFS variables and signal-present feedback.
- Companion variables, feedbacks, actions and presets.
- Network and local USB MIDI receive awareness, complete MIDI send actions, and Generic MIDI-compatible trigger variables.
- Protocol unit tests based on published examples.

The TNG adapter for PlayAUDIO1U, mioXL, mioXM and mioXC is the next implementation milestone. The public protocol fully documents these devices, but TNG uses session negotiation, parameter data classes and notification subscriptions and must not be treated as legacy SysEx. See `docs/IMPLEMENTATION_PLAN.md`.

## Development

Requires Node 22 and Yarn 4.

```sh
yarn
yarn test
yarn package
```

## Safety

The module does not expose factory reset, firmware update or bootloader commands. Configuration writes that require a reboot are also excluded from v1. Device capability responses remain authoritative: a model name never causes an unsupported command to be sent.
