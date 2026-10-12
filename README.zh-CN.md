<div align="center">

<h1>LOL Pings-DeskSignal-App</h1>
<p><a href="README.md">English</a> · <strong>简体中文</strong></p>
<p><strong>让桌面默契同步。</strong><br>
按住 Option / Alt 打开信号轮盘，Control / Ctrl 打开表情轮盘。<br>
移动鼠标选择，松键或点击发送，无需长按左键。</p>
<p>
  <a href="https://github.com/xiaoyu607/LOL-Pings-DeskSignal-App/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/xiaoyu607/LOL-Pings-DeskSignal-App/ci.yml?branch=main&amp;label=CI&amp;logo=github" alt="CI status"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/source-v0.5.5-79c99e" alt="Source version 0.5.5"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/source-MIT-79c99e" alt="Source code license: MIT"></a>
</p>
<p><strong><a href="https://github.com/xiaoyu607/LOL-Pings-DeskSignal-App/releases/download/v0.5.5/DeskSignal-Setup-0.5.5.exe">下载 Windows x64 安装包</a></strong> · <strong><a href="https://github.com/xiaoyu607/LOL-Pings-DeskSignal-App/releases/download/v0.5.5/DeskSignal-0.5.5-arm64.dmg">下载 Mac（Apple 芯片）</a></strong></p>
<p><a href="https://github.com/xiaoyu607/LOL-Pings-DeskSignal-App/archive/refs/heads/main.zip">下载源码</a> · <a href="assets/media/desksignal-demo.mp4">观看演示视频</a> · <a href="NOTES.zh-CN.md">实现说明</a></p>

<p><a href="https://github.com/xiaoyu607/LOL-Pings-DeskSignal-App">喜欢就给一个星星吧 🌟</a></p>

</div>

DeskSignal 由 xiaoyu607 维护，在 [lolPing 原仓库](https://github.com/darrenprx/lolPing) 的基础上改进，重新设计品牌、图标、设置控制台和展示主页，并扩展键盘轮盘操作与自定义媒体表情。

当前完整版本为 **0.5.5**，本仓库包含完整源码、原生辅助程序、媒体素材、展示主页和自动测试。完整的改动、验证结果及已知限制见 [改动说明](CHANGELOG.zh-CN.md)。

<div align="center">

<h2>效果展示</h2>
<a href="assets/media/desksignal-demo.mp4"><img src="assets/media/desksignal-poster.jpg" alt="播放 DeskSignal 演示视频" width="800"></a>
<p><a href="assets/media/desksignal-demo.mp4">播放／下载 MP4</a> · <a href="assets/media/desksignal-poster.jpg">视频封面</a></p>

</div>

视频直接使用应用的真实 overlay 渲染器制作，展示信号轮盘、危险／正在赶来／请求协助／全力进攻信号和表情。主页的播放器带音效，默认静音播放，可自行开启声音。

签名状态：v0.5.5 的 Windows 包未正式签名，Mac 包为临时签名、尚未公证。[正式签名与公证配置](docs/SIGNING.zh-CN.md)。

## 产品特色

| 特色 | 使用方式 |
| --- | --- |
| 只按键位开轮盘 | Option / Alt 打开信号轮盘，Control / Ctrl 打开表情轮盘，无需长按左键。 |
| 自己选择发送方式 | 仅松键、仅左键或两者均可；左键确认后松键不重复发送。 |
| 轮盘中心也能发送 | 中心信号与表情跟随设置，停在中心即可确认。 |
| GIF + 自定义音频 | 导入自己的 GIF / WebP 动图，为图片配对 MP3 / WAV / OGG / M4A。 |
| 带声音的短视频 | 导入自带音频的 MP4 / WebM，最长 10 秒。 |
| 调整自己的轮盘 | 自定义触发键、扇区、中心内容、显示大小、持续时间及音量。 |
| 多显示器与共享房间 | 原有多显示器坐标映射和最多 8 人加密房间功能保留。 |

## 本地运行

需要 Node 22.12+。Mac 需要 Apple 芯片和 Xcode 命令行工具。

```sh
npm ci
npx install-electron
npm run build:helper
npm run dev
```

Mac 首次运行需要给运行程序开启辅助功能权限。

```sh
npm run dev:site       # 展示主页及真实效果试玩
npm run dev:settings   # 浏览器内预览真实设置组件（模拟 IPC，不连接桌面或房间）
npm run video          # 重新渲染带音效 MP4，并构建包含视频的主页
npm run typecheck
npm test
npm run test:helper
npm run dist:mac       # Apple 芯片 DMG
npm run dist           # Windows 安装包，需 Windows 开发环境
```

## 键盘操作（默认）

- 按住触发键立即显示轮盘，不需要点击或长按左键。
- 移动鼠标到扇区，松开触发键或按下左键发送；左键确认后松键不会重复发送。信号和表情轮盘停在中心确认时，均发送所设置的中心内容。
- 设置 → 触发 → “轮盘发送方式”：可选仅松开触发键、仅按下左键、两者均可（默认）。仅左键模式下，未点击就松键会取消；仅松键模式下，点击会取消轮盘并传给下方程序。
- 两种轮盘的中心图标均跟随设置；表情中心还支持自定义 GIF、配音和短视频。
- Esc、右键取消；组合键会关闭轮盘并交给原程序，避免误发送。
- 设置 → 触发 → 关闭“按住键位自动显示轮盘”可恢复原来的左键拖动方式。鼠标侧键保持原来的拖动手势。

## 自定义表情（0.5.3）

设置 → 表情 → “配对音频…”选择自己的 MP3/WAV/OGG/M4A，再点“添加图片 / 视频…”导入图片或 GIF。所选音频会配对接下来导入的图片，点击“移除配对音频”恢复无声导入。可直接导入自带声音的 MP4/WebM 短视频，视频不使用单独配对的音频。点击表情预览，或把它放进轮盘后按 Control 使用。

- 音频最长 10 秒、最大 10 MB；视频最长 10 秒、最大 20 MB、最长边 1024 像素。系统必须支持文件的实际编码。
- GIF/WebP 动图最大 5 MB、最长边 1024 像素；静态图片最大 8 MB。
- 声音遵守表情音效开关、总音量和静音设置；重复发送会重播，替换或结束时停止声音。
- 自定义媒体保存在本机的 DeskSignal 数据目录。房间不会传输媒体文件或自定义声音，远端保持原有静态占位行为。
- `npm run test:media` 使用 ffmpeg 生成测试素材，以真实 Electron 解码器验证媒体导入和桌面渲染流程。

## 和原版的区别

- DeskSignal 名称、自制品牌图标及青绿色设置控制台。
- 新的中文展示主页，嵌入使用同一渲染器录制的 MP4，并提供在线拖动试玩。
- 独立应用 ID `io.github.xiaoyu607.desksignal`；设置放在 `DeskSignal/settings.json`，不会覆盖原版。
- 更新和项目链接指向 `xiaoyu607/LOL-Pings-DeskSignal-App`；仅从本仓库的 Release 获取新版。
- 房间协议及加密命名空间保留，维持与上游的协议兼容性；跨设备互通仍需实际测试。

源码与构建方式见 [中文实现说明](NOTES.zh-CN.md) 和 [TEARDOWN.md](TEARDOWN.md)。

## 署名与素材

本项目由 xiaoyu607 维护，在原仓库基础上改进。代码遵循 MIT；所需版权与许可声明保留在 [LICENSE](LICENSE)。

信号、表情图像、动画及音效归 Riot Games 所有，不属于 MIT 授权范围。本项目与 Riot Games 无关联且未获其背书。
