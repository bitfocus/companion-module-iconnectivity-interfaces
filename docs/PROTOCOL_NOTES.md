# Protocol notes

## Transport

Network mode uses the pure-Node implementation in `src/network/apple-midi.ts` to negotiate AppleMIDI/RTP-MIDI directly over UDP. It supports initiator/responder session mechanics, independent local port pairs, synchronization/liveness and reconnect. No operating-system network-MIDI daemon is required. Local USB mode uses `@julusian/midi` and packaged native prebuilds.

The user RTP session carries ordinary MIDI and remains connected. From 0.14.19, PA1U/mioXM and Auto-detect initiators also use it for TNG identity and status by default. Explicit other models and an advanced compatibility override retain the configuration-port method (normally 5002/5003), which releases the TNG connection after initial reads unless compatibility monitoring is enabled.

Preset and Scene control is not a configuration-session write. It uses Program Change on channels saved in the device with Preset Selector: displayed preset/Scene numbers are one-based, while MIDI data bytes are zero-based.

### Auracle coexistence observation

On 2026-10-05, the user tested Auracle connected through USB port A with Companion feedback monitoring enabled over Ethernet, and explicitly confirmed that both apps kept current Scene/preset state accurate simultaneously. This confirms USB Auracle access can coexist with accurate Companion feedback through its retained configuration RTP connection in the tested setup, without module changes. It does not establish two-client access to the same Ethernet configuration endpoint.

The installed module, device firmware and Auracle versions and individual change sources were not separately reported. Follow-up validation should cover reconnects and restarts, and record changes from Auracle, the front panel and Companion individually. Automatic failover and endurance behavior remain unverified for this combined setup.

## TNG preset captures and corrected active Scene read

Hardware captures support the preset reads; the corrected active Scene read follows the official Rev. 1 specification:

- Data class `0x03`, parameter `0x01`: active preset number.
- Data class `0x03`, indexed parameter `0x02`: preset name.
- Data class `0x03`, parameter `0x04`: active PlayAUDIO1U Scene (`1` = A, `2` = B), implemented in 0.14.22; hardware startup verification pending.

These are read once during discovery, not continuously polled by default. Later module actions and matching Program Change traffic update cached state. Optional live monitoring registers the documented NotifyProgramSelector and NotifyFailoverStatus classes, keeps the configuration session alive with protocol ping messages, and updates normalized state from NotParmVal messages.

The earlier data class `0x08`/parameter `0x41` capture was misidentified as Scene state. Official Rev. 1 §5.8 identifies it as AudioInfo:AudioClockRestartValue (PDF page 107). Active Scene is DeviceFeature:SceneNumber in §5.3.1 (PDF pages 44–45), and NotifyFailoverStatus uses that same field. Treat earlier descriptions of the indexed read as historical mistakes.

PlayAUDIO mixer snapshot recall uses a separately configured Preset Selector Program Change channel. NotifyProgramSelector reports changes through AudioPortInfo (data class `0x09`), MixerSnapshotNumber parameter `0x50`. Mixer snapshot state is not queried during discovery because that read requires the authoritative mixer AudioPortID; it remains unknown until observed from MIDI, a module action or a device notification.

## Legacy (`F0 00 01 73 7E`)

- Address: 14-bit product ID and 32-bit serial encoded in five 7-bit bytes.
- Transaction: 14 bits; responses echo it.
- Command: query/write flag at bit 13 plus 10-bit command ID.
- Checksum: 7-bit two's complement of the body.
- Discovery: zero PID/serial wildcards with command `0x01`.
- The returned command list is the authoritative capability source.
- Failover uses hardware type 3 through `0x84/0x85` and includes arm, alarm and four host-health values.
- Audio meters use `0x3E`; 8192 is 0 dBFS.
- Snapshot/Scene commands occupy `0x66-0x6E`; Scene type is 127. These legacy configuration commands must not be assumed valid on TNG products.

