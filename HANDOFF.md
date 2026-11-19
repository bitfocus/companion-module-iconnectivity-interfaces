# HANDOFF.md: running log, newest entry first

Each entry: date, tool, what changed, what is half-finished, what to do next, decisions made.

## 2026-11-19 · Claude Code

**What changed**

- Added the shared hand-off setup so Claude Code and Codex can take turns:
  - `AGENTS.md` was rewritten as the single source of truth.
  - `CLAUDE.md` points Claude to `AGENTS.md` and this file.
  - This log was started.
- The owner's copy (`mikecreates86/companion-module-iconnectivity-interfaces`) was brought up to date with this repository on 2026-11-18. Its hourly download workflow is now running, and 1.0.1 is published there as Latest.
- That earlier pending step in `STATUS.md` is now done.

**Where the project stands**

- Store versions:
  - 1.0.0 was submitted on 2026-11-10. The Bitfocus review asked for 5 template changes.
  - 1.0.1 has those changes (2026-11-12) and was submitted by the owner. Its review result is not yet known.
- The module code is unchanged since 0.15.3, which the owner runs in live use.
- 102 automated tests pass.

**Half-finished**

- The 1.0.1 review is pending in the Bitfocus Developer Portal.
- The non-blocking review findings M1–M3 and L1–L7 (listed in `AGENTS.md`) are not fixed. They change module behaviour, so they need a test build that the owner runs on the real equipment.
- A settings-loss report after updating Companion 5.0.7 → 5.1.0 is unresolved. It is waiting on the owner: did other connections keep their settings?
- Old branches `codex/claude-handoff`, `codex/record-0.14.22` and `unifi-recovery-test` remain on the owner's copy. The cloud workspace could not delete them. They are harmless.

**Next**

1. The owner answers the TODOs in `AGENTS.md`: 1.0.1 review status, trusted-for-live-use version, branch naming, whether to retire `PROJECT_CONTEXT.md` and `README_AI.md`, and the Companion 5.1 question.
2. Update `STATUS.md` (Production/Candidate) to match the owner's answer.
3. After 1.0.1 is approved, fix M1, M2 and L6 first as a test build (`1.0.2-test.N`), for the owner to run on a Sunday before submitting 1.0.2.

**Decisions**

- `AGENTS.md` wins over any other document.
- This Bitfocus repository is the only place to develop. The owner's copy is only the download page.
