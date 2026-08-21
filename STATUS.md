# Status

## Working Now

- Prepare a public beta centered on Ethernet initiator mode for PlayAUDIO1U and mioXM.
- Make actions, feedbacks and presets capability-aware; variables already rebuild after detection.
- Current source version is 0.13.9. Sunday release candidate: direct IP/port RTP-MIDI is the only exposed network target. Session-name/Bonjour discovery was removed because iConnectivity hardware advertisements and lifecycle handling are not production-validated. Node 22 verification remains required before show use.

## Recently Completed

- Built self-contained AppleMIDI/RTP-MIDI with reconnect handling and multiple-instance port isolation.
- Added TNG identity plus one-time active preset/name and PlayAUDIO1U Scene reads, then release of the configuration session for Auracle.
- Added Generic MIDI-compatible receive variables, complete basic MIDI send actions, Clock rate limiting and Scene/preset actions.
- Replaced misleading active-computer Scene feedback with `current_scene`.
- MIDI Clock pulses remain fully counted and used for tempo/receiving state, while Companion clock-variable publication is coalesced to a 250 ms interval; repeated identical non-clock messages no longer republish unchanged descriptive variables.
- Removed unproven RTP-MIDI session-name/Bonjour discovery from the Sunday build; existing configurations continue to use direct device address and RTP control port.

## Known Issues

- Capability profiles currently expose some unsupported TNG failover/meter surfaces; action, feedback and preset definitions are not fully dynamic.
- Full TNG routing, notifications, failover, meters, audio control, RTP configuration and audio-protection mapping are unfinished.
- Responder mode does not have a complete identity/configuration discovery path.
- PlayAUDIO12, mioXL, legacy mio, USB MIDI, macOS and Windows are implemented or advertised to varying degrees but not release-validated.
- Package prebuilds target 64-bit platforms; 32-bit Raspberry Pi is not supported.

## Next Steps

1. Gate the Companion surface by detected capabilities and add regression tests.
2. Fix or explicitly limit responder mode, then test reconnect and lifecycle behavior.
3. Align public help/manifest claims with the validated beta scope.
4. Run multi-day three-device endurance testing and package tests on Pi ARM64, macOS and Windows.
5. Sanitize repository history/artifacts, run Bitfocus module checks and prepare the first tagged beta.