## TNG (`F0 00 01 73 7D`)

TNG is not legacy-compatible. It adds sessions, 28-bit transactions, message/data classes, typed blocks, parameter definitions and notifications. The current production foundation implements framing, session identity and selected preset/Scene reads. Future controls must first query definitions, then use returned access/capability data rather than product-name assumptions.

Planned normalization flow: protocol response or notification → normalized device state → Companion variables/feedbacks/triggers. TNG notifications should replace high-rate polling; legacy polling remains rate-limited.

## Experimental regular-RTP monitoring

Candidate 0.14.14 adds an opt-in regular-RTP monitoring path. It sends TNG discovery, identity, sequential preset/name/Scene reads, notification registration and keepalive through the existing user RTP session. It never opens the configuration session in this mode and requires a different regular RTP port. Incoming TNG replies are separated from user MIDI counters and triggers. All experimental queries use the module's random TNG session ID; reconnect resets cached operational state and generates a new session ID to reject stale replies.

Registration is considered active only after a matching successful TNG Ack for SetCmdVal. Ack content is five bytes: message class, null data class, original host message class, original host data class, error code. Discovery and initial read timeouts are bounded at five seconds, with 30-second retries; notification registration times out after three seconds. PA1U registration and Auracle-originated Scene feedback have been user-confirmed; other regular-port behavior remains pending validation. See `ETHERNET_COEXISTENCE_TEST.md`.

### PA1U Ethernet hardware result

On 2026-10-05, the user confirmed PlayAUDIO1U Scene A/B changes made in Auracle over Ethernet update Companion live with experimental regular-RTP monitoring enabled. After an initial discovery timeout and delayed connection, `state_monitoring` reported `Regular RTP: live notifications registered`. This confirms registration and Auracle-originated Scene feedback for that setup. Preset number/name updates, front-panel changes, automatic failover, reconnect/endurance behavior and mioXM remain unverified for this path; firmware, Auracle and Companion versions and exact startup delay were not reported.

### PA1U preset discrepancy and Candidate 0.14.15

The user confirmed Companion-originated Scene recalls also updated Auracle immediately over Ethernet. An Auracle preset load from 2 to 1 did not update Companion on Candidate 0.14.14, while Companion-originated preset recalls still worked. No packet evidence establishes whether the preset notification was absent, changed shape, or was lost.

Candidate 0.14.15 reconciles preset number/name and Scene through sequential regular-RTP queries every three seconds when live monitoring is enabled. It preserves cached names during unchanged-preset refreshes, prevents overlapping refresh passes and backs off 30 seconds after a five-second read timeout. Detecting a changed preset renews notification registration after the read sequence. Default configuration-RTP monitoring is unchanged. The fix still requires PA1U hardware verification.

### Device-confirmed preset feedback in Candidate 0.14.16

In experimental regular-RTP mode, preset recalls and incoming Program Change commands no longer establish current preset state. Companion recalls clear the number/name to Unknown, cancel older reads and renew registration after device confirmation. TNG read replies are matched to outstanding transaction IDs; name replies also match the preset queried. Failed preset/name reads clear stale values. Live notifications and sequential three-second status refreshes remain the sources of preset feedback. This is implemented and simulated; PA1U confirmation remains pending. Candidate 0.14.15 was packaged before this stricter behavior was added and is retained as superseded history.

### Bounded notification name reads in Candidate 0.14.17

Preset notifications can trigger a name read between periodic refreshes. These reads now also arm the five-second timeout, so a missing name reply cannot leave a pending read blocking every subsequent refresh. All 57 automated tests pass; device response timing and accuracy still require the PA1U test. Candidate 0.14.16 is retained as superseded history.

On 2026-10-05, the user timed module startup on PA1U: `Regular RTP: no TNG identity reply; configuration port untouched` remained until approximately 36 seconds from startup, then changed to `Regular RTP: live notifications registered`. This closely matches the implemented five-second discovery timeout followed by a 30-second retry delay and subsequent status reads/registration. It supports retry success, but does not establish why the first exchange failed. Preset accuracy in Candidate 0.14.17 remains pending user confirmation.

