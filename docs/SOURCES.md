# Authoritative sources

Research snapshot: 2026-08-15.

1. [iConnectivity downloads](https://www.iconnectivity.com/downloads) - canonical current manuals, firmware, drivers and Auracle X downloads.
2. [Common System Exclusive Commands, Rev. 26 (2025-07-01)](https://cdn.iconnectivity.com/docs/Common_System_Exclusive_Commands.pdf) - legacy products through PID 13; discovery, MIDI/audio routing, RTP-MIDI, meters, mixer, snapshots, automation, hardware/failover.
3. [Common System Exclusive Commands TNG, Rev. 1 (2025-07-01)](https://cdn.iconnectivity.com/docs/Common_System_Exclusive_Commands_TNG.pdf) - mioXL PID 14, mioXM PID 15, mioXC PID 16 and PlayAUDIO1U PID 17; session/notification/parameter model.
4. [Auracle X User Guide 2.1 (2026-02)](https://www.iconnectivity.com/s/iConnectivity-AX-21-Manual_v2.pdf) - visible behavior for audio, failover, routing, filters/remap, presets, RTP-MIDI, USB host reservation and control ports.
5. [PlayAUDIO12 User Guide 1.0](https://www.iconnectivity.com/s/PlayAUDIO12_User_Guide.pdf) - hardware, failover, host/ethernet MIDI and control I/O.
6. [PlayAUDIO1U product page](https://www.iconnectivity.com/playaudio1u) and current owner manual linked from downloads - 12 XLR outputs, two USB-C hosts, 22 RTP-MIDI ports, DIN/USB host, failover, audio protection, display metering/status.
7. [Bitfocus TypeScript module template](https://github.com/bitfocus/companion-module-template-ts) - current Node 22/API 2 module layout.
8. [Bitfocus Generic MIDI module](https://github.com/bitfocus/companion-module-generic-midi) - cross-platform `@julusian/midi` transport and native prebuild packaging convention.

Public product manuals describe user-visible behavior, while the two SysEx specifications define implementability. Auracle X behavior alone is not treated as proof that a public message exists.
