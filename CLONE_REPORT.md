# DeskSignal verification report

Verified locally on Apple Silicon, 2026-10-12.

| Check | Result |
| --- | --- |
| TypeScript, including the settings preview | `npm run typecheck` passed. |
| Existing behavioral tests | 44 files, 715 passed, 1 skipped. |
| Native helper tests | 476 passed, 0 failed. |
| Desktop application build | `npm run build` passed for main, preload and both renderer pages. |
| Homepage build | `npm run build:site` passed. |
| Actual browser interaction | Dragging the virtual desktop creates real ping DOM nodes and visible signal animation; observed in Chrome. |
| Settings preview | Actual settings components render with DeskSignal artwork, mint controls, navigation and Chinese copy. Preview is explicitly marked as mock IPC. |
| Homepage video | Chrome reports readyState 4, no media error, 1600×900, duration 16.601995 s. |
| Encoded media | ffprobe confirms H.264 video at 30 fps and AAC audio, 717,387 bytes. |
| Capture renderer | No renderer errors; 360 changed frames and five sound cues captured. |
| Visual QA | Inspected sampled frames including open wheel and animated bee emote, and the homepage/settings screenshots. |
| Preserved code | LICENSE and wheel, ping-effect, encryption and transport implementation files match the upstream baseline. |

The settings/website deliberately have a new visual identity, so pixel equality with the old interface is not an acceptance criterion. Signal rendering fidelity comes from retaining the real renderer rather than approximating it.

Not exercised: Windows runtime, multi-device rooms and exclusive fullscreen. Mac system permission prompts and the installed-app keyboard-only gesture were exercised in 0.5.2. The existing tests and builds support these paths, but do not replace actual OS/device testing. Dependencies remain at upstream's pinned versions; npm reported 9 audit findings during installation (8 moderate, 1 high), which were not automatically changed as part of this visual fork.

## 0.5.2 keyboard hold verification

Type checking, the desktop package build and the updated video/site build passed. New real-helper protocol tests verify key down → wheelOpen, unpressed mouse movement → wheelMove, key up → wheelRelease for both ping and emote wheels. Native tests additionally cover Escape/right-click cancellation, normal clicks, Ctrl+C/Alt+Tab-style chords, pause/suspend/config changes, custom keys, negative monitor coordinates, full-screen probes and stale modifier recovery. The rebuilt 0.5.2 app was launched with its new setting enabled; the user restored its macOS Accessibility grant and confirmed that the new keyboard-only operation works normally. The user previously confirmed the 0.5.1 drag wheel, signal animation and sound on their desktop.