Candidate 0.14.17 hardware feedback on 2026-10-05: the user confirmed Auracle-originated preset loads keep Companion accurate within a few seconds. Startup still took about 30–36 seconds. Device Scene A → B briefly updated Companion, then reverted to A while the device remained on B; repeating A → B and Companion-originated Scene recall reproduced it. The introduced periodic indexed Scene read can overwrite live feedback; there is no new packet capture proving the exact returned value. Candidate 0.14.18 limits that read to initial setup, gives live SceneNumber notifications precedence, and retains preset/name refreshes. Identity retry delay is shortened from 30 to two seconds after the five-second timeout. Hardware confirmation of the Scene fix and startup timing is pending.

Candidate 0.14.18 PA1U startup result (2026-10-05): the user reported connection was much faster, probably less than 10 seconds, compared with the earlier approximately 36-second measurement. This is an estimate rather than a stopwatch measurement. Scene regression and retained preset accuracy checks on this build remain pending.

Candidate 0.14.18 PA1U follow-up (2026-10-05): the user confirmed Scene feedback no longer flips back and subsequently confirmed Scene and preset loading still work. The previous preset-refresh accuracy observation was on 0.14.17. Startup on 0.14.18 was estimated at under 10 seconds. Restart/reconnect recovery, endurance, failover, mioXM and firmware/software version records remain outstanding; no Production promotion was requested.

Candidate 0.14.18 PA1U module-connection restart (2026-10-05): with Auracle open and connected, the user restarted the module connection. Companion connected successfully in an estimated 10 seconds or less and reported `Regular RTP: live notifications registered`. This confirms module-connection restart and registration with concurrent Auracle access in the tested setup. It does not yet confirm post-restart Scene/preset changes, a full Companion application restart, interface power-cycle/network recovery, or endurance.

## Automatic monitoring in Candidate 0.14.19

On 2026-10-05, after PA1U testing, the user confirmed the same regular-RTP behavior on mioXM and said they tested it all. In context this covers concurrent Auracle Ethernet access, device-confirmed preset feedback/recall, startup and module-connection restart with feedback recovery. mioXM has no Scene A/B. Firmware/software versions, separate exact mioXM timings, mixer snapshots, interface power-cycle recovery, failover and endurance were not established.

Candidate 0.14.19 makes regular-RTP discovery and monitoring automatic for PA1U, mioXM and Auto-detect Ethernet initiators. Old experimental flags are removed during upgrade, and the former live-monitoring toggle cannot disable this standard path. Explicit PlayAUDIO12/mioXL selections retain configuration-port behavior. An advanced Device status connection override supports configuration-port compatibility; its monitoring toggle and configuration ports are shown only for that path, with the Auracle contention warning scoped there. Ordinary MIDI channels/ports and controls are preserved. The automatic default and migration still need a final hardware smoke test.

Candidate 0.14.19 startup feedback (2026-10-05): the user reports the first TNG identity attempt almost always fails and the second succeeds. A stopwatch measurement put successful identity (`TNG identity received`) at approximately eight seconds total, after one failure in `identity_status`. This matches the five-second discovery timeout plus two-second retry pause and response time. The RTP MIDI session itself need not have failed; the observation concerns identity discovery.

Candidate 0.14.20 starts initiator clock synchronization immediately after both RTP invitations are accepted, before notifying connected listeners. Regular-RTP monitoring then waits one second before its first TNG host-session request; the poll scheduler determines the exact send time. Previously that request was sent immediately, while synchronization normally waited for the next two-second transport timer. This ordering is a plausible cause of the first missed exchange, not a hardware-proven diagnosis. Actual timeouts still report failures and retain the five-second timeout/two-second retry pause. Normal preset/Scene monitoring and automatic settings are unchanged.

