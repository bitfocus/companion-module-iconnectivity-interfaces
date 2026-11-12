# companion-module-iconnectivity-interfaces

[Bitfocus Companion](https://bitfocus.io/companion) module for iConnectivity PlayAUDIO and mio audio/MIDI interfaces.

## Installing

In Companion 4.3 or later, add a connection and search for **iConnectivity**. Companion installs the module from its module list.

### Test builds (optional)

Newer builds that are still being tested are published on the **[test builds page](https://github.com/mikecreates86/companion-module-iconnectivity-interfaces/releases/latest)**: open the link, and under **Assets** click the file ending in **`.tgz`**. Then, in Companion, go to the **Modules** page and import that file. Each test build has a higher version number than the one before, so Companion will accept it, and says which version is trusted for live use (also recorded in `STATUS.md`). Use the module list version unless you are helping test.

## What it does

- Recall device presets, PlayAUDIO Scene A/B and mixer snapshots.
- Live feedback of the device's current preset (with name) and Scene, confirmed by the device rather than assumed from the last button press.
- Send and receive MIDI over Ethernet, with Generic MIDI-compatible variables and MIDI Clock BPM.
- Self-contained AppleMIDI/RTP-MIDI: no operating-system network-MIDI daemon needed, and Auracle can stay connected over Ethernet at the same time.

## Supported devices

| Device      | Status                                |
| ----------- | ------------------------------------- |
| PlayAUDIO1U | Tested on hardware over Ethernet      |
| mioXM       | Tested on hardware over Ethernet      |
| PlayAUDIO12 | Supported, not yet tested on hardware |
| mioXL       | Supported, not yet tested on hardware |

USB MIDI and RTP responder mode are available but not yet hardware-tested; see the in-app help. Full routing, metering and audio control for PlayAUDIO1U/mio X-series are not implemented.

## Setup

Presets, Scenes and mixer snapshots are recalled with MIDI Program Change, so each interface must first be set up with iConnectivity **Preset Selector**. Then add the connection in Companion with the interface's IP address and RTP port. Step-by-step instructions, troubleshooting and the full list of actions, feedbacks and variables are in [`companion/HELP.md`](companion/HELP.md), which Companion shows from the connection's help icon.

## Safety

The module never changes device routing or Preset Selector settings, and it deliberately excludes factory reset, firmware update, bootloader, shutdown and reboot-required configuration writes. Controls are offered only when the device's protocol reports the capability, not on the strength of a model name.

## Development

Requires Node 22.20+ and Yarn 4 via Corepack.

```sh
corepack yarn install
corepack yarn test      # build and run all tests (needs loopback UDP)
corepack yarn lint
corepack yarn package   # build an importable .tgz in the project folder
```

- `src/`: module source. `src/network/` is the AppleMIDI/RTP-MIDI transport; `src/protocol/` holds the iConnectivity legacy and TNG SysEx codecs.
- `tests/`: Node test-runner suites, including a loopback fake interface for connection lifecycle tests.
- A new store version in `package.json` is tagged `vX.Y.Z` automatically when it reaches `main` (`.github/workflows/store-tag.yaml`). Downloads are published hourly from the owner's download page, `mikecreates86/companion-module-iconnectivity-interfaces` (`.github/workflows/release.yaml`): store versions as `X.Y.Z`, other changes as test builds such as `1.0.2-test.1`. The release notes come from `WHATS_NEW.md`.
- Protocol notes, capability status and test plans are in [`docs/`](docs/README.md). Release history and procedure are in [`releases/README.md`](releases/README.md).

## License

MIT, see [LICENSE](LICENSE).
