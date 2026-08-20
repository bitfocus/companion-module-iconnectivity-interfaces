# Implementation plan

## Delivered in v0.1

- Current Companion API 2/Node 22 repository and native MIDI packaging.
- Legacy codec with verified published discovery packet, checksum and tests.
- Product capability profiles and normalized state model.
- USB/RTP MIDI endpoint selection, discovery, liveness and automatic refresh.
- PlayAUDIO12 failover/host health, scene recall, snapshot list, save and output meters.
- Actions, variables, feedbacks and starter presets.

## Milestone 2 - TNG foundation

- TNG framing/parser, BAx2/14x2/16x3/28x4/32x5 codecs and session state machine.
- Product IDs 14-17 detection; definition cache and notification manager.
- PlayAUDIO1U failover arm/alarm, USB host status, explicit active scene, presets and meters.
- mioXL/XM port inventory, routes, filters/remaps, USB host reservations and RTP session status.

## Milestone 3 - full public control surface

- Legacy + TNG MIDI route editor actions and route feedback/variables.
- RTP initiator/responder configuration, peer identity and connection health.
- Audio output level/mute, headphone mix and global mute where supported.
- Preset/scene names, active IDs, save/load, next/previous and safe backup export/import.
- Control ports, automation mapping and MIDI panic.
- Edge-triggered Companion custom variables/triggers for failover, sessions and device health.

## Milestone 4 - hardware validation

Use one unit from each protocol/family: PlayAUDIO12, PlayAUDIO1U, mioXL or mioXM, and one legacy mio. Capture request/response fixtures without proprietary Auracle traffic reverse engineering. Validate firmware variations, command-definition omissions, port IDs, save semantics, alarm transitions, meter rate limits, disconnect/reconnect, multiple identical devices, macOS/Windows/Linux and Companion package loading.

## Explicitly deferred

- Firmware update, bootloader, factory reset and shutdown (destructive).
- PlayAUDIO1U audio-protection control/status until the public field mapping is verified on hardware.
- Direct AppleMIDI session implementation; Companion uses OS MIDI endpoints.
- Any Auracle-only behavior lacking a published protocol field.
