# Status

## Working Now

- TNG support is limited to documented framing/session identity and selected preset/scene discovery reads.
- Legacy PlayAUDIO12 and other supported legacy capability paths remain the primary implemented control surface.

## Recently Completed

- v0.13.3 package work: MIDI Clock variables, configurable RTP session name, preset/scene recall state, and improved offline/configuration-session recovery.
- Legacy and TNG protocol tests plus transport and module tests are present under `tests/`.

## Known Issues

- Full TNG control for PlayAUDIO1U, mioXL, mioXM, and mioXC is not implemented.
- Hardware interoperability coverage is still needed across protocol families, firmware versions, operating systems, and multiple identical devices.
- Audio-protection mapping on PlayAUDIO1U is not confirmed by the public protocol and remains deferred.

## Next Steps

- Use `docs/IMPLEMENTATION_PLAN.md` and `docs/CAPABILITY_MATRIX.md` to choose the next TNG slice.
- Add hardware-captured fixtures and tests before expanding device writes or notification handling.
- Keep generated packages, captures, and build output out of source review unless specifically needed.
