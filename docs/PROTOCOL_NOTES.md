# Protocol notes

## Captured initial operational state queries

Auracle X traffic captured against mioXM and PlayAUDIO1U confirms these TNG reads:

- Data class `0x03`, parameter `0x01`: active preset number.
- Data class `0x03`, indexed parameter `0x02`: preset name.
- Data class `0x08`, indexed parameter `0x41`: active PlayAUDIO1U scene (`1` = A, `2` = B).

The module issues these reads once during discovery and then closes its configuration RTP-MIDI session. They are not polled continuously.

## Transport decision

SysEx over an operating-system MIDI endpoint is the primary control transport. It works over direct USB MIDI and over an already-established RTP-MIDI session. The module should not implement AppleMIDI session negotiation inside Companion: the device protocol's RTP settings configure sessions, while the actual MIDI transport is provided by CoreMIDI/Windows rtpMIDI/ALSA.

`@julusian/midi` was selected because Bitfocus's maintained Generic MIDI module uses it, it has Node 22 support, and Companion packaging can include its native prebuilds.

## Legacy (header `F0 00 01 73 7E`)

- Device ID: 14-bit product ID plus 32-bit serial encoded in five 7-bit bytes.
- 14-bit transaction ID; responses echo it.
- Command field: query/write flag at bit 13 plus 10-bit command ID.
- Checksum: 7-bit two's complement of all body bytes.
- Discovery uses PID/SNUM zero wildcards and command `0x01`.
- A device command list is the authoritative capability source.
- Failover value is hardware type 3 via `GetHardwareValue 0x84` / return-write `0x85`. It provides ARM, ALARM and four USB host health values.
- Meter values use `GetAudioPortMeterValue 0x3E`; 8192 is 0 dBFS and `20 log10(value/8192)` converts readings.
- Snapshots/scenes use `0x66-0x6E`; scene type is 127.

## TNG (header `F0 00 01 73 7D`)

TNG is not wire-compatible with legacy. It adds host/device session IDs, 28-bit transactions, message/data classes, typed data blocks, parameter definitions and notifications. Required adapter sequence:

1. Establish host session and cache returned session/device information.
2. Query parameter and command definitions; use definitions as capability detection.
3. Read constant parameters once, dynamic/read-write parameters on refresh, and register notification subscriptions for live state.
4. Map state by data class and argument set, including area/preset/scene IDs.
5. Use grouped writes only when atomic behavior is required, then honor ACK error detail.

Key TNG public fields include active preset/scene, failover arm/alarm and four USB-port status bytes, MIDI port routes/features, Ethernet/RTP fields, audio channel controls, meters, automation, system events, preset save/load, backup/restore and MIDI panic.

## Subscription architecture

The state store is transport-independent. Protocol adapters normalize replies/notifications into device state; Companion variables and feedbacks read only normalized state. Polling is the fallback. TNG notifications should replace high-frequency polling; legacy meters and failover remain rate-limited polls. Triggers will be emitted only on edge transitions (online/offline, alarm, active scene/host, session connection, protection event).
