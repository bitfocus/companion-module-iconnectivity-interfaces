# Status

## Working Now

- **Production:** 0.13.3 — confirmed as the real-hardware/production-stable baseline on 2026-08-23 (archive created 2026-08-21). It remains the trusted build unless the user explicitly approves a Candidate promotion.
- **Candidate:** 0.15.0 (2026-10-07) — reliability release from the 2026-10-07 pre-public audit. Fixes a stale green status after reconfiguration, a false latched "Device stopped responding" after brief RTP gaps, live monitoring not re-registering after a device reconnect, the configuration session (and Auracle) being held on a model mismatch, multi-command RTP packets being treated as one message, and MIDI actions able to emit unintended status bytes (for example System Reset). Also: surface rebuilds only on profile change, preset name cleared on recall, TNG-aware **Refresh device state**, selector channel-conflict protection, upgrade preserving a custom configuration port, and a new Current preset feedback with preset recall buttons. Packaged and verified under Node 22.22.0/Yarn 4.17.0; all 60 automated tests passed. Not hardware-tested. Testing scope (PA1U first, then mioXM): (1) normal connection, identity, preset/name and Scene discovery, and Auracle access after release — every incoming RTP packet now goes through a new RFC 6295 command-list decoder, so this is the key regression check; (2) change the interface IP to a wrong address and confirm the status turns to Connecting and the online feedback clears; (3) unplug Ethernet for about 3 seconds and confirm the status stays OK, then for about 15 seconds and confirm Connecting followed by automatic recovery; (4) with live monitoring on, power-cycle the PA1U and confirm front-panel preset/Scene changes still update Companion afterwards; (5) select the wrong interface model and confirm the configuration error and that Auracle can connect; (6) with live monitoring off, change the preset on the front panel, run **Refresh device state**, confirm Companion updates and Auracle can connect afterwards; (7) use the new Device presets buttons and confirm the current-preset highlight. The untested 0.14.13 scope (offline model persistence across restarts) and 0.14.12 mixer snapshot scope carry forward. Archive: `releases/iconnectivity-interfaces-v0.15.0-CANDIDATE.tgz` (SHA-256 `8463ce0d9cb99809a86031c30e2a8977471a15b106cca23b69ef5863a4d17754`).
- **Discarded build:** **0.14.14** (2026-10-07) was packaged (`iconnectivity-interfaces-v0.14.14-CANDIDATE.tgz`, SHA-256 `f213007f22e29b3a768b1c84babafd8b12a52132ca016f237a55854ba2eae466`) but could not be installed: Companion reported that iconnectivity-interfaces v0.14.14 already exists. That earlier 0.14.14 is not recorded in this inventory. The archive is retained, the version must not be reused, and its identical source was repackaged as 0.15.0. Before packaging, confirm the version is newer than every module version installed in the target Companion.
- **Prior Candidate:** 0.14.13 (2026-09-03), superseded before hardware testing; its scope carries into 0.15.0. It adds an explicit interface-model setting so capability-gated actions, feedbacks, variables and presets remain available while the interface is offline. Auto-detect remains the migration/default behavior. A configured/detected model mismatch reports a configuration error and blocks model-specific commands and polling. It retains the 0.14.12 mixer snapshot work and the hardware-validated 0.14.11 preset/Scene feedback. Packaged and verified under Node 22.20.0/Yarn 4.17.0; all 38 automated tests passed. Testing scope: configure a PA1U while powered off, confirm Scene and mixer snapshot controls remain editable after module/Companion restarts, confirm normal connection and recalls after power-up, and confirm a deliberately wrong model selection produces a mismatch error without sending model-specific commands. Existing 0.14.12 mixer snapshot, notification, reconnect, mioXM and Auracle-contention testing remains outstanding. Archive: `releases/iconnectivity-interfaces-v0.14.13-CANDIDATE.tgz`.
- **Source baseline:** the private GitHub repository's `main` branch is the known-good source baseline. On 2026-09-17, its current 0.14.13 tree passed a locked dependency install, all 38 tests, lint, package build and package verification under Node 22.20.0/Yarn 4.17.0. This source status does not promote the Candidate to Production.
- Prepare a public beta centered on Ethernet initiator mode for PlayAUDIO1U and mioXM.
- Public beta scope: direct IPv4 address/port RTP-MIDI remains the only exposed network target. Auto-detect rebuilds the surface from the detected profile, while an explicitly selected model preserves model-specific controls offline. Node 22 verification remains required before show use.
- Build and release checks now reject unsupported Node/Yarn runtimes; retained testable packages must be placed in `releases/` under the two-tier release procedure.

