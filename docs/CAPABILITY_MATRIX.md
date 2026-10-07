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
| TNG state refresh action            | **I**                       | **I**                       | N/A                         | mioXL **I**                        |
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
