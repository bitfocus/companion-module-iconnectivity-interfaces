## iConnectivity Interfaces

### Ethernet setup

Choose **RTP MIDI**, leave **RTP Role** as **Initiator**, and enter the interface IP address and the regular **Interface RTP Port** shown in Auracle (normally 5004). Use a static or DHCP-reserved IP address. The regular RTP port must differ from the dedicated configuration port (normally 5002).

For **PlayAUDIO1U and mioXM**, identity and status monitoring use this regular RTP connection automatically. Auracle can remain connected over Ethernet: Companion leaves the dedicated configuration port available. There is no monitoring checkbox to enable for this setup.

Select **Interface model** to keep model-specific controls available while the device is offline. **Auto-detect** waits for discovery before exposing those controls and uses regular-RTP status discovery. An explicitly selected model that differs from the detected device produces a configuration error and blocks model-specific commands. Select PlayAUDIO12 or mioXL explicitly to retain their configuration-port discovery method; their regular-RTP monitoring has not been qualified.

The RTP name appears in Auracle. Device-incompatible punctuation is converted to safe ASCII automatically. Each module instance uses independent local RTP ports.

### Device state and recalls

Preset number and name are read from the device every three seconds. Changes from Auracle or the front panel can take a few seconds to appear in Companion. A Companion preset recall shows Unknown until the device confirms its active preset; sending a command or observing an ordinary Program Change does not confirm that it loaded. Failed preset/name reads clear stale values, report a timeout, and wait 30 seconds before retrying. Delayed replies to cancelled reads and names belonging to another preset are ignored.

PlayAUDIO1U Scene A/B feedback follows live device notifications. Setup reads the active DeviceFeature:SceneNumber directly, including after a module restart while the device is already on B. That read cannot overwrite a newer live Scene notification. Scene stays Unknown if no valid reply is received. Scene actions also update the displayed Scene when Companion sends the recall. Test device-originated changes when verifying live feedback.

**Refresh device state** re-reads the preset number, preset name and Scene on demand through the same regular RTP connection (Auracle stays connected). A live notification that arrives during the read still takes precedence. Use it if you suspect Scene feedback missed a change; Scene is otherwise read only at startup and then follows notifications.

The **Current preset** feedback highlights a button whose preset matches the device-confirmed preset, and the **Device presets** preset category contains ready-made recall buttons for presets 1–8 with that highlight.

The preset, Scene A/B and mixer snapshot selectors each need their own MIDI channel. If the Scene or mixer snapshot channel matches the preset channel (or the two match each other), one Program Change would trigger both, so the module logs a warning and refuses that recall action until the channels differ.

Mixer snapshot state starts as Unknown until observed from an action, matching Program Change or device notification. Configure **PlayAUDIO mixer snapshot channel** only when using that selector. Mixer snapshot monitoring and recall still require their own hardware validation.

**Device state monitoring status** (`state_monitoring`) reports discovery, read failures and notification registration. `Regular RTP: live notifications registered` confirms the subscription was accepted; verify actual changes when commissioning a setup. Normal RTP online status alone does not prove device feedback is working.

At connection startup, Companion starts RTP clock synchronization immediately and allows one second for the session to settle before requesting TNG identity. Regular-RTP discovery then waits up to five seconds and retries two seconds after a timeout. If the device does not answer, Companion reports the failure and keeps ordinary MIDI available; it does not take Auracle's configuration port as a fallback. Restarting the module connection with Auracle connected has been tested on PlayAUDIO1U; restart/recovery and longer-session qualification remain ongoing.

### Preset Selector prerequisite

Preset, Scene and mixer snapshot reception must first be configured on the interface using iConnectivity **Preset Selector**. Connect the interface to a computer over USB, assign the receive channels, and save the device configuration. This is normally a one-time setup; Companion can remain Ethernet-only afterward.

Match the module's **Preset recall Channel**, optional **PlayAUDIO Scene A/B channel**, and optional **PlayAUDIO mixer snapshot channel** to those saved settings. Leave an unused optional channel at `0`. mio devices do not use Scene A/B. Companion does not enable, reroute or overwrite the device's selector settings. If recalls do nothing, verify Preset Selector and routing from the selected RTP port to the device control input.

Preset, Scene and snapshot actions use native MIDI Program Change. Displayed values are one-based. Older module buttons using configuration-session Scene IDs 1 and 2 are automatically translated to the native Scene action.

