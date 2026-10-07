# Capability matrix

Legend: **H** hardware-validated locally; **I** implemented but needs release validation; **P** publicly documented/planned; **N/A** not applicable. An action is not public-ready until both implemented and capability-gated.

| Capability                          | PlayAUDIO1U (TNG)           | mioXM (TNG)                 | PlayAUDIO12 (legacy)        | Other advertised devices           |
| ----------------------------------- | --------------------------- | --------------------------- | --------------------------- | ---------------------------------- |
| Ethernet RTP initiator + reconnect  | **H**                       | **H**                       | **I**                       | **I**                              |
| RTP responder                       | **I**, discovery incomplete | **I**, discovery incomplete | **I**, discovery incomplete | **I**, discovery incomplete        |
| USB MIDI transport                  | **I**                       | **I**                       | **I**                       | **I**                              |
| Identity/name/serial/firmware       | **H**                       | **H**                       | **I**                       | **I** legacy; mioXL TNG **I**      |
| Online/user-session health          | **H**                       | **H**                       | **I**                       | **I**                              |
| User MIDI send/receive + triggers   | **H**                       | **H**                       | **I**                       | **I**                              |
| MIDI Clock receive/BPM              | **H** transport path        | **H** transport path        | **I**                       | **I**                              |
| Active preset/name initial read     | **H**                       | **H**                       | **P**                       | mioXL **I**; legacy **P**          |
| Preset recall by Program Change     | **H**                       | **H**                       | **I**                       | **I** when device is preconfigured |
| Active Scene initial read           | **H**                       | N/A                         | **P**                       | N/A                                |
| Live preset/Scene notifications     | **H**                       | **I** preset only           | N/A                         | mioXL **I** preset only            |
| Mixer snapshot recall/notification  | **I**                       | N/A                         | **P**                       | device dependent                   |
| Current preset feedback/buttons     | **I**                       | **I**                       | **I**                       | **I** when presets are supported   |
| TNG state refresh action            | **I** regular RTP           | **I** regular RTP           | N/A                         | mioXL **I**                        |
| Scene A/B Program Change recall     | **H**                       | N/A                         | **I**                       | N/A                                |
| Failover/host health                | **P**                       | N/A                         | **I**                       | N/A                                |
| Audio meters                        | **P**                       | N/A                         | **I**                       | device dependent                   |
| Output level/mute                   | **P**                       | N/A                         | **P**                       | device dependent                   |
| MIDI port inventory/routing         | **P**                       | **P**                       | **P**                       | **P**, device dependent            |
| RTP session inventory/configuration | **P**                       | **P**                       | **P**                       | device dependent                   |
| Audio protection                    | research only               | N/A                         | N/A                         | N/A                                |

## Boundaries

- Current `src/devices.ts` profiles are provisional but intentionally conservative: unverified PlayAUDIO1U failover and meter controls are not exposed. Device definitions must gate future TNG controls.
- Auracle behavior shows useful product features but is not proof of a public control field. Use the specifications in `SOURCES.md` and hardware responses.
- PlayAUDIO1U audio protection has no confirmed single public status/control mapping; do not promise or implement it without documented hardware evidence.

## Regular-RTP monitoring evidence

Candidate 0.14.14: on 2026-10-05, the user confirmed successful regular-RTP notification registration on PlayAUDIO1U and live Scene A/B updates in Companion when changing Scenes in Auracle over Ethernet. Initial discovery timed out before eventual success. This validates that specific coexistence path; it does not extend the existing **H** preset/Scene row to regular-RTP preset/name updates, front-panel changes, failover or reconnect/endurance behavior. Those tests and mioXM regular-RTP support remain pending. Firmware/software versions were not reported.

Companion-originated Scene changes were also confirmed to update Auracle immediately on the same PA1U Ethernet setup. Auracle preset 2 → 1 was missed on 0.14.14; device-confirmed preset feedback and periodic reads in 0.14.17 await hardware testing.

