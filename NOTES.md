# LOL Pings-DeskSignal-App implementation notes

**English** · [简体中文](NOTES.zh-CN.md)

## Baseline and ownership

DeskSignal is maintained by xiaoyu607 and improved on the basis of the [original lolPing repository](https://github.com/darrenprx/lolPing). Baseline: `f24a51e5a11c2b31dab72d89a571cc4025ad3c98` (main, including v0.5.1). The complete current version is **0.5.5**.

The source license is MIT. Original copyright and permission notices are retained, with an additional notice for DeskSignal modifications. Riot-owned graphics and audio are excluded from that license; see [LICENSE](LICENSE).

## Keyboard wheels and confirmation

The C++ input helper adds a `Hold` state: pressing a keyboard trigger opens the wheel at the cursor; free mouse movement selects a slice or the center. `holdToOpen` defaults to true, including settings migration. Turning it off restores the original drag state machine, and mouse side buttons retain their existing drag gestures.

`holdSendMode` selects `release`, `leftClick` or `both` (default). The helper derives `sendOnRelease` and `sendOnLeftClick` from it. Clicking to confirm blocks another send on key release. Release-only mode cancels and passes through a click; click-only mode cancels on key release unless the click has confirmed the selection. Esc, right click, key chords, suspension, disabling and configuration changes cancel the gesture.

Both ping and emote wheels use a selectable center. The center follows `clickPingId` / `clickEmoteId`; the overlay renders its icon and selects it inside the dead zone. The production overlay tests cover center selection, outer slices and duplicate prevention.

## Custom media emotes

The settings renderer prepares and decodes imported media; the main process validates containers and limits again. Static images, GIF / animated WebP, paired MP3 / WAV / OGG / M4A and MP4 / WebM with embedded audio are supported. Audio/video is capped at 10 seconds; full size limits are in [README.md](README.md).

Files use hashed IDs in the local emote library. The app protocol serves image, animation, video and audio content, including streaming range requests for media. Playback follows volume and mute settings, restarts on resend, and stops and releases resources when replaced or finished. The overlay also enforces the duration cap.

Room packets do not transfer imported media or custom sound. Remote custom emotes keep the existing static placeholder behavior.

## Overlay, displays and rooms

Animations, sounds, wheel selection, display coordinate conversion and room encryption/transports remain based on upstream code. Lowercase protocol namespaces are retained for compatibility. Branding, app ID, local settings directory and update source are independent.

Rooms retain LAN discovery, encrypted relay transport and normalized display coordinates, for up to eight members. Room startup means the connection attempt has begun; it does not prove another participant is reachable. Live multi-device and mainland China network tests remain necessary. Tencent Meeting / VooV detection and automatic meeting prompts are not included.

## Introduction video and website

The existing introduction MP4 is embedded near the top of the demo website and linked from both READMEs. It has Chinese captions. `tools/capture-video.mjs` renders an authored virtual desktop using the same overlay renderer as the app and mixes signal/emote sounds at their cue timestamps. It does not record the user's personal desktop.

The website defaults to English. Its Simplified Chinese link uses `?lang=zh-CN` and translates the descriptions, product features, wheel legend and sound controls. The settings browser preview uses a mock IPC adapter; it neither grants system input access nor contacts relays.

## Validation

Version 0.5.5 passed TypeScript checks, 735 automated tests (one skipped), 525 native helper tests and real Electron media/overlay checks. Interactive Mac tests confirmed keyboard opening, center/outer confirmation, no duplicate sends and GIF/audio/video playback. Mac packaging, signature verification and DMG verification were completed.

Browser previews alone do not establish desktop input or network behavior. Windows interactions, exclusive fullscreen behavior and multi-device room networking require their own live system tests. See [CHANGELOG.md](CHANGELOG.md) for changes and limitations.
