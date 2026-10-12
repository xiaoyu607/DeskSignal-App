# DeskSignal 0.5.5

Desktop signals, emotes and sound—one key away. Improved on the basis of the original lolPing repository, with DeskSignal branding and a redesigned settings studio.

## Downloads

- **Windows x64**: `DeskSignal-Setup-0.5.5.exe`
- **Mac Apple Silicon**: `DeskSignal-0.5.5-arm64.dmg`
- Verify either installer against `SHA256SUMS.txt`.

## Features

- Hold Option / Alt for signals or Control / Ctrl for emotes, without holding a mouse button.
- Choose key-release, left-click or either confirmation; no duplicate send after clicking.
- Send the configured ping or emote from the wheel center.
- Import GIF / animated WebP with paired MP3 / WAV / OGG / M4A audio.
- Import MP4 / WebM clips with embedded sound, up to 10 seconds.
- Customize trigger keys, slices, center content, display size and volume.
- Retain multiple-display mapping and encrypted rooms for up to eight users.

## Platform notes

Both installers are built and tested on their corresponding GitHub Actions runners. Windows desktop gestures have not been interactively tested on a physical Windows device. Mac wheel and custom-media behavior was previously verified interactively; this release also runs real Electron media tests locally.

The Windows installer is unsigned. The Mac package is ad-hoc signed, not notarized; allow Accessibility access for DeskSignal to use global keyboard/mouse gestures. A rebuilt Mac app may require granting that permission again.

Custom media/audio stays local and is not distributed to room participants. Rooms do not provide voice calls, video meetings or screen sharing. Tencent Meeting / VooV detection is not included. Riot Games assets are excluded from the MIT source license; original notices remain in LICENSE.

---

## 简体中文

- **Windows x64 安装包**：`DeskSignal-Setup-0.5.5.exe`
- **Apple 芯片 Mac 安装包**：`DeskSignal-0.5.5-arm64.dmg`
- 可用 `SHA256SUMS.txt` 核对下载文件。

支持按键直接打开轮盘、松键／左键确认、防重复发送、轮盘中心发送、自定义 GIF 配音频以及最长 10 秒的带声音视频。

两端均在对应系统的 GitHub Actions 上构建和测试；尚未在 Windows 实机上人工测试全局手势。Mac 轮盘及媒体已人工验证，本次发布也运行本地真实 Electron 媒体测试。

Windows 安装包未签名，Mac 使用临时签名且未公证；Mac 全局手势需要辅助功能权限。自定义媒体仅保存在本机，房间不传输媒体或自定义声音；不包含腾讯会议／VooV 检测。素材与许可范围见 LICENSE。

If you like it, give it a star 🌟 / 喜欢就给一个星星吧 🌟