Candidate 0.14.17 hardware feedback on 2026-10-05: the user confirmed Auracle-originated preset loads keep Companion accurate within a few seconds. Startup still took about 30–36 seconds. Device Scene A → B briefly updated Companion, then reverted to A while the device remained on B; repeating A → B and Companion-originated Scene recall reproduced it. The introduced periodic indexed Scene read can overwrite live feedback; there is no new packet capture proving the exact returned value. Candidate 0.14.18 limits that read to initial setup, gives live SceneNumber notifications precedence, and retains preset/name refreshes. Identity retry delay is shortened from 30 to two seconds after the five-second timeout. Hardware confirmation of the Scene fix and startup timing is pending.

Candidate 0.14.18 PA1U follow-up (2026-10-05): the user confirmed Scene feedback no longer flips back and subsequently confirmed Scene and preset loading still work. The previous preset-refresh accuracy observation was on 0.14.17. Startup on 0.14.18 was estimated at under 10 seconds. Restart/reconnect recovery, endurance, failover, mioXM and firmware/software version records remain outstanding; no Production promotion was requested.

Candidate 0.14.18 PA1U module-connection restart (2026-10-05): with Auracle open and connected, the user restarted the module connection. Companion connected successfully in an estimated 10 seconds or less and reported `Regular RTP: live notifications registered`. This confirms module-connection restart and registration with concurrent Auracle access in the tested setup. It does not yet confirm post-restart Scene/preset changes, a full Companion application restart, interface power-cycle/network recovery, or endurance.

On 2026-10-05, after PA1U testing, the user confirmed the same regular-RTP behavior on mioXM and said they tested it all. In context this covers concurrent Auracle Ethernet access, device-confirmed preset feedback/recall, startup and module-connection restart with feedback recovery. mioXM has no Scene A/B. Firmware/software versions, separate exact mioXM timings, mixer snapshots, interface power-cycle recovery, failover and endurance were not established.

Candidate 0.14.19 makes this the normal PA1U/mioXM initiator path; its default/migration smoke test remains pending. Existing **H** entries do not establish mixer snapshot, failover or endurance qualification.

Candidate 0.14.20 mioXM startup result (2026-10-05): the user confirmed the same startup behavior as PA1U—approximately three seconds to TNG identity with no errors. The startup adjustment is now user-confirmed on both PA1U and mioXM. Exact firmware/software versions, repeated recovery/endurance and retained feedback checks on this build remain outstanding.

Candidate 0.14.20 feedback follow-up (2026-10-05): after confirming approximately three-second, error-free identity startup on PA1U and mioXM, the user confirmed Scene and preset behavior still works as expected. Scene applies to PA1U; mioXM has no Scene A/B. This completes the immediate startup/retained-feedback checks for the reported setup. Longer-session endurance, full Companion restart, interface power-cycle/network recovery, firmware/software version records and platform qualification remain outstanding. No Production promotion was requested.

Candidate 0.14.21 restart bug reported 2026-10-05: the user set PA1U Scene B in Auracle, toggled the module off/on, and Companion initialized to A while the unit stayed on B. Rechecking the official TNG Rev. 1 specification established that the old query (data class 0x08, parameter 0x41) reads AudioInfo:AudioClockRestartValue, not active Scene. Earlier capture interpretation and initial-Scene hardware-validation claims were incorrect. The 0.14.18 suppression fixed live overwrites but left this incorrect startup read.

The corrected 0.14.22 active Scene query is implemented but awaits PA1U B-at-startup hardware verification; the initial-read row is downgraded to **I**. Live Scene notification and recall validation remains separate.

Candidate 0.14.22 PA1U Scene startup verification (2026-10-05): following the supplied B-in-Auracle/module off-on regression test, the user reported testing and confirmed it works. This confirms the corrected active-Scene startup path for the reported setup. Individual A/B repetitions, full Companion restart and other live-change checks were not itemized separately. Wider recovery/endurance qualification and explicit Production promotion remain outstanding.
