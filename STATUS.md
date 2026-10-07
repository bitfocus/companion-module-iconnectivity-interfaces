# Status

## Working Now

- **Production:** 0.13.3 — confirmed as the real-hardware/production-stable baseline on 2026-08-23 (archive created 2026-08-21). It remains the trusted build unless the user explicitly approves a Candidate promotion.
- **Candidate:** **0.14.22** (2026-10-05) — fixes incorrect Scene initialization after restart by reading DeviceFeature:SceneNumber. The old AudioInfo:AudioClockRestartValue query was incorrectly treated as Scene. Preserves live-notification precedence, preset polling, fast startup and optional diagnostics. All 70 tests, lint, package build and package verification passed under Node 22.20.0/Yarn 4.17.0. The user confirmed the PA1U Scene startup regression test works. Continue wider recovery/endurance checks in `docs/STABILITY_CHECKLIST.md`. Archive: `releases/iconnectivity-interfaces-v0.14.22-CANDIDATE.tgz`.
- **GitHub source baseline:** `main` now contains the complete recovered 0.14.22 source and history, merged on 2026-10-07 through [PR #2](https://github.com/mikecreates86/companion-module-iconnectivity/pull/2), merge commit `06cccb3c779e84c6d81d51c08245a00956dfe332`. Recovery passed all 70 tests and lint under Node 22.20.0/Yarn 4.17.0; GitHub Test/Lint jobs passed, and comparison with the published recovery commit showed no file differences. See `docs/PERSISTENCE_AUDIT_0_14_22.md` for provenance, every intermediate version and original package availability.
- Prepare a public beta centered on Ethernet initiator mode for PlayAUDIO1U and mioXM.
- Public beta scope: direct IPv4 address/port RTP-MIDI remains the only exposed network target. Auto-detect rebuilds the surface from the detected profile, while an explicitly selected model preserves model-specific controls offline. Node 22 verification remains required before show use.
- Build and release checks now reject unsupported Node/Yarn runtimes; retained testable packages must be placed in `releases/` under the two-tier release procedure.

## Recently Completed

- Candidate 0.14.22 PA1U Scene startup verification (2026-10-05): following the supplied B-in-Auracle/module off-on regression test, the user reported testing and confirmed it works. This confirms the corrected active-Scene startup path for the reported setup. Individual A/B repetitions, full Companion restart and other live-change checks were not itemized separately. Wider recovery/endurance qualification and explicit Production promotion remain outstanding.

- Candidate 0.14.21 restart bug reported 2026-10-05: the user set PA1U Scene B in Auracle, toggled the module off/on, and Companion initialized to A while the unit stayed on B. Rechecking the official TNG Rev. 1 specification established that the old query (data class 0x08, parameter 0x41) reads AudioInfo:AudioClockRestartValue, not active Scene. Earlier capture interpretation and initial-Scene hardware-validation claims were incorrect. The 0.14.18 suppression fixed live overwrites but left this incorrect startup read.

- Candidate 0.14.22 replaces the old query with GetParmVal for DeviceFeature (data class 0x03), SceneNumber (parameter 0x04), without arguments (the current work area). The documented response and live notifications share this same active-Scene field. Initial reads are transaction-matched, ignore the old audio-clock value, and retain newer live notifications when a startup reply is delayed. Missing/invalid Scene replies leave Unknown. The new query also applies to the configuration-port compatibility path. Preset refresh, startup synchronization and diagnostics behavior remain as in 0.14.21. The user subsequently confirmed the PA1U B-at-module-restart fix on 2026-10-05; wider qualification remains pending.

- Candidate 0.14.21 (2026-10-05) adds Show diagnostic variables under Advanced Settings. New connections default off; a dedicated upgrade enables diagnostics on existing connections that lack the setting, preserving references. Hidden variables include internal command/response counts/raw messages, MIDI traffic/queue counters, RTP details, product/protocol/capability details, acknowledgements and Clock pulse counts/timestamps. Operational state, identity/monitoring status, MIDI triggers and Clock BPM remain visible. All publication paths filter hidden diagnostics while monitoring continues. The toggle/upgrade requires a hardware UI check; the underlying 0.14.20 startup and feedback are user-confirmed on PA1U/mioXM.

- Added `docs/STABILITY_CHECKLIST.md`: final toggle smoke test, full application/interface/network recovery, realistic endurance load and explicit Production promotion criteria for PA1U/mioXM Ethernet use.

- Candidate 0.14.20 feedback follow-up (2026-10-05): after confirming approximately three-second, error-free identity startup on PA1U and mioXM, the user confirmed Scene and preset behavior still works as expected. Scene applies to PA1U; mioXM has no Scene A/B. This completes the immediate startup/retained-feedback checks for the reported setup. Longer-session endurance, full Companion restart, interface power-cycle/network recovery, firmware/software version records and platform qualification remain outstanding. No Production promotion was requested.

- Candidate 0.14.20 mioXM startup result (2026-10-05): the user confirmed the same startup behavior as PA1U—approximately three seconds to TNG identity with no errors. The startup adjustment is now user-confirmed on both PA1U and mioXM. Exact firmware/software versions, repeated recovery/endurance and retained feedback checks on this build remain outstanding.

- Candidate 0.14.20 startup result (2026-10-05): the user reported TNG identity received in approximately three seconds total with no errors, compared with the timed approximately eight-second 0.14.19 startup that failed its first identity attempt. This confirms improved startup and no first-attempt error in the reported test; it does not prove the exact firmware cause or repeated/endurance recovery.

- Candidate 0.14.19 startup feedback (2026-10-05): the user reports the first TNG identity attempt almost always fails and the second succeeds. A stopwatch measurement put successful identity (`TNG identity received`) at approximately eight seconds total, after one failure in `identity_status`. This matches the five-second discovery timeout plus two-second retry pause and response time. The RTP MIDI session itself need not have failed; the observation concerns identity discovery.

- Candidate 0.14.20 starts initiator clock synchronization immediately after both RTP invitations are accepted, before notifying connected listeners. Regular-RTP monitoring then waits one second before its first TNG host-session request; the poll scheduler determines the exact send time. Previously that request was sent immediately, while synchronization normally waited for the next two-second transport timer. This ordering is a plausible cause of the first missed exchange, not a hardware-proven diagnosis. Actual timeouts still report failures and retain the five-second timeout/two-second retry pause. Normal preset/Scene monitoring and automatic settings are unchanged.

- On 2026-10-05, after PA1U testing, the user confirmed the same regular-RTP behavior on mioXM and said they tested it all. In context this covers concurrent Auracle Ethernet access, device-confirmed preset feedback/recall, startup and module-connection restart with feedback recovery. mioXM has no Scene A/B. Firmware/software versions, separate exact mioXM timings, mixer snapshots, interface power-cycle recovery, failover and endurance were not established.

- Candidate 0.14.19 makes regular-RTP discovery and monitoring automatic for PA1U, mioXM and Auto-detect Ethernet initiators. Old experimental flags are removed during upgrade, and the former live-monitoring toggle cannot disable this standard path. Explicit PlayAUDIO12/mioXL selections retain configuration-port behavior. An advanced Device status connection override supports configuration-port compatibility; its monitoring toggle and configuration ports are shown only for that path, with the Auracle contention warning scoped there. Ordinary MIDI channels/ports and controls are preserved. The automatic default and migration still need a final hardware smoke test.

- Candidate 0.14.18 PA1U module-connection restart (2026-10-05): with Auracle open and connected, the user restarted the module connection. Companion connected successfully in an estimated 10 seconds or less and reported `Regular RTP: live notifications registered`. This confirms module-connection restart and registration with concurrent Auracle access in the tested setup. It does not yet confirm post-restart Scene/preset changes, a full Companion application restart, interface power-cycle/network recovery, or endurance.

- Candidate 0.14.18 PA1U follow-up (2026-10-05): the user confirmed Scene feedback no longer flips back and subsequently confirmed Scene and preset loading still work. The previous preset-refresh accuracy observation was on 0.14.17. Startup on 0.14.18 was estimated at under 10 seconds. Restart/reconnect recovery, endurance, failover, mioXM and firmware/software version records remain outstanding; no Production promotion was requested.

- Candidate 0.14.18 PA1U startup result (2026-10-05): the user reported connection was much faster, probably less than 10 seconds, compared with the earlier approximately 36-second measurement. This is an estimate rather than a stopwatch measurement. Scene regression and retained preset accuracy checks on this build remain pending.

- Candidate 0.14.17 hardware feedback on 2026-10-05: the user confirmed Auracle-originated preset loads keep Companion accurate within a few seconds. Startup still took about 30–36 seconds. Device Scene A → B briefly updated Companion, then reverted to A while the device remained on B; repeating A → B and Companion-originated Scene recall reproduced it. The introduced periodic indexed Scene read can overwrite live feedback; there is no new packet capture proving the exact returned value. Candidate 0.14.18 limits that read to initial setup, gives live SceneNumber notifications precedence, and retains preset/name refreshes. Identity retry delay is shortened from 30 to two seconds after the five-second timeout. Hardware confirmation of the Scene fix and startup timing is pending.

- Recorded the PA1U startup measurement: live regular-RTP registration at approximately 36 seconds, consistent with discovery timeout and retry timing. No runtime change or new package was made for this observation.

- Implemented periodic device reads and device-confirmed preset feedback in Candidate 0.14.17; 57 tests and lint passed. Superseded intermediate packages 0.14.15 and 0.14.16 are preserved.

On 2026-10-05, Candidate 0.14.14 on PlayAUDIO1U supported simultaneous Ethernet connections: Auracle-originated Scene changes updated Companion live, and Companion-originated Scene changes updated Auracle immediately. Registration reported `Regular RTP: live notifications registered` after an initial discovery timeout and delayed connection. An Auracle preset change from 2 to 1 did not update Companion; Companion preset recalls still worked. No capture identifies why preset feedback was missed. Candidate 0.14.17 subsequently confirmed accurate Auracle-originated preset feedback within a few seconds; its periodic Scene polling regression is corrected in 0.14.18 pending hardware testing. Front-panel changes, failover, reconnect/endurance and mioXM remain unverified; firmware/software versions and exact startup delay were not reported.

- Added and packaged Candidate 0.14.14 with opt-in status monitoring through regular RTP, separate diagnostics and focused tests. PA1U registration and Auracle-originated Scene feedback over Ethernet were subsequently user-confirmed; broader validation remains pending.

- On 2026-10-05, the user confirmed that Auracle connected through USB port A while Companion feedback monitoring remained enabled over Ethernet, and both apps kept current Scene/preset state accurate simultaneously. This confirms accurate concurrent feedback for the tested setup without module changes. Individual change sources, restart/failover/endurance behavior, and installed module, firmware and Auracle versions were not separately reported.
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

- PA1U active Scene startup was falsely inferred from an audio-clock setting through 0.14.21. Corrected SceneNumber reads in 0.14.22 are now user-confirmed by the supplied restart regression test. Earlier qualification based on the audio-clock mapping remains withdrawn.

- PA1U and mioXM regular-RTP monitoring with concurrent Auracle access, preset feedback/recall, and module-connection restart are user-confirmed. PA1U Scene feedback is stable after the 0.14.18 fix and startup/restart is estimated at under 10 seconds. Full application restart, interface power-cycle recovery, endurance, failover and software/firmware version records remain outstanding.

- Full TNG routing, notifications, failover, meters, audio control, RTP configuration and audio-protection mapping are unfinished.
- Responder mode does not have a complete identity/configuration discovery path.
- Device/interface power-cycle recovery is covered by loopback simulation but still requires multi-day hardware validation.
- PlayAUDIO12, mioXL, legacy mio, USB MIDI, macOS and Windows are implemented or advertised to varying degrees but not release-validated.
- Optional configuration-port monitoring can still contend with Auracle over Ethernet; its warning remains in Advanced Settings for that compatibility path. Mixer snapshot range/reset and live tracking remain unqualified.
- Package prebuilds target 64-bit platforms; 32-bit Raspberry Pi is not supported.

## Next Steps

1. Follow `docs/STABILITY_CHECKLIST.md` on Candidate 0.14.22: verify diagnostic visibility/migration, then recovery and endurance on the actual Companion host with Auracle connected. Record firmware/software versions. Retained offline-model/mixer snapshot qualification remains separate.
2. Fix or explicitly limit responder mode, then test reconnect and lifecycle behavior.
3. Run multi-day three-device endurance testing and package tests on Pi ARM64, macOS and Windows.
4. Align public help claims, sanitize repository history/artifacts, run Bitfocus module checks and prepare the first tagged beta.
