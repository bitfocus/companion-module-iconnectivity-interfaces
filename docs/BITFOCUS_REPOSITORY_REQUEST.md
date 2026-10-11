# Bitfocus repository request (draft, not submitted)

Prepared 2026-10-11 for the Bitfocus Developer Portal form at developer.bitfocus.io/create-repository, which replaced the Slack request. Field labels on the live form could not be checked from the build environment; paste each block into the matching field.

## Repository / module name (manufacturer-product)

```text
iconnectivity-interfaces
```

Full repository name: `companion-module-iconnectivity-interfaces`. This matches the module id and repository URL already in `companion/manifest.json`. The module covers a family of iConnectivity interfaces (PlayAUDIO and mio), so the product part is `interfaces`, not a single model.

## Description

```text
Control and monitor iConnectivity PlayAUDIO and mio audio/MIDI interfaces over Ethernet. The module has its own RTP-MIDI (AppleMIDI) connection, so no operating-system network-MIDI driver is needed, and it runs alongside iConnectivity's Auracle software. It recalls device presets, PlayAUDIO Scene A/B and mixer snapshots, shows the device's confirmed current preset (with name) and Scene as feedback and variables, and sends and receives MIDI. Tested on PlayAUDIO1U and mioXM hardware; PlayAUDIO12 and mioXL support is included.

Product site: https://www.iconnectivity.com
PlayAUDIO1U: https://www.iconnectivity.com/playaudio1u
Protocol documentation (iConnectivity, public):
- Common System Exclusive Commands TNG (PlayAUDIO1U, mioXM, mioXL): https://cdn.iconnectivity.com/docs/Common_System_Exclusive_Commands_TNG.pdf
- Common System Exclusive Commands (PlayAUDIO12 and earlier models): https://cdn.iconnectivity.com/docs/Common_System_Exclusive_Commands.pdf
```

## Why a new module

```text
There is no Companion module for iConnectivity hardware today. The Generic MIDI module can send Program Change only through a MIDI port the computer already has (for Ethernet, an operating-system RTP-MIDI driver), and it cannot read the interface's state. Showing the active preset and Scene reliably needs iConnectivity's own SysEx protocol, its notification model and its session rules, so the device can stay connected to Auracle at the same time. That is device-specific work that does not fit a generic module. This module is used in live production on PlayAUDIO1U and mioXM.
```

## Link to current code

```text
https://github.com/mikecreates86/companion-module-iconnectivity
```

The owner made this repository public on 2026-10-11 so Bitfocus reviewers can open it.

## Template

Choose **None**. This module already has its own code and history, which will be pushed into the new Bitfocus repository; a template would add a starter commit that conflicts with it. The code is TypeScript if the form asks.

## GitHub username

```text
mikecreates86
```

## Pre-submission checks (2026-10-11)

- No church or venue names, private IP addresses, email addresses, device serial numbers, credentials or captures in the current files or in the built package. The only "church" matches are a general statement of the intended audience in `PROJECT_CONTEXT.md` and a General MIDI instrument name ("CHURCH_ORGAN") inside a bundled MIDI library.
- Git history contains one private example address (`172.16.50.22`, a settings-field example in the first commits from 2026-08-20 and 2026-09-17, later removed). It is a private-range address and cannot be reached from the internet. It was published with the history when the owner made the repository public on 2026-10-11.
- `yarn test` (99 tests), `yarn lint`, `yarn package` and `yarn package:verify` pass. The packaged module contains only the built code, the manifest, the help file and native MIDI libraries.
- Version: the source says 0.15.2. The latest published download is 0.15.4, the same code (0.15.5 once this record update is published). The first store version is 1.0.0. It will be set in `package.json` and the manifest once the owner approves 0.15.2 for live use, and the release build then publishes exactly `v1.0.0` for submission.
- No existing Bitfocus repository matches "iconnectivity" or "playaudio", and `bitfocus/companion-module-iconnectivity-interfaces` does not exist yet.