## Recently Completed

- 0.15.0 pre-public audit fixes: correct status after reconfiguration and brief RTP gaps, live-monitoring re-registration after reconnect, configuration session released on model mismatch, RFC 6295 multi-command/running-status/segmented-SysEx decoding, validated MIDI action inputs, TNG refresh, channel-conflict protection, current preset feedback and preset buttons, and a loopback fake-TNG-device harness covering `main.ts` lifecycle behavior.

- Added an explicit interface-model setting so capability-gated controls remain available for offline Companion editing; auto-detect remains the default, and detected model mismatches are reported and blocked.
- Built self-contained AppleMIDI/RTP-MIDI with reconnect handling and multiple-instance port isolation.
- Added TNG identity plus one-time active preset/name and PlayAUDIO1U Scene reads, then release of the configuration session for Auracle.
- Added optional TNG notification monitoring for immediate device-originated preset and Scene updates. PA1U preset/Scene updates are validated; broader keepalive/reconnect, mioXM and Auracle-contention behavior remains pending.
- Added graceful AppleMIDI end-session signaling on both control and data channels to prevent stale device sessions after module reloads; configuration endpoint failures now log visible warnings.
- Corrected live PA1U Scene normalization to accept the documented DeviceFeature:SceneNumber notification shape as well as the hardware-captured initial Scene reply.
- Confirmed on PA1U hardware that 0.14.11 obtains identity promptly and updates Companion from device-originated preset and Scene A/B changes.
- Added capability-gated PA1U mixer snapshot recall, tracking, variable, feedback and live TNG notification parsing with an optional Preset Selector MIDI channel.
- Added Generic MIDI-compatible receive variables, complete basic MIDI send actions, Clock rate limiting and Scene/preset actions.
- Replaced misleading active-computer Scene feedback with `current_scene`.
- MIDI Clock pulses remain fully counted and used for tempo/receiving state, while Companion clock-variable publication is coalesced to a 250 ms interval; repeated identical non-clock messages no longer republish unchanged descriptive variables.
- Removed unproven RTP-MIDI session-name/Bonjour discovery from the Sunday build; existing configurations continue to use direct device address and RTP control port.
- Added capability-gated actions, feedbacks and presets with regression coverage. PlayAUDIO1U retains validated MIDI, preset and Scene controls; unvalidated TNG failover, meter and audio-protection controls are no longer advertised.
- Hardened RTP lifecycle handling: UDP socket errors are contained, silent peer loss records a reason and reconnects, and restart recovery has loopback coverage.
- Prevented a stale configuration-session timeout or callback from closing a newer connection after a configuration update or reconnect. RTP packets are now accepted only from the configured initiator peer or the responder's established peer.
- Corrected the runtime guard so `build`, `test`, `lint`, and `package` cannot silently run outside Node 22.20+/Yarn 4.
- Simplified configuration: relevant Ethernet fields now follow the selected connection role, MIDI Clock is grouped with MIDI options, and responder mode uses a visible fixed local control port.
- Added concise configuration tooltips, simplified user-facing labels, and a direct Preset Selector link.

## Known Issues

- Full TNG routing, notifications, failover, meters, audio control, RTP configuration and audio-protection mapping are unfinished.
- Responder mode does not have a complete identity/configuration discovery path.
- Device/interface power-cycle recovery is covered by loopback simulation but still requires multi-day hardware validation.
- PlayAUDIO12, mioXL, legacy mio, USB MIDI, macOS and Windows are implemented or advertised to varying degrees but not release-validated.
- PA1U live preset/Scene updates were hardware-validated in 0.14.11. Broader notification validation remains incomplete, including mioXM preset updates, mixer snapshots, keepalive/reconnect behavior and expected Auracle contention; enabling monitoring retains the device configuration session.
- Package prebuilds target 64-bit platforms; 32-bit Raspberry Pi is not supported.

## Next Steps

1. Run the 0.15.0 Candidate hardware scope recorded under Working Now. Then validate offline model selection and retained PA1U controls, then continue PA1U mixer snapshot validation: recall several valid snapshot numbers, confirm live device-originated updates and feedback highlighting, confirm snapshot 1 after preset recall, and determine the supported snapshot range.
2. Fix or explicitly limit responder mode, then test reconnect and lifecycle behavior.
3. Run multi-day three-device endurance testing and package tests on Pi ARM64, macOS and Windows.
4. Align public help claims, sanitize repository history/artifacts, run Bitfocus module checks and prepare the first tagged beta.
