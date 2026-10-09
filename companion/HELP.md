## iConnectivity Interfaces

Control and monitor iConnectivity PlayAUDIO and mio interfaces over Ethernet: recall presets and PlayAUDIO Scenes, see the device's current preset and Scene, and send and receive MIDI. No extra network-MIDI software is needed, and Auracle can stay connected at the same time.

**Tested on hardware:** PlayAUDIO1U and mioXM over Ethernet. PlayAUDIO12 and mioXL support is included but has not been tested on hardware; please report problems with the module log.

### Before you start: Preset Selector

Preset, Scene and mixer snapshot recall use MIDI Program Change, so the interface must be set up to receive them. Do this once per interface:

1. Connect the interface to a computer over USB and open iConnectivity **Preset Selector**.
2. Assign the receive channels for presets (and, on PlayAUDIO, Scene A/B and mixer snapshots if you use them).
3. Save the configuration to the interface.

Companion only sends on these channels; it never changes them. After this, Companion can work over Ethernet only.

### Quick start (Ethernet)

1. Give the interface a static or DHCP-reserved IP address.
2. Add the **iConnectivity Interfaces** connection and choose **RTP MIDI** with **RTP Role: Initiator**.
3. Enter the interface IP address and its **Interface RTP Port** as shown in Auracle (normally `5004`). This must be a regular RTP port, not the configuration port (normally `5002`).
4. Choose your **Interface model**. Choosing it (rather than Auto-detect) keeps the model's actions and feedbacks available even while the interface is offline.
5. Set **Preset recall channel** (and the optional PlayAUDIO **Scene A/B** and **mixer snapshot** channels) to match Preset Selector. Leave an optional channel on **Disabled / Not used** if you don't use it. Each selector needs its own channel.

The connection turns green when the RTP session is up. The `state_monitoring` variable shows `Regular RTP: live notifications registered` once Companion is following the device's preset and Scene.

### What you get

**Actions**

- **Recall preset** (1–128), **PlayAUDIO: Recall Scene A or B**, and **PlayAUDIO: Recall mixer snapshot** (when its channel is set).
- **Refresh device state**: re-reads the current preset, preset name and Scene.
- MIDI: Note On/Off, timed note press, Control Change, Program Change, aftertouch, pitch bend, Start/Stop/Continue, Clock, raw hex bytes and SysEx. A channel outside 1–16 is rejected with an error instead of being sent as a different message; note and value fields are limited to 0–127.

**Feedbacks**

- **Device online**, **Current preset**, **Current Scene A/B** and **Current mixer snapshot**.

PlayAUDIO12 additionally offers failover arm/disarm/clear, failover and host-health feedbacks, audio-signal feedback, meter variables and its legacy snapshot actions (not yet tested on hardware).

**Presets (ready-made buttons)**

- **Device presets**: recall buttons for presets 1–8 that light up on the active preset.
- **Status**: a device status button and Scene A/B buttons on PlayAUDIO.

**Variables**

- Device identity, `online`, `state_monitoring`, `current_preset`, `current_preset_name`, `current_scene` and `current_mixer_snapshot`.
- Incoming and outgoing MIDI (type, channel, number, value, note name, raw bytes, summary, timestamp) and MIDI Clock BPM.
- Generic MIDI-compatible variables (`midiIn`, `lastMessage`, `lastNote`, `lastChannel`, `lastMsgType`, `lastValue`) for migrating from the Generic MIDI module. `midiIn` pulses for every incoming message and can drive a **Variable changed** trigger; messages look like `cc_12_102_127`.

### How device state stays accurate

- **Preset:** the device is asked for its active preset and name every three seconds, so changes from Auracle or the front panel appear within a few seconds. After a Companion recall the preset shows **Unknown** until the device confirms what loaded.
- **Scene (PlayAUDIO1U):** follows the device's live change notifications and is read at startup, including after a restart while the device is already on B. If nothing has been heard about Scene for 15 seconds, Companion checks it once, so a missed notification is corrected within about 15 seconds. A live change always wins over that check; a correction is logged as a warning.
- **Mixer snapshot:** shows **Unknown** until it is seen from an action, a matching Program Change or a device notification. Mixer snapshot support has not yet been tested on hardware.
- If a read fails, the value is cleared rather than left stale, and Companion retries.

### Troubleshooting

- **Retries right after updating the module or changing settings:** restart the connection once. The interface may still be holding the previous session.
- **Recalls do nothing:** check Preset Selector's saved channels and that the module's channels match, and that the RTP port you chose is routed to the interface's control input.
- **Online but no preset/Scene feedback:** check `state_monitoring`. "No TNG identity reply" means the interface did not answer status requests on that port; check the port number and power-cycle the interface if needed. Companion never takes Auracle's configuration port as a fallback.
- **Interface unresponsive in Auracle or Companion:** power-cycling the interface has cleared temporary lock-ups in testing.

### Advanced settings

Normal PlayAUDIO1U and mioXM setups need none of these.

- **Show diagnostic variables**: adds internal counters, raw messages and RTP details for troubleshooting. Off for new connections; connections upgraded from older versions keep it on so existing references keep working.
- **Initiator local RTP-MIDI control port**: leave at `0` for automatic; a fixed port must be even.
- **Device status connection**: leave on **Automatic**. **Configuration port (compatibility)** uses the older discovery method through the configuration port and shows extra options. **Monitor changes through configuration port** keeps that port open for live updates and **may stop Auracle from connecting over Ethernet**.
- **Status refresh interval**: the module's polling interval (default 1000 ms).
- **Legacy audio meter port ID**: for PlayAUDIO12 meters only.
- PlayAUDIO12 and mioXL, when selected explicitly, use the configuration-port method.

### Other connection methods

- **USB MIDI**: for an interface connected directly to the Companion computer; pick its input and output ports. Not yet tested on hardware.
- **Responder (experimental)**: the interface connects to Companion on a fixed, even **Companion RTP Port**. It carries MIDI only, without device state monitoring. Use **Initiator** for normal operation.

### Good to know

- Displayed preset, Scene and snapshot numbers start at 1 (MIDI Program Change values start at 0).
- Incoming MIDI variables show traffic on the selected RTP session only; route other ports to it to see them.
- MIDI Clock is counted on every pulse but its variables update a few times a second. Clock is considered stopped after 1.5 s without a pulse. Turn off **Receive/analyze MIDI Clock** if you don't need it.
- An RTP session is re-invited every two seconds while offline and is considered lost after about seven seconds without traffic.
- Buttons made with older versions of this module that used Scene IDs 1 and 2 are translated to the current Scene action automatically.