### Advanced settings and compatibility

Normal PlayAUDIO1U and mioXM Ethernet setups need no advanced changes.

**Show diagnostic variables** defaults off for new connections. It exposes internal command/response counters and raw messages, MIDI traffic/queue counters, RTP connection details, product/protocol/capability details, last acknowledgement, and Clock pulse count/timestamp. Monitoring and MIDI processing continue when these variables are hidden. Online/identity/monitoring status, device identity, preset/Scene/snapshot state, normal MIDI trigger variables and Clock BPM remain available. Upgraded connections keep diagnostics enabled to preserve existing variable references; turn this option off to simplify their variable list.

- **Initiator local RTP-MIDI control port**: leave at `0` for automatic assignment; a specified port must be even.
- **Device status connection**: leave on **Automatic**. **Configuration port (compatibility)** restores the older discovery path for troubleshooting or other devices.
- **Device discovery/configuration port** and **Local discovery control port** appear for the configuration-port path. Normally use remote port 5002 and local port `0`.
- **Monitor changes through configuration port** appears only for that compatibility path. It retains the configuration connection for TNG notifications and may prevent Auracle from connecting over Ethernet. With it disabled, the TNG configuration connection is released after initial reads. This option has no effect on automatic regular-RTP monitoring.
- **Status refresh interval (milliseconds)** controls the module's polling scheduler. The default is 1000 ms; automatic preset reads are scheduled at least three seconds apart.
- **Legacy audio meter port ID** applies only to implemented legacy meter features, such as PlayAUDIO12, and has no effect on TNG devices.

Explicit PlayAUDIO12 and mioXL selections retain their existing configuration-port path. PlayAUDIO12 retains its legacy connection for implemented status polling. If using Auto-detect with a legacy interface, select its model or choose the advanced configuration-port compatibility method.

### Other connection methods

Choose **USB MIDI** only when the interface is physically connected to the Companion computer; select the local input and output ports. Network-only configurations do not depend on USB port names. USB behavior and platform qualification remain separate from the tested Ethernet path.

**Responder** requires a fixed, even **Companion RTP Port**. Configure the device to connect to the Companion computer's IP address on that port. Responder mode does not have a complete identity/configuration discovery path.

The normal RTP connection retries invitations every two seconds and detects loss of an established session after about seven seconds without traffic. Configuration-port discovery opens only after the user RTP session connects, times out after ten seconds, and backs off 30 seconds before retrying.

### MIDI variables and actions

Incoming variables describe traffic observed on the selected user RTP session; other device ports must be routed to it to be visible. Internal discovery/status SysEx has separate counters and last-message variables, so it does not overwrite user MIDI events.

User MIDI variables include type, channel, number, value, note name, raw bytes, summary and timestamp for both directions. Generic MIDI-compatible variables include `midiIn`, `lastMessage`, `lastNote`, `lastChannel`, `lastMsgType` and `lastValue`. `midiIn` pulses for each actionable incoming message and can drive a Companion **Variable changed** trigger. Message strings use forms such as `cc_12_102_127`.

MIDI actions include Note On/Off, timed note press, Control Change, Program Change, polyphonic aftertouch, channel pressure, pitch bend, Start/Stop/Continue, Clock, raw hexadecimal MIDI and validated hexadecimal SysEx. A channel outside 1–16 (for example from an expression) is rejected with an error rather than sent as a different message; note, controller and value fields are clamped to 0–127.

Incoming RTP packets that carry several MIDI messages are split into individual messages in order, so a device notification and a Program Change sent together are both handled. Packets that do not follow the RTP-MIDI command-list format are passed through unchanged, as in earlier versions.

**Receive/analyze MIDI Clock** controls Clock BPM and receive-state variables. Clock pulses are counted individually; variable publication is coalesced. Clock and Active Sensing are separated from actionable MIDI. Clock stops after 1.5 seconds without a pulse and BPM returns to zero. Notes, CC, Program Change and transport events remain ordered with an individual receive pulse. A bounded queue exposes queue depth and dropped-message diagnostics.

### Validation scope

Concurrent Ethernet Auracle access, preset feedback, Scene feedback where supported, and module-connection restart were user-confirmed on PlayAUDIO1U and mioXM during the regular-RTP testing. Mixer snapshots, automatic failover, interface power-cycle recovery, longer-session endurance, other models and supported-platform release qualification remain separate checks. The release Candidate is not promoted to Production automatically.
