# Auracle and Companion over Ethernet: Candidate 0.14.22

Regular-RTP monitoring is now automatic for PA1U/mioXM and Auto-detect Ethernet initiators. Concurrent Auracle access and feedback were user-confirmed on 0.14.18 for both supported devices. This Candidate verifies the simpler defaults and saved-configuration migration. 0.14.22 was promoted to Production on 2026-10-07.

## Setup

1. Import `releases/iconnectivity-interfaces-v0.14.22-CANDIDATE.tgz` and confirm the loaded version is 0.14.22.
2. Use RTP MIDI as Initiator, the device IP and its regular Interface RTP Port, normally 5004. Keep the configuration port distinct, normally 5002.
3. Choose PlayAUDIO1U, mioXM or Auto-detect. Monitoring is automatic; neither of the old experimental/monitoring checkboxes is required. Keep the advanced Device status connection on Automatic.
4. Connect Auracle through Ethernet and inspect `state_monitoring` and the module log.
5. Verify an upgraded existing connection and a new connection: actual preset number/name changes from Auracle, Scene changes on PA1U from all sources, and module-connection restart with Auracle connected. Leave Scene B selected for at least 15 seconds.

Do this outside a service because recalling Scenes and presets can change audio and routing. Keep the previous tested package available for rollback.

## What the result means

- **Regular RTP: live notifications registered**: the regular port answered identity and status reads, and the device acknowledged notification registration. Proceed to the live change tests below; registration alone does not prove updates remain accurate.
- **Regular RTP: no TNG identity reply; configuration port untouched**: the regular port did not complete TNG discovery within five seconds. User MIDI stays connected; the module waits two seconds before retrying. Companion does not fall back to Auracle's configuration port.
- **Regular RTP: status read timed out (...)**: identity worked, but one of preset number, preset name or Scene did not finish. The log identifies the missing read. Initial reads are retried after 30 seconds.
- **Regular RTP: notification registration rejected (error N)** or **... registration timed out**: initial reads worked, but live notification registration failed. Values cannot be treated as live feedback.
- **Device did not report live notification support**: the device did not advertise either requested notification class.

The normal RTP connection's online status only describes the MIDI connection. It does not prove Scene/preset monitoring works. Regular-RTP preset feedback requires device replies. Scene commands still update cached Scene values, so also test Scene changes from other sources.

## Candidate 0.14.18 regression test

Candidate 0.14.14 successfully handled Scenes in both directions over Ethernet on PA1U, but an Auracle preset change from 2 to 1 did not update Companion; Companion-originated preset recall still worked. Candidate 0.14.17 adds sequential status reads every three seconds while live monitoring is enabled. This is a bounded reconciliation path for missing notifications, not a proven diagnosis of the original missing event.

In this build, preset feedback in experimental regular-RTP mode comes from TNG device replies, not sent commands or incoming Program Changes. A Companion recall shows Unknown until device confirmation; failed preset/name reads clear stale values.

Keep the same two settings enabled and both apps connected over Ethernet. Change preset 2 to 1 in Auracle and allow about three seconds plus device response time (normally within five seconds). Confirm Companion updates the number and name. Repeat in both directions, then check Scene changes still update both apps. If preset feedback fails, record `state_monitoring`, the module log and whether Scene updates still work after the preset load.

## Live change tests

With Auracle connected over Ethernet throughout:

1. Change Scene A/B on the front panel. Confirm Auracle and Companion both show the actual Scene.
2. Change Scene A/B in Auracle. Confirm the hardware and Companion follow.
3. Change presets from the front panel and Auracle. Confirm preset number and name in Companion.
4. Recall a Scene and preset from Companion. Confirm hardware and Auracle follow.
5. Leave both connected for at least a minute, then repeat changes to exercise notification keepalive.
6. Only after those pass, restart Companion and reopen Auracle in both orders. Confirm discovery and live updates recover. Test automatic failover separately on a safe rig.

Record the device model/firmware, Auracle version, Companion version, module version, regular RTP port, `state_monitoring` result, and which change sources passed. If the test fails, send the status text and relevant module logs; no raw capture is needed initially.

## Rollback

Disable the experimental option to restore the existing configuration-port discovery/monitoring path. For the already confirmed simultaneous setup, use Auracle through USB port A while Companion monitors over Ethernet. Two clients using the same Ethernet configuration endpoint remain unverified.

## Observed result

