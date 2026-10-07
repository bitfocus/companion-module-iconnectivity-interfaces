# GitHub persistence audit: Candidate 0.14.22

Audit date: 2026-10-07. Current Candidate: **0.14.22**. Production: **0.13.3**.

## Recovery evidence

The development chat **Investigate Auracle status accuracy** (Codex thread
`01a10c36-4c23-74d1-849a-f06b0088b0fc`, dated 2026-10-05) contains the edits,
test/package results and user hardware observations through 0.14.22. Those
changes were left in that chat's cloud workspace on
`codex/ethernet-status-monitoring`; they were not present on GitHub main.
The separate 2026-10-07 cloud checkout and GitHub main both still contained
0.14.13 at commit `34285fc5c1321e3850d3421db5e8f088616b9819`. Checking that
checkout alone did not verify the other chat's work.

The 0.14.22 source, tests, help, metadata and research/release notes were recovered
by applying all recorded file edits in order to that same 0.14.13 baseline,
including the original formatting steps. The recovery did not replay hardware
commands, package builds or network probes. The resulting source was verified
again on 2026-10-07. It was published on `codex/record-0.14.22` and merged into main through
[PR #2](https://github.com/mikecreates86/companion-module-iconnectivity/pull/2) on 2026-10-07. Merge commit:
`06cccb3c779e84c6d81d51c08245a00956dfe332`. GitHub Test and Lint jobs passed. The main
comparison against recovery commit `e45caba23531424200f5efeeb3854b68ae42d65d`
returned no file differences. The GitHub source tree
`68bd26c7cc8bf7fc3bcf5779ee8567143c20c100` matched the checked local tree. A published commit and matching GitHub tree, not a cloud workspace or
chat message, establish source persistence.

## Change progression

All versions below were built on 2026-10-05. Earlier builds remain historical;
none replaces Production without explicit approval. Exact original package
hashes and verification results are preserved in `../releases/README.md`.

| Version | Changes and result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.14.14 | Added opt-in TNG identity, sequential state reads, notification registration and keepalive over the regular RTP connection, leaving the configuration endpoint free for Auracle. Added bounded discovery/registration timeouts, matching successful registration acknowledgements, per-session/device reply isolation, cached-state reset on reconnect, internal/user MIDI separation and the coexistence test guide. PA1U simultaneous Ethernet Scene feedback worked, but Auracle preset changes could remain stale.                                                     |
| 0.14.15 | Added preset number/name and Scene reconciliation every three seconds, sequential non-overlapping reads, unchanged-name preservation, timeout backoff and notification renewal after a changed preset. This was an intermediate package, superseded during the same fix.                                                                                                                                                                                                                                                                                                   |
| 0.14.16 | Required device-confirmed preset state: a sent recall or incoming Program Change cannot establish the active preset. Clears stale values after failed reads, matches outstanding read transactions and prevents stale preset-name replies from applying to another preset. Intermediate package; superseded by 0.14.17.                                                                                                                                                                                                                                                    |
| 0.14.17 | Completed the preset accuracy fix and regression coverage, including preserving an explicit None state for mixer-snapshot tracking. PA1U preset accuracy was user-confirmed. Periodic Scene reads introduced a rollback to A after live changes.                                                                                                                                                                                                                                                                                                                           |
| 0.14.18 | Stopped periodic Scene reads from overwriting live Scene notifications; initial reads retain newer notifications. Preset/name refresh continues. Reduced identity retry pause from 30 seconds to two seconds. User confirmed faster startup, no Scene rollback, working recalls and module restart with Auracle open.                                                                                                                                                                                                                                                      |
| 0.14.19 | Made regular-RTP monitoring automatic for PA1U, mioXM and Auto-detect Ethernet initiators. Migrates old experimental flags, removes the normal-path monitoring toggle and Auracle warning, retains an advanced configuration-port compatibility override and scoped warning. Added automatic-mode/configuration/upgrade tests and updated help. User confirmed mioXM behavior. First identity request still commonly timed out.                                                                                                                                            |
| 0.14.20 | Starts RTP synchronization immediately before connected listeners, then allows one second of session settling before TNG discovery. Added startup-order/reconnect coverage. User reported approximately three-second, error-free identity on PA1U and mioXM, with retained Scene/preset behavior.                                                                                                                                                                                                                                                                          |
| 0.14.21 | Added Advanced Settings: Show diagnostic variables, default off for new connections. Upgrade preserves existing diagnostic references. Filters every variable-publication path while keeping monitoring, operational state, MIDI triggers and Clock BPM active. Added the stability checklist. User then found incorrect Scene initialization after a module restart while the PA1U remained on B.                                                                                                                                                                         |
| 0.14.22 | Corrected the startup query to DeviceFeature:SceneNumber (`0x03/0x04`) with no arguments. The old AudioInfo:AudioClockRestartValue (`0x08/0x41`) was incorrectly interpreted as Scene. Rejects the old field, accepts valid A/B, matches initial-read transactions, preserves newer live notifications and leaves missing/invalid Scene state Unknown. Applies to regular and configuration status paths. Added B-at-restart and invalid/missing-read regressions. User explicitly confirmed the reported restart fix and chose to keep this build for the week's testing. |

## Validation and release boundary

- Original 0.14.22 validation on 2026-10-05: 70 tests, lint, package build and
  package verification passed under Node 22.20.0/Yarn 4.17.0.
- Recovery validation on 2026-10-07: `yarn test` (including existing local UDP
  transport integration) passed all 70 tests; `yarn lint` passed under the same
  versions. The initial sandbox run blocked UDP binding; the complete suite
  passed with local socket access enabled. `git diff --check` passed.
- Hardware observations are the user's original 2026-10-05 reports. No hardware
  test was performed during recovery. The PA1U B-at-module-restart fix is
  confirmed; separately itemized A/B repetitions, full Companion restart,
  interface/network recovery, failover, endurance and platform qualification
  remain open in `STABILITY_CHECKLIST.md`. Mixer snapshots remain separately
  unqualified. No Production promotion was requested.
- Original Candidate archive:
  `iconnectivity-interfaces-v0.14.22-CANDIDATE.tgz`, SHA-256
  `6edee0780fd7104d58e20e2323bd697b66813ab8f3f7d70f232d08caff5705b6`.
  This hash is recorded from the original build log; the original binary is not
  available in the recovery checkout and has not been uploaded to GitHub by
  this audit. Archives are ignored by the repository. This audit does not
  rebuild or reuse 0.14.22, replace the tested package or claim byte identity
  for a newly generated package. Future packaged changes require a new version.

## Other branch to reconcile

On 2026-10-07, `claude/youthful-heisenberg-p8bcso` contained separate 0.15.0
audit work based directly on the 0.14.13 main baseline. Its release notes mention
a failed 0.14.14 installation because that version already existed, but lack
this original 0.14.14–0.14.22 history. Preserve that branch. Any future integration
must explicitly reconcile it against the restored 0.14.22 source and history;
its larger version number does not prove it contains these changes or supersede
the user's tested Candidate.

Chronological research notes retain earlier pending statements as historical
observations. The latest release state and validation are defined by `STATUS.md`
and this audit; a later confirmation supersedes an earlier pending statement.
