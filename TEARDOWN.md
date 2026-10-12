# Source-backed architecture

All statements below are SOURCE evidence from this checkout, rather than inferred algorithms.

| Pillar | Source | Role |
| --- | --- | --- |
| Global input | `src/main/inputBridge.ts:22`, `native/hook-helper/src/` | Spawns the C++ helper and exchanges JSON-line input events. |
| Signal wheel | `src/renderer/overlay/main.ts:39`, `src/renderer/overlay/wheel.ts` | Uses the same eight-slice selection and open/move/release handlers. |
| Signal animations | `src/renderer/overlay/main.ts:68`, `src/renderer/overlay/pingFx.ts` | Draws the ping, rings, glow and All In clash at the selected location. |
| Emotes | `src/renderer/overlay/emoteFx.ts:55`, `src/renderer/overlay/main.ts:99` | Decodes and displays real bundled/custom emote artwork and animation. |
| Shared rooms | `src/main/roomManager.ts:97`, `src/main/lanTransport.ts:51`, `src/main/relayTransport.ts:26` | Room membership, local UDP and encrypted relay transport. |
| Encryption | `src/main/roomCrypto.ts:21` | The upstream scrypt namespace and authenticated message encryption are preserved for protocol compatibility. |
| Independent identity | `src/main/index.ts:36`, `src/main/paths.ts:28` | A separate app ID and DeskSignal settings directory. |
| Update ownership | `src/main/updateMac.ts:7`, `src/main/updateWin.ts:13`, `package.json` | Release API, notes and package updater point to xiaoyu607/LOL-Pings-DeskSignal-App. |
| Homepage film | `site/film.ts`, `tools/capture-video.mjs` | Authors virtual-desktop gestures, records the real overlay rendering, and mixes original sound assets at emitted cue times. |
| Settings preview | `preview/main.ts` | Mock preload IPC loads the actual React settings components for browser inspection. |

The signal/wheel/crypto/transport implementation files were compared with upstream and retained unchanged. In 0.5.2 the native helper additionally implements the keyboard-only Hold state in decision.cpp and obtains cursor coordinates for keyboard events in both platform hook adapters. Dedicated tests cover gesture ownership, release/cancel behavior, normal shortcuts and lost key-ups. No reimplementation of visual effects was substituted.