On 2026-10-05, Candidate 0.14.14 on PlayAUDIO1U supported simultaneous Ethernet connections: Auracle-originated Scene changes updated Companion live, and Companion-originated Scene changes updated Auracle immediately. Registration reported `Regular RTP: live notifications registered` after an initial discovery timeout and delayed connection. An Auracle preset change from 2 to 1 did not update Companion; Companion preset recalls still worked. No capture identifies why preset feedback was missed. Candidate 0.14.17 addresses this with device-confirmed preset feedback and periodic reads; hardware confirmation is pending. Front-panel changes, failover, reconnect/endurance and mioXM remain unverified; firmware/software versions and exact startup delay were not reported.

On 2026-10-05, the user timed module startup on PA1U: `Regular RTP: no TNG identity reply; configuration port untouched` remained until approximately 36 seconds from startup, then changed to `Regular RTP: live notifications registered`. This closely matches the implemented five-second discovery timeout followed by a 30-second retry delay and subsequent status reads/registration. It supports retry success, but does not establish why the first exchange failed. Preset accuracy in Candidate 0.14.17 remains pending user confirmation.

Candidate 0.14.17 hardware feedback on 2026-10-05: the user confirmed Auracle-originated preset loads keep Companion accurate within a few seconds. Startup still took about 30–36 seconds. Device Scene A → B briefly updated Companion, then reverted to A while the device remained on B; repeating A → B and Companion-originated Scene recall reproduced it. The introduced periodic indexed Scene read can overwrite live feedback; there is no new packet capture proving the exact returned value. Candidate 0.14.18 limits that read to initial setup, gives live SceneNumber notifications precedence, and retains preset/name refreshes. Identity retry delay is shortened from 30 to two seconds after the five-second timeout. Hardware confirmation of the Scene fix and startup timing is pending.

Install 0.14.18 with the existing settings. Switch A → B on the device, in Auracle and in Companion, including quick successive changes; leave B selected for at least 15 seconds and confirm Companion stays on B. Confirm preset changes still update number/name within a few seconds. Restart the module and time registration; the shorter retry delay is not a guaranteed connection time.

Candidate 0.14.18 PA1U startup result (2026-10-05): the user reported connection was much faster, probably less than 10 seconds, compared with the earlier approximately 36-second measurement. This is an estimate rather than a stopwatch measurement. Scene regression and retained preset accuracy checks on this build remain pending.

Candidate 0.14.18 PA1U follow-up (2026-10-05): the user confirmed Scene feedback no longer flips back and subsequently confirmed Scene and preset loading still work. The previous preset-refresh accuracy observation was on 0.14.17. Startup on 0.14.18 was estimated at under 10 seconds. Restart/reconnect recovery, endurance, failover, mioXM and firmware/software version records remain outstanding; no Production promotion was requested.

Candidate 0.14.18 PA1U module-connection restart (2026-10-05): with Auracle open and connected, the user restarted the module connection. Companion connected successfully in an estimated 10 seconds or less and reported `Regular RTP: live notifications registered`. This confirms module-connection restart and registration with concurrent Auracle access in the tested setup. It does not yet confirm post-restart Scene/preset changes, a full Companion application restart, interface power-cycle/network recovery, or endurance.

On 2026-10-05, after PA1U testing, the user confirmed the same regular-RTP behavior on mioXM and said they tested it all. In context this covers concurrent Auracle Ethernet access, device-confirmed preset feedback/recall, startup and module-connection restart with feedback recovery. mioXM has no Scene A/B. Firmware/software versions, separate exact mioXM timings, mixer snapshots, interface power-cycle recovery, failover and endurance were not established.

Candidate 0.14.19 makes regular-RTP discovery and monitoring automatic for PA1U, mioXM and Auto-detect Ethernet initiators. Old experimental flags are removed during upgrade, and the former live-monitoring toggle cannot disable this standard path. Explicit PlayAUDIO12/mioXL selections retain configuration-port behavior. An advanced Device status connection override supports configuration-port compatibility; its monitoring toggle and configuration ports are shown only for that path, with the Auracle contention warning scoped there. Ordinary MIDI channels/ports and controls are preserved. The automatic default and migration still need a final hardware smoke test.

Candidate 0.14.19 startup feedback (2026-10-05): the user reports the first TNG identity attempt almost always fails and the second succeeds. A stopwatch measurement put successful identity (`TNG identity received`) at approximately eight seconds total, after one failure in `identity_status`. This matches the five-second discovery timeout plus two-second retry pause and response time. The RTP MIDI session itself need not have failed; the observation concerns identity discovery.

