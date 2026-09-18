# Protocol notes

## Transport

Network mode uses the pure-Node implementation in `src/network/apple-midi.ts` to negotiate AppleMIDI/RTP-MIDI directly over UDP. It supports initiator/responder session mechanics, independent local port pairs, synchronization/liveness and reconnect. No operating-system network-MIDI daemon is required. Local USB mode uses `@julusian/midi` and packaged native prebuilds.

The user RTP session carries ordinary MIDI and remains connected. TNG identity/state uses a second initiator session to the device configuration port (normally 5002/5003); the module releases it after initial reads so Auracle can connect.

Preset and Scene control is not a configuration-session write. It uses Program Change on channels saved in the device with Preset Selector: displayed preset/Scene numbers are one-based, while MIDI data bytes are zero-based.

## Captured TNG initial reads

Hardware captures against mioXM and PlayAUDIO1U confirm:

- Data class `0x03`, parameter `0x01`: active preset number.
- Data class `0x03`, indexed parameter `0x02`: preset name.
- Data class `0x08`, indexed parameter `0x41`: active PlayAUDIO1U Scene (`1` = A, `2` = B).

These are read once during discovery, not continuously polled by default. Later module actions and matching Program Change traffic update cached state. Optional live monitoring registers the documented NotifyProgramSelector and NotifyFailoverStatus classes, keeps the configuration session alive with protocol ping messages, and updates normalized state from NotParmVal messages.

The captured one-time PlayAUDIO1U Scene reply uses DeviceFeature parameter `0x41` with its required argument, while documented NotifyFailoverStatus messages report DeviceFeature:SceneNumber as parameter `0x04`. Both normalize to the same Companion Scene state.

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
