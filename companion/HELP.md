## iConnectivity Interfaces

### Connection settings

Choose **Network — Ethernet RTP-MIDI** when Companion is not physically connected to the interface. Use a fixed or DHCP-reserved interface address.

Choose **Local — USB MIDI** only when the interface is physically connected to the Companion computer. Network-only configurations do not depend on the availability or validity of local USB MIDI port names.

Choose who starts the RTP-MIDI connection. **Companion connects to interface** is the normal setup: enter the interface RTP control port shown in Auracle. **Interface connects to Companion** requires a fixed, even Companion control port; configure the interface RTP-MIDI session to connect to the Companion computer's IP address on that port.

Select the interface model used by this connection to keep its model-specific actions, feedbacks, variables and presets available while the interface is offline. **Auto-detect** preserves the older behavior and waits for a successful connection before exposing those controls. If the selected model does not match the detected interface, Companion reports a configuration error and blocks model-specific commands.

The preset recall channel applies to devices configured for Preset Selector recall. The PlayAUDIO Scene A/B and mixer snapshot channels are optional: leave either at `0` whenever that selector is not configured on the device.

For an Ethernet installation, select **Ethernet (RTP-MIDI)** and leave Companion as **Initiator**. Enter the interface IP address and the control port for the user RTP-MIDI port you want Companion to send and receive through. Companion briefly opens the interface's dedicated Auracle configuration session on 5002/5003 for identity and initial state, then releases it on TNG devices so Auracle can connect.

The RTP-MIDI session name is shown to the interface and other RTP-MIDI software. Device-incompatible punctuation is converted to safe ASCII automatically.

The module discovers the device and exposes only state supported by its protocol family. PlayAUDIO12 supports the implemented legacy failover, scenes and audio meters. PlayAUDIO1U and mio X-series devices use TNG; their adapter is under active development and is clearly marked in the project capability matrix.

Variable definitions are rebuilt after identity discovery. All devices expose identity, connection, capability and user-MIDI variables. mioXM hides audio meter, audio protection, host and failover variables. PlayAUDIO1U exposes those applicable audio/failover groups and twelve output-meter variables. PlayAUDIO12 receives the corresponding legacy groups when detected. When reconnecting or changing devices, the module first returns to the common variable set so values from the previous interface cannot leak into the new one.

TNG identity discovery is supported for mioXM, mioXL and PlayAUDIO1U. The module establishes a documented TNG host session, then reads product, manufacturer, model, serial, firmware, hardware version and configured device name. The Identity discovery status variable reports each stage when troubleshooting routing or firmware compatibility.

For TNG devices, the dedicated 5002/5003 configuration session is released immediately after identity is read unless **Monitor device preset/Scene/mixer changes** is enabled. Live monitoring registers for device notifications and retains the configuration session so front-panel and other-session changes update Companion immediately. Because many devices allow only one configuration client, Auracle X may be unable to connect while live monitoring is enabled. The selected user RTP-MIDI session remains connected for MIDI and online health. PlayAUDIO12 retains its legacy configuration connection because its implemented status features require polling.

Auracle X may need to be closed for the few seconds during initial identity discovery because many devices allow only one configuration client. Once the module reports the device identity, it releases that connection and Auracle can be reopened. If several Companion instances target the same interface, they discover sequentially as the configuration endpoint becomes available; they do not intentionally retain it afterward.

The network session can send and receive ordinary MIDI immediately. Incoming variables describe traffic observed on this RTP session; they do not claim to represent traffic between other device ports unless those ports are routed or monitored to the Companion session.

User MIDI is exposed as separate type, channel, number, value, note-name, raw, summary and timestamp variables for both directions. Internal iConnectivity discovery and status SysEx has separate counters and last-message variables, so polling never overwrites the most recent user MIDI event.

For migration from Bitfocus Generic MIDI, the module also exposes `midiIn`, `lastMessage`, `lastNote`, `lastChannel`, `lastMsgType` and `lastValue`. `midiIn` pulses true for each incoming message so a Companion **Variable changed** trigger can run, while the other variables can be used as trigger conditions. Message strings follow the familiar form such as `cc_12_102_127`; message types include `noteon`, `noteoff`, `cc`, `program`, `aftertouch`, `channelpressure`, `pitch` and `sysex`.

