# Agent instructions

Read `AGENTS.md`, `README_AI.md` and `STATUS.md` before acting. For protocol or capability work, use `docs/README.md` to select only the relevant focused document.

## Repository map

- `src/`: authoritative TypeScript implementation.
- `src/protocol/`: pure legacy and TNG codecs.
- `src/network/`: AppleMIDI/RTP-MIDI transport.
- `tests/`: Node test-runner suites; put sanitized protocol fixtures in `tests/fixtures/` if needed.
- `companion/`: manifest and user-facing help.
- `docs/`: durable protocol research, capability status and release plan.
- `dist/`, `pkg/`, root `*.tgz`, `releases/`, `captures/`: generated or investigative artifacts, never source of truth.

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

## Coding rules

- Follow TypeScript strictness, ESM `.js` imports, the existing Prettier configuration and Companion API patterns.
- Keep protocol encoding/parsing pure and testable. Normalize replies before exposing state.
- Treat device capability responses and TNG parameter definitions as authoritative. Never infer write support solely from a model name.
- Make actions, feedbacks, variables and presets capability-aware. Unsupported operations must be absent or fail with a clear capability message, never a low-level transport error.
- Preserve reconnect behavior, multiple-instance port isolation, bounded MIDI queues and Auracle access to the released TNG configuration session.
- Do not add destructive device operations, firmware updates, factory reset or reboot-required writes without explicit approval.
- Preserve unrelated worktree changes. Do not delete or substantially restructure prototypes or captures without user approval.

## Files to avoid modifying

- Never edit `node_modules/`, `dist/`, `pkg/`, root `*.tgz`, `releases/` or capture binaries as source.
- Do not edit `.github/workflows/`, `companion/manifest.json` or `companion/HELP.md` unless the requested change specifically requires CI, packaging metadata or user-facing behavior.
- Do not commit personal Companion exports, device serial numbers, private IP layouts or unsanitized packet captures.

## Authority and handoff

The active `src/` implementation and `tests/` are authoritative. `src/protocol/legacy.ts` is production legacy code; `src/protocol/tng.ts` is a production foundation with partial discovery/state reads. The capability matrix distinguishes implementation from hardware validation. Keep `STATUS.md` limited to its four existing sections and update it whenever the active release target or blockers change.
