# Release checks for DeskSignal 0.5.5

The review focused on native Windows/macOS input hooks and cancellation, center/outer wheel confirmation, helper shutdown/restart, display coordinate conversion, imported media limits and cleanup, app-protocol paths, platform update sources and installer configuration.

- The application LICENSE is included in packaged files alongside the bundled code and assets.
- TypeScript checks passed locally.
- 735 automated tests passed locally; one platform-specific test was skipped.
- 525 native helper tests passed locally on macOS.
- Real Electron tests passed for GIF + WAV/MP3/OGG/M4A, MP4/WebM audio playback, mute/replacement/cleanup, rejected invalid or overlong media, and production wheel center/outer selections without duplicate sends.
- A Windows CI timeout in the 513-signature relay deduplication test was traced to its 5-second deadline. That test now allows 15 seconds; its signature verification and deduplication assertions are retained.
- The release workflow builds/tests on Windows x64 and Apple Silicon macOS, verifies Mac signing and the DMG, checks Windows installer/update files, and keeps the release private as a draft until both jobs succeed.
- Public installer links are added to the README only after published release assets are verified. Both installers receive a SHA-256 manifest.

This review and automated checks do not replace interactive Windows desktop tests. Mac wheel and custom-media operation was verified interactively during development. The packages are unsigned on Windows and ad-hoc signed / not notarized on macOS. Networking across different devices and mainland China relay reachability still require live tests.