MIDI actions include Note On, Note Off, a timed note press with automatic release, Control Change, one-based Program Change, polyphonic aftertouch, channel pressure, centered pitch bend, Start, Stop, Continue, Clock pulse, raw hexadecimal MIDI and validated hexadecimal SysEx. Device preset and PlayAUDIO scene actions remain one-based and use the receive channels configured in Preset Selector.

Incoming MIDI Clock (`F8`, 24 pulses per quarter note) is tracked on the selected user RTP-MIDI port. Variables expose whether clock is currently arriving, smoothed tempo in BPM, total pulse count and the last pulse timestamp. Clock is considered stopped after 1.5 seconds without a pulse and BPM returns to zero.

High-rate incoming and outgoing MIDI Clock is aggregated into variable updates at no more than ten updates per second and does not overwrite the last trigger-worthy MIDI message. **Receive and analyze MIDI Clock** can be disabled in MIDI options to ignore incoming Clock completely and remove its variables. Clock and Active Sensing bytes are separated from actionable MIDI even when realtime data is interleaved in the same RTP packet. Active Sensing still maintains connection liveness but does not generate Companion trigger-variable traffic. Notes, CC, Program Change, transport and other actionable messages remain ordered and receive an individual `midiIn` pulse, so rate limiting does not merge normal trigger events. A bounded 2048-message safety queue prevents unlimited memory growth during a pathological flood; queue depth and the normally-zero dropped count are exposed as diagnostics.

When a device is offline, the normal RTP session sends one control/data invitation pair every two seconds and declares an established session lost after about seven seconds without traffic. The discovery/configuration session is opened only after the normal RTP session connects. If its port does not answer within ten seconds, Companion releases it and waits thirty seconds before trying again. This keeps reboot recovery responsive without continuously probing Auracle's configuration port.

Native preset, Scene A/B and mixer snapshot actions reproduce iConnectivity Preset Selector's MIDI Program Change behavior without using the configuration session. Displayed numbers are one-based, matching Companion's Generic MIDI module. Configure the matching MIDI channels in the connection settings. Current preset and Scene values are initialized during discovery; mixer snapshot state begins as unknown until observed from an action, matching Program Change or device notification. Enable **Monitor device preset/Scene/mixer changes** when Companion must also follow preset, Scene and mixer snapshot changes made from the front panel or another configuration session.

### Preset Selector prerequisite

Preset, Scene and mixer snapshot Program Change reception must first be configured inside each interface. Connect each interface directly to a computer over USB, open the iConnectivity **Preset Selector** application, assign the desired receive channels, and save that configuration to the interface. This is normally a one-time device setup; Companion itself remains Ethernet-only afterward.

The preset, Scene and mixer snapshot channel fields in this module must match the channels saved with Preset Selector. The module does not enable, reroute, or overwrite those device-side settings. If identity and ordinary RTP-MIDI work but recalls do nothing, verify the Preset Selector configuration and the route from the selected RTP port to the interface's control input.

### Failover status values

Host status variables use the documented values: `0` disconnected/no USB data, `1` enumerated/SOF, `2` endpoint data, `3` monitored audio/MIDI signal. Scene selection is reported separately by `current_scene`; failover alarm state is not treated as proof of which computer is active.

### Notes

- Scene A and B presets use the native RTP-MIDI Scene action. Existing buttons created by older module builds with configuration-session Scene IDs 1 and 2 are translated automatically.
- **Legacy audio meter port ID** applies only to legacy devices with implemented meter support, such as PlayAUDIO12. It has no effect on PlayAUDIO1U or other TNG devices.
- PlayAUDIO12 settings cannot be saved from Auracle X; its manual requires the front-panel encoder for preset-level save. The module's generic save action follows the published SysEx command, but should be validated on hardware before show use.
- Keep Auracle X closed while testing if it prevents another application from opening the MIDI endpoint.
