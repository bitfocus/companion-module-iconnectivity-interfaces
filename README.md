# iConnectivity Companion module

Bitfocus Companion module for iConnectivity PlayAUDIO and mio-family audio/MIDI interfaces.

The current beta-quality implementation provides self-contained Ethernet AppleMIDI/RTP-MIDI, optional local USB MIDI, device identity, online state, complete basic MIDI send/receive actions, Generic MIDI-compatible trigger variables, MIDI Clock monitoring, preset recall/state and PlayAUDIO Scene A/B recall/state. PlayAUDIO1U and mioXM over Ethernet initiator mode are the locally hardware-tested focus.

Full TNG routing, failover, meters, audio control and notification support remains in development. Other products and platforms should be treated as experimental until listed as hardware-validated in `docs/CAPABILITY_MATRIX.md`.

## Device prerequisite

Preset and PlayAUDIO Scene receive channels must be configured once on each interface with iConnectivity Preset Selector. The same channels are then entered in the Companion connection. The module does not overwrite device routing.

## Development

Requires Node 22.20.x and Yarn 4 through Corepack.

```sh
corepack yarn install
corepack yarn build
corepack yarn test
corepack yarn lint
corepack yarn package
```

See `companion/HELP.md` for user setup, `PROJECT_CONTEXT.md` for a complete cold handoff, `README_AI.md` for architecture and `docs/README.md` for focused technical documentation.

## Safety

Factory reset, firmware update, bootloader, shutdown and reboot-required configuration writes are intentionally excluded. Device protocol responses—not product-name assumptions—must authorize supported controls.
