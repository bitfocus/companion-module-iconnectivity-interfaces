# Agent instructions

Read `AGENTS.md`, `README_AI.md`, and `STATUS.md` first. For protocol work, read only the relevant file(s) indexed by `docs/README.md`.

## Repository map

Implementation is in `src/`; protocol codecs are in `src/protocol/`; transports are in `src/network/`; tests are in `tests/`; Companion metadata/help is in `companion/`; durable research is in `docs/`.

## Commands

```sh
yarn install                 # install dependencies
yarn build                   # clean and compile TypeScript to dist/
yarn test                    # build, then run all tests
yarn lint                    # ESLint over the repository
yarn format                  # format repository files (writes changes)
yarn package                 # build Companion package
```

Use `yarn build && node --test tests/<name>.test.mjs` for a focused test file. Run `yarn build`, `yarn test`, and `yarn lint` after source changes when practical; protocol changes should include or update focused tests.

## Coding and project rules

- Follow the existing Prettier configuration, TypeScript strictness, ESM `.js` import convention, and Companion API patterns.
- Keep protocol encoding/parsing pure and testable. Normalize device state before variables, feedbacks, or actions consume it.
- Treat device capability responses and TNG parameter definitions as authoritative. Never send an unsupported command because a product name suggests it.
- Preserve safe behavior: do not add destructive device operations or reboot-required writes without explicit approval.
- Keep docs concise and put durable research in the focused `docs/` file, not in this file or `README.md`.

## Files to avoid modifying

Do not edit `node_modules/`, `dist/`, `pkg/`, root `*.tgz`, `releases/`, or large capture files as source. They are generated, packaged, or investigative artifacts. Do not modify `.github/workflows/`, `companion/manifest.json`, or user-facing `companion/HELP.md` for a code task unless the requested change requires it. Preserve unrelated existing worktree changes.

## Authority and prototypes

The authoritative implementation is the active TypeScript under `src/`, with tests under `tests/`. `src/protocol/legacy.ts` is the production legacy codec; `src/protocol/tng.ts` is a production TNG foundation/partial discovery implementation, not a complete TNG control surface. `docs/IMPLEMENTATION_PLAN.md` describes unfinished work. Do not delete or merge older artifacts without user approval.