Candidate 0.14.20 starts initiator clock synchronization immediately after both RTP invitations are accepted, before notifying connected listeners. Regular-RTP monitoring then waits one second before its first TNG host-session request; the poll scheduler determines the exact send time. Previously that request was sent immediately, while synchronization normally waited for the next two-second transport timer. This ordering is a plausible cause of the first missed exchange, not a hardware-proven diagnosis. Actual timeouts still report failures and retain the five-second timeout/two-second retry pause. Normal preset/Scene monitoring and automatic settings are unchanged.

For 0.14.20, restart the module connection several times with Auracle connected. Time from restart to `TNG identity received` and then live registration; record whether a first-attempt timeout still occurs. Compare with the timed eight-second 0.14.19 baseline. Confirm preset/Scene feedback remains accurate after startup.

Candidate 0.14.20 startup result (2026-10-05): the user reported TNG identity received in approximately three seconds total with no errors, compared with the timed approximately eight-second 0.14.19 startup that failed its first identity attempt. This confirms improved startup and no first-attempt error in the reported test; it does not prove the exact firmware cause or repeated/endurance recovery.

Candidate 0.14.20 mioXM startup result (2026-10-05): the user confirmed the same startup behavior as PA1U—approximately three seconds to TNG identity with no errors. The startup adjustment is now user-confirmed on both PA1U and mioXM. Exact firmware/software versions, repeated recovery/endurance and retained feedback checks on this build remain outstanding.

Candidate 0.14.20 feedback follow-up (2026-10-05): after confirming approximately three-second, error-free identity startup on PA1U and mioXM, the user confirmed Scene and preset behavior still works as expected. Scene applies to PA1U; mioXM has no Scene A/B. This completes the immediate startup/retained-feedback checks for the reported setup. Longer-session endurance, full Companion restart, interface power-cycle/network recovery, firmware/software version records and platform qualification remain outstanding. No Production promotion was requested.

Candidate 0.14.21 (2026-10-05) adds Show diagnostic variables under Advanced Settings. New connections default off; a dedicated upgrade enables diagnostics on existing connections that lack the setting, preserving references. Hidden variables include internal command/response counts/raw messages, MIDI traffic/queue counters, RTP details, product/protocol/capability details, acknowledgements and Clock pulse counts/timestamps. Operational state, identity/monitoring status, MIDI triggers and Clock BPM remain visible. All publication paths filter hidden diagnostics while monitoring continues. The toggle/upgrade requires a hardware UI check; the underlying 0.14.20 startup and feedback are user-confirmed on PA1U/mioXM.

For final stability qualification, follow `STABILITY_CHECKLIST.md`.

Candidate 0.14.21 restart bug reported 2026-10-05: the user set PA1U Scene B in Auracle, toggled the module off/on, and Companion initialized to A while the unit stayed on B. Rechecking the official TNG Rev. 1 specification established that the old query (data class 0x08, parameter 0x41) reads AudioInfo:AudioClockRestartValue, not active Scene. Earlier capture interpretation and initial-Scene hardware-validation claims were incorrect. The 0.14.18 suppression fixed live overwrites but left this incorrect startup read.

Candidate 0.14.22 replaces the old query with GetParmVal for DeviceFeature (data class 0x03), SceneNumber (parameter 0x04), without arguments (the current work area). The documented response and live notifications share this same active-Scene field. Initial reads are transaction-matched, ignore the old audio-clock value, and retain newer live notifications when a startup reply is delayed. Missing/invalid Scene replies leave Unknown. The new query also applies to the configuration-port compatibility path. Preset refresh, startup synchronization and diagnostics behavior remain as in 0.14.21. Actual PA1U B-at-restart confirmation is pending.

0.14.22 hardware test: set PA1U Scene B in Auracle and leave the device on B. Toggle the module off/on without changing the device Scene. Confirm `current_scene` initializes to B after discovery. Repeat with A, then repeat B across a module restart and full Companion restart. Change Scenes live afterward and verify no rollback. Check preset feedback and concurrent Auracle access still work.

Candidate 0.14.22 PA1U Scene startup verification (2026-10-05): following the supplied B-in-Auracle/module off-on regression test, the user reported testing and confirmed it works. This confirms the corrected active-Scene startup path for the reported setup. Individual A/B repetitions, full Companion restart and other live-change checks were not itemized separately. Wider recovery/endurance qualification and explicit Production promotion remain outstanding.