Candidate 0.14.20 startup result (2026-10-05): the user reported TNG identity received in approximately three seconds total with no errors, compared with the timed approximately eight-second 0.14.19 startup that failed its first identity attempt. This confirms improved startup and no first-attempt error in the reported test; it does not prove the exact firmware cause or repeated/endurance recovery.

Candidate 0.14.20 mioXM startup result (2026-10-05): the user confirmed the same startup behavior as PA1U—approximately three seconds to TNG identity with no errors. The startup adjustment is now user-confirmed on both PA1U and mioXM. Exact firmware/software versions, repeated recovery/endurance and retained feedback checks on this build remain outstanding.

Candidate 0.14.20 feedback follow-up (2026-10-05): after confirming approximately three-second, error-free identity startup on PA1U and mioXM, the user confirmed Scene and preset behavior still works as expected. Scene applies to PA1U; mioXM has no Scene A/B. This completes the immediate startup/retained-feedback checks for the reported setup. Longer-session endurance, full Companion restart, interface power-cycle/network recovery, firmware/software version records and platform qualification remain outstanding. No Production promotion was requested.

## Corrected Scene startup in Candidate 0.14.22

Candidate 0.14.21 restart bug reported 2026-10-05: the user set PA1U Scene B in Auracle, toggled the module off/on, and Companion initialized to A while the unit stayed on B. Rechecking the official TNG Rev. 1 specification established that the old query (data class 0x08, parameter 0x41) reads AudioInfo:AudioClockRestartValue, not active Scene. Earlier capture interpretation and initial-Scene hardware-validation claims were incorrect. The 0.14.18 suppression fixed live overwrites but left this incorrect startup read.

Candidate 0.14.22 replaces the old query with GetParmVal for DeviceFeature (data class 0x03), SceneNumber (parameter 0x04), without arguments (the current work area). The documented response and live notifications share this same active-Scene field. Initial reads are transaction-matched, ignore the old audio-clock value, and retain newer live notifications when a startup reply is delayed. Missing/invalid Scene replies leave Unknown. The new query also applies to the configuration-port compatibility path. Preset refresh, startup synchronization and diagnostics behavior remain as in 0.14.21. Actual PA1U B-at-restart confirmation is pending.

Source: [official TNG Rev. 1](https://cdn.iconnectivity.com/docs/Common_System_Exclusive_Commands_TNG.pdf), re-read through the vendor Downloads page on 2026-10-05: §5.3.1 and §5.8. The Scene query content is `[0x03, 0x03, 0x01, 0x04, 0x01, 0x01, 0x04]`. It reads state only; no audio-clock or Scene-setting write is sent.

Candidate 0.14.22 PA1U Scene startup verification (2026-10-05): following the supplied B-in-Auracle/module off-on regression test, the user reported testing and confirmed it works. This confirms the corrected active-Scene startup path for the reported setup. Individual A/B repetitions, full Companion restart and other live-change checks were not itemized separately. Wider recovery/endurance qualification and explicit Production promotion remain outstanding.

## Scene reconcile read (Candidate 0.15.2)

0.14.18 limited Scene reads to setup because periodic reads flipped Scene back to A. 0.14.22 showed those reads targeted AudioInfo:AudioClockRestartValue (0x08/0x41), not Scene. With the corrected DeviceFeature:SceneNumber read (0x03/0x04), 0.15.2 restores a bounded reconcile read in regular-RTP mode: when nothing has been heard about Scene for 15 seconds (no notification, Companion recall or Scene-channel Program Change, and no earlier read), the next status refresh re-reads SceneNumber once. Each change source increments a sequence counter; a read reply applies only if it matches the outstanding read transaction and no change happened after it was sent, so live notifications and recalls always win. A correction logs a warning. This adds at most one small request per 15 seconds. Implemented and simulated; PA1U hardware confirmation is pending.
