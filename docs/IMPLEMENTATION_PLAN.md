# Public-beta plan

## Release gates

1. **Complete:** Rebuild actions, feedbacks and presets from detected or explicitly configured capabilities; reject unsupported operations with device-level messages.
2. **Partially complete:** Focused tests now cover capability surfaces, configuration upgrades, reconnect/restart behavior and multiple session isolation. Continue lifecycle and real-hardware coverage where `STATUS.md` identifies gaps.
3. **Complete (labelled):** Responder mode is labelled experimental and MIDI-only in settings and help (0.15.2). Full responder discovery remains a later option.
4. **Complete:** Public claims are limited to hardware-tested combinations: manifest products and keywords trimmed (0.15.2), and `companion/HELP.md`, `README.md` and `CHANGELOG.md` rewritten for public readers (2026-10-09). 64-bit native-addon support is documented.
5. **Open:** Run multi-day PlayAUDIO1U + two-mioXM testing across device, Companion and network restarts, Auracle coexistence and high MIDI/Clock load.
6. **Open:** Load packaged builds on Raspberry Pi ARM64, macOS Apple Silicon and Windows x64; exercise USB MIDI on at least one platform.
7. **Partially complete:** Git history contains no captures, exports, serials or private addresses (audited 2026-10-07). The manifest passes Bitfocus's `validateManifest`; `companion-module-check` from `@companion-module/tools` 3.0.2 crashes on a path bug before checking, so validation was run directly. The shared Bitfocus CI check cannot run while the repository is private. Release notes are drafted in `CHANGELOG.md`. Remaining: owner decisions on the public version number, LICENSE copyright line and internal handoff files; the repository request in Bitfocus's #module-development Slack channel (repository name `companion-module-iconnectivity-interfaces`); tag `v<version>` and submit it in the Bitfocus Developer Portal.

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

## Final PA1U/mioXM Ethernet qualification

Use `STABILITY_CHECKLIST.md` to qualify the current Candidate on the actual deployment host. Startup and operational feedback are user-confirmed on both models; diagnostic visibility/migration, full application/interface recovery and realistic multi-day endurance remain before Production promotion. This focused stable scope does not require implementing the later capability slices above.
