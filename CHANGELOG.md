# LOL Pings-DeskSignal-App change notes

**English** · [简体中文](CHANGELOG.zh-CN.md)

Complete version: **0.5.5** · Maintainer: [xiaoyu607](https://github.com/xiaoyu607) · Updated: 2026-10-12.

DeskSignal is improved on the basis of the [original lolPing repository](https://github.com/darrenprx/lolPing). Required MIT notices remain in [LICENSE](LICENSE). Existing room encryption, networking, multiple-display support and base signal effects are retained.

## Brand, settings and introduction

- DeskSignal branding, custom icons and menu-bar artwork.
- Redesigned settings studio with teal styling and new navigation.
- Demo website with the existing introduction MP4, sound and interactive wheel preview.
- Introduction rendered using the application's actual overlay, showing Danger, On My Way, Assist Me, All In and animated emotes.
- Independent application ID `io.github.xiaoyu607.desksignal`, data folder and project/update source.
- English repository introduction and website by default, with Simplified Chinese versions of the README, implementation notes, change notes and website descriptions.

## 0.5.2: Hold a key to open a wheel

- Hold Option / Alt for signals or Control / Ctrl for emotes, without holding the left mouse button.
- Move to choose a slice and release the trigger key to send.
- Optional switch restores the original click-drag gesture; mouse side buttons keep their drag gesture.
- Handle cancellation, key combinations and input-state changes to reduce accidental sends.

## 0.5.3: Click confirmation and custom media

- Left click confirms the current selection while the trigger is held; key release does not send again.
- Import still images, GIF / animated WebP and paired MP3 / WAV / OGG / M4A.
- Import MP4 / WebM clips with embedded audio.
- Audio: up to 10 seconds / 10 MB. Video: up to 10 seconds / 20 MB / longest side 1024 px.
- Animated images: up to 5 MB / longest side 1024 px. Still images: up to 8 MB.
- Validate media types and actual decoding; honor volume, mute and emote sound settings.
- Restart on resend; stop audio and release resources when replaced or finished.

## 0.5.4–0.5.5: Send modes and selectable centers

- Select key release only, left click only, or either (default).
- Click-only mode cancels an unconfirmed selection on key release. Release-only mode cancels on a click and passes it through.
- Fix emote-center selection and sending.
- Fix Option signal-wheel center/outer click confirmation, key-release sending and duplicate sends.
- Both centers follow their configured content, including custom media in the emote center.

## Validation

- Local Apple Silicon Mac package, signature integrity and DMG verification completed.
- Interactive tests confirmed keyboard opening, center/outer confirmation and no duplicate send after clicking then releasing.
- Interactive tests confirmed animated GIF with paired audio and MP4 with embedded sound.
- TypeScript checks passed; 735 automated tests passed and one was skipped; 525 native helper tests passed.
- Real Electron media and production-overlay tests cover import, playback, center/outer selection and duplicate prevention.
- Windows build configuration is retained; the new interactions were not tested on a Windows device.

## Scope and limitations

- Rooms synchronize desktop signals/emotes, without voice calls, video meetings or screen sharing.
- Existing LAN, encrypted relays, eight-member limit and display mapping are retained. Live cross-device and mainland China relay tests remain necessary.
- Imported media and custom audio stay local; rooms do not distribute those files. Remote custom emotes keep the existing static placeholder behavior.
- Tencent Meeting / VooV detection, automatic prompts and meeting-leave disconnection are not included; that development was reverted.
- Local Mac packages are ad-hoc signed and not notarized. Rebuilds may require granting Accessibility access again.
- Riot Games images, animations and sounds are excluded from the MIT source license.
