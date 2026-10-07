# PA1U/mioXM Ethernet stability qualification

This checklist qualifies the tested scope: Companion as an Ethernet initiator, PA1U/mioXM regular-RTP monitoring, native preset recall, PA1U Scene A/B, and Auracle connected concurrently over Ethernet. It does not require finishing unrelated TNG features. Other devices, USB/responder modes and mixer snapshots have separate qualification requirements.

Production is 0.14.22 (promoted 2026-10-07 by the user before this checklist was completed); Candidate 0.15.1 is under test. Use this checklist to qualify each Candidate. Candidate 0.14.22 corrects the startup Scene query after a B-at-restart bug on 0.14.21. It retains optional diagnostic variables and the improved startup timing. Do not promote a Candidate merely because it has a newer version number.

## Immediate check on 0.14.22

- Import the package into the actual Companion installation. Record Companion version, OS/architecture, module version, each device's firmware, and Auracle version.
- Existing connections retain diagnostic variables. Turn off **Show diagnostic variables** in Advanced Settings and confirm counters disappear while online state, `identity_status`, `state_monitoring`, presets/names and PA1U Scene remain available.
- Check that a new connection starts with diagnostics off. Turn diagnostics on, then off again, and confirm feedback and any normal MIDI triggers still work. Existing triggers that deliberately use diagnostic variables require diagnostics to remain enabled.
- Set PA1U Scene B in Auracle, toggle the module off/on while the device remains on B, and confirm the initial variable becomes B. Repeat with A and across a full Companion restart. A missing reply must leave Unknown, never a guessed A.
- Keep Auracle connected over Ethernet. Confirm device/Companion/Auracle recalls and feedback agree, including preset names and leaving Scene B selected through several preset refreshes. Preset feedback normally catches up within a few seconds; a sent recall must not establish the preset before a device reply.

## Recovery check

Use the same packaged version throughout. Repeat each relevant operation several times on PA1U and mioXM:

- Restart a module connection with Auracle open; confirm identity, live registration and actual subsequent preset/Scene feedback.
- Fully restart Companion and confirm all configured interfaces reconnect and feedback resumes.
- Power-cycle an interface, then test a brief network interruption. Confirm disconnection clears the observed regular-RTP state to Unknown, automatic recovery works without intervention, and later external changes update Companion again.
- Restart/reconnect Auracle and confirm both applications remain responsive.
- If automatic PA1U failover is part of the intended production setup, trigger the normal failover mechanism and verify Scene feedback tracks the actual active Scene.

Run interface/network interruptions in a test window because they interrupt audio or routing. Record actual recovery times and any stuck sessions, stale values, errors or manual steps needed.

## Endurance check

Start with 24–48 uninterrupted hours using the real Companion host and intended device count, with Auracle connected. The project's broader release gate remains multi-day testing on PA1U plus two mioXM interfaces. Exercise realistic MIDI/Clock traffic if used, occasional preset/Scene changes, and ordinary application restarts. Check memory/CPU trends, persistent registrations, unexpected reconnects and feedback accuracy. A diagnostic counter growing steadily is expected; queue drops or unexplained stale state require investigation.

Pass criteria: no sustained stale preset/Scene feedback, no manual reconnect needed after recovery, no Auracle conflict, no sustained resource growth, and no unresolved errors under expected load. Keep the exact tested package and record the start/end time and outcomes. If a fix is needed, give it a unique version and repeat the affected checks plus a representative endurance run.

## Stable release decision

When the package passes the immediate, recovery and endurance checks on the actual deployment platform, it is reasonable to call that PA1U/mioXM Ethernet scope stable. The user must explicitly approve Production promotion; retain the Candidate archive and create the separately named Production artifact, without overwriting either. Public beta distribution additionally requires supported-platform package checks, truthful model/mode claims, private-artifact review and the Bitfocus shared checks listed in `IMPLEMENTATION_PLAN.md`.
