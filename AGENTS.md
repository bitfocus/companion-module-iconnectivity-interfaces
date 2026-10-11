# Agent instructions

Read `AGENTS.md`, `PROJECT_CONTEXT.md`, `README_AI.md` and `STATUS.md` before acting. For protocol or capability work, use `docs/README.md` to select only the relevant focused document.

## Working with the owner (permanent)

- The owner is the project manager, not a developer, and is new to GitHub. Speak in plain, non-technical language: describe outcomes, what changed for the user and what you need from the owner. Avoid GitHub and developer jargon (branches, PRs, CI, commits, merges); if a technical step is unavoidable, explain it in everyday words.
- Agents do all GitHub work themselves: saving work, opening and merging changes once the automated checks pass, and keeping the records up to date. Never ask the owner to operate GitHub.
- Ask the owner only for what needs them: testing on the real equipment, approving a version as trusted for live use (Production), decisions about what the module should do, and actions that need the owner's own accounts (for example the Bitfocus Developer Portal). Ask in plain language, one clear question at a time.
- The repository front page (`README.md`) must always link to the **Latest** release (`releases/latest`), which `.github/workflows/release.yaml` publishes automatically for every change merged to `main`: the ready-to-import `.tgz` under a plain version number higher than every earlier one. Keep that link and the automatic build working, and update `WHATS_NEW.md` with a short plain-language summary (including the version trusted for live use) in each round of work before it reaches `main`.
- When a change affects how the module behaves with the hardware, give the owner the build to test before calling the work done.

## Repository map

- `src/`: authoritative TypeScript implementation.
- `src/protocol/`: pure legacy and TNG codecs.
- `src/network/`: AppleMIDI/RTP-MIDI transport.
- `tests/`: Node test-runner suites; put sanitized protocol fixtures in `tests/fixtures/` if needed.
- `companion/`: manifest and user-facing help.
- `docs/`: durable protocol research, capability status and release plan.
- `dist/`, `pkg/`, root `*.tgz`, `releases/`, `captures/`: generated or investigative artifacts, never source of truth. `releases/` is the sole retained location for testable package archives.

## Commands

Requires Node `^22.20` and Yarn 4.

```sh
yarn install                 # install exactly from yarn.lock
yarn dev                     # watch TypeScript compilation
yarn build                   # clean and compile to dist/
yarn test                    # build and run all tests
yarn lint                    # ESLint over the repository
yarn format                  # Prettier; writes files
yarn package                 # build distributable Companion .tgz
```

Focused verification:

```sh
yarn build && node --test tests/<name>.test.mjs
```

The AppleMIDI integration test opens local UDP sockets. Run it in an environment that permits loopback UDP. After source changes, run build, tests and lint when practical; protocol changes require a focused test or sanitized fixture.

## GitHub and cloud workflow

- The GitHub repository `mikecreates86/companion-module-iconnectivity` (public since 2026-10-11) is the source of truth. `main` is the known-good development baseline; start changes on a focused `codex/` branch and merge only after appropriate checks pass.
- A clean clone must be sufficient for source development. Do not depend on files from `captures/`, generated output, retained package archives, personal Companion exports or machine-specific configuration.
- Install from the committed `yarn.lock` with Node 22.20.x and Corepack/Yarn 4. Do not replace Yarn with npm or commit a `package-lock.json`.
- Before considering a source change complete, run `yarn test` and `yarn lint`. Also run `yarn package` and `yarn package:verify` when packaging behavior or release readiness is affected.
- Automated checks and a successful package do not promote a Candidate to Production. Real hardware/Companion validation and the user's explicit approval remain required.

## Release management (permanent)

- Maintain exactly one documented **Production** version: the most recent package explicitly confirmed stable through real hardware/production testing. A newer package never replaces it automatically; promotion requires explicit user approval.
- Maintain a separate **Candidate** version: the newest packaged build intended for testing. Record `Candidate: None` explicitly when no Candidate exists.
- In `STATUS.md` (under **Working Now**), prominently record Production and Candidate with version, date, validation status, and Candidate testing scope. Do not infer either state from version order, a filename, or Git recency; report missing or conflicting evidence.
- Every package build needs a new, never-reused module version. Do not overwrite or silently replace an archive. A failed or discarded build remains part of version history, and the next testable build increments the version.
- Put every retained testable package directly in `releases/`, named `<module>-v<version>-PRODUCTION.tgz` or `<module>-v<version>-CANDIDATE.tgz`. Keep older archives unless the user explicitly directs their removal. On promotion, retain the Candidate and create a separately named Production artifact; never overwrite an earlier archive.
- `releases/README.md` is the authoritative release procedure and archive inventory. Legacy archives that predate this policy may remain, but must not establish a release state or be renamed without clear evidence.

## Coding rules

- Follow TypeScript strictness, ESM `.js` imports, the existing Prettier configuration and Companion API patterns.
- Keep protocol encoding/parsing pure and testable. Normalize replies before exposing state.
- Treat device capability responses and TNG parameter definitions as authoritative. Never infer write support solely from a model name.
- Make actions, feedbacks, variables and presets capability-aware. Unsupported operations must be absent or fail with a clear capability message, never a low-level transport error.
- Preserve reconnect behavior, multiple-instance port isolation, bounded MIDI queues and Auracle access to the released TNG configuration session.
- Do not add destructive device operations, firmware updates, factory reset or reboot-required writes without explicit approval.
- Preserve unrelated worktree changes. Do not delete or substantially restructure prototypes or captures without user approval.

## Files to avoid modifying

- Never edit `node_modules/`, `dist/`, `pkg/`, root `*.tgz`, `releases/` or capture binaries as source. The sole exception is an explicitly requested release-management action on `releases/`; preserve archive history and never overwrite an existing package.
- Do not edit `.github/workflows/`, `companion/manifest.json` or `companion/HELP.md` unless the requested change specifically requires CI, packaging metadata or user-facing behavior.
- Do not commit personal Companion exports, device serial numbers, private IP layouts or unsanitized packet captures.

## Authority and handoff

The active `src/` implementation and `tests/` are authoritative. `src/protocol/legacy.ts` is production legacy code; `src/protocol/tng.ts` is a production foundation with partial discovery/state reads. The capability matrix distinguishes implementation from hardware validation. Keep `STATUS.md` limited to its four existing sections and update it whenever the active release target or blockers change.

## GitHub persistence verification

When the user's request authorizes remote publication, finish meaningful work by committing and publishing the source, tests, help and handoff/research records to a focused branch; verify the actual GitHub commit and file tree before claiming it is saved. Integrate into main only after the checks and validation required above. A cloud workspace, clean older checkout, matching version number or chat note does not prove another chat's newer edits are on GitHub. Audit the specifically named development chat/workspace when the user references work there. Report unpublished work and missing artifacts explicitly. Never claim a retained package binary is on GitHub just because its name/hash is documented. Update handoff refs when a publication or merge completes, and retain pending hardware qualification without promoting Production.
