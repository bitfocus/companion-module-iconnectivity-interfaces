# Public-beta plan

## Release gates

1. Rebuild actions, feedbacks and presets from detected capabilities; reject unsupported operations with device-level messages.
2. Add focused tests for capability surfaces, module lifecycle, configuration upgrades, reconnect/backoff and multiple instances.
3. Fix responder identity/configuration discovery or label responder mode MIDI-only/experimental.
4. Limit public device/platform claims to hardware-validated combinations; document 64-bit native-addon support.
5. Run multi-day PlayAUDIO1U + two-mioXM testing across device, Companion and network restarts, Auracle coexistence and high MIDI/Clock load.
6. Load packaged builds on Raspberry Pi ARM64, macOS Apple Silicon and Windows x64; exercise USB MIDI on at least one platform.
7. Remove or sanitize private captures/configuration exports, run Bitfocus shared checks and publish a tagged beta with release notes.

## Later capability slices

- TNG definition cache and notification subscriptions.
- PlayAUDIO1U failover/host health, meters and safe audio controls.
- mioXM/mioXL port inventory, routing, filters/remaps, USB host reservations and RTP session state.
- Legacy routing, RTP detail, preset navigation and validated PlayAUDIO12 controls.
- Typed edge events for online state, failover, Scene, preset and RTP-session transitions.
- Optional exact Bonjour service-name resolution with manual IP/port retained.

## Explicitly excluded

- Firmware update, bootloader, factory reset, shutdown and reboot-required writes.
- Audio-protection control/status until a public field mapping is confirmed on hardware.
- Auracle-only behavior without a documented protocol field.
