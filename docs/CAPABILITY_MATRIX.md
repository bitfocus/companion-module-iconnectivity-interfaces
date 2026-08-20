# Capability matrix

Legend: **V1** implemented; **D** publicly documented and planned; **R** requires hardware interoperability validation; **N/A** not applicable; **No public field** not found in the public specifications.

| Capability                    | PlayAUDIO12 (PID 11, legacy)              | PlayAUDIO1U (PID 17, TNG)                                                                       | mioXL/XM (PID 14/15, TNG)         | mio10/mio4/mio2/mio (legacy)   |
| ----------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| Discovery/identity/firmware   | **V1**                                    | **D** session + DeviceInfo                                                                      | **D** session + DeviceInfo        | **V1**                         |
| Online/liveness               | **V1** polling                            | **D** session/notifications                                                                     | **D** session/notifications       | **V1** polling                 |
| MIDI port inventory/names     | **D**                                     | **D**                                                                                           | **D**                             | **D**                          |
| MIDI routing                  | **D** route bitmaps                       | **D** MIDIPortInfo                                                                              | **D** MIDIPortInfo                | **D** route bitmaps            |
| MIDI filters/remap/AMP        | **D**                                     | **D**                                                                                           | **D**                             | **D**, device dependent        |
| USB host presence/reservation | **D** hosted-device detail                | **D** HardwareInfo                                                                              | **D** HardwareInfo                | **D**, host-equipped models    |
| RTP-MIDI sessions/state       | **D** connection detail/parameters        | **D**                                                                                           | **D**                             | **D** mio10/mio4; N/A mio2/mio |
| IP/MAC/Bonjour                | **D** EthernetPortInfo                    | **D** HardwareInfo                                                                              | **D** HardwareInfo                | device dependent               |
| Preset read/load/save/names   | **D**, save has hardware caveat           | **D**                                                                                           | **D** (up to device-reported max) | **D**                          |
| Scene A/B state/control       | **V1** recall; active inferred from alarm | **D** explicit SceneNumber                                                                      | N/A                               | N/A                            |
| Failover arm/alarm/control    | **V1**                                    | **D** DeviceFeature 0x10/0x11                                                                   | N/A                               | N/A                            |
| Host A/B audio + MIDI health  | **V1** status 0-3                         | **D** FailoverUSBPortStatus                                                                     | N/A                               | N/A                            |
| Output level/mute             | **D** audio/mixer control                 | **D** AudioChannelInfo/automation                                                               | N/A                               | N/A                            |
| Audio meters                  | **V1** configurable output port           | **D** audio channel metering fields                                                             | N/A                               | N/A                            |
| Audio protection              | N/A                                       | **R** user-visible and TNG system events; exact public status/control mapping must be confirmed | N/A                               | N/A                            |
| Control/footswitch ports      | **D**, limited hardware semantics         | **D** read/write/actions                                                                        | N/A                               | device dependent               |
| MIDI activity                 | **R** infer from port monitor/traffic     | **D/R** monitor notifications                                                                   | **D/R** monitor notifications     | **R**                          |

## Important boundary

Auracle X supports level, mute, stereo/mono, headphone mix, pan, solo, failover settings, routing, filter/remap, presets, RTP-MIDI, USB host reservation and control ports. Most are represented publicly, but exact capability is returned by each device/firmware. The module must probe definitions/command lists and never assume every field exists on every product.

Audio protection is marketed and displayed by PlayAUDIO1U, but the public TNG document does not label a single universal `AudioProtectionStatus` parameter. Implement only after mapping the relevant AudioInfo/system-event flags on real hardware; until then it is research, not promised support.
