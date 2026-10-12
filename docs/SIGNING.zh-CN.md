# 安装包签名与 Mac 公证

[English](SIGNING.md)

当前公开的 v0.5.5：Windows 安装包未正式签名；Mac 应用采用临时签名，尚未公证。本次已准备签名配置、验证脚本和 CI 工作流，但还没有用真实证书完成打包。需要先开通账号和证书。

## Mac 开通步骤

1. 加入 [Apple Developer Program](https://developer.apple.com/programs/enroll/)。官方费用为每年 99 美元，注册时以当地币种和价格为准。实名认证、协议接受和付款由账号所有者操作。
2. 按照 [Apple 的说明](https://developer.apple.com/help/account/certificates/create-developer-id-certificates)创建 **Developer ID Application** 证书，并将证书及对应私钥安装到本机登录钥匙串。普通 Apple Development、Mac Distribution 或 Developer ID Installer 证书不能代替它。
3. 本机运行 `xcrun notarytool store-credentials desksignal-notary`，按交互提示将公证凭据保存到钥匙串。设置 `APPLE_KEYCHAIN_PROFILE=desksignal-notary` 和十位的 `APPLE_TEAM_ID` 后执行 `npm run dist:mac:signed`。密码不写进命令历史，私钥也不要发到聊天里。
4. 使用 GitHub CI 时，将证书连同私钥导出为有密码的 `.p12`，并创建有公证权限的团队 App Store Connect API Key。按下表自行填写 GitHub Secrets。流程临时写入 `.p8` 文件，退出打包步骤时删除。

流程会给应用和原生输入助手签名，开启 hardened runtime 和安全时间戳。Electron 使用 JIT 权限，原生助手不授予 JIT 或关闭库验证的权限。应用先公证并附加票据，签名后的 DMG 再单独提交公证；只有 Apple 返回 `Accepted` 才附加并验证 DMG 票据。最终检查 Developer ID、Team ID、运行时、时间戳以及 Gatekeeper。使用全局输入手势时仍需用户授予辅助功能权限。

## Windows 选择方案

正式签名需要受信任的代码签名服务。签名可以证明发布者和文件完整性，但新文件仍可能出现 SmartScreen 声誉提示，不能保证完全无提示安装。[微软说明](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)

- **微软 Azure Artifact Signing：** 使用 Public Trust。根据[当前开通要求](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)，个人开发者必须位于美国或加拿大。符合条件时，创建 Public Trust 证书配置，并为 CI 服务主体授予限定到证书配置的签名角色。不要使用不真实的身份或地区申请。当前托管 Windows CI 支持这一方案。
- **证书机构的硬件令牌或 HSM：** 选择接受你身份和地区的机构。安装其 Windows 签名驱动和证书，连接令牌，由你完成 PIN 或授权提示。设置 `DS_WINDOWS_SIGNING_PROVIDER=store`、证书的 40 位指纹 `DS_WINDOWS_CERT_SHA1`、精确的证书 Common Name `DS_WINDOWS_PUBLISHER`，在该 Windows 电脑执行 `npm run dist:win:signed`。GitHub 托管机器无法连接你的 USB 令牌；其他云 HSM 的专用接口需在选择服务后另行接入。
- **开源免费申请：** [SignPath Foundation](https://signpath.org/)为符合条件的开源项目提供免费签名，可以申请，但不能保证获批。当前流程尚未接入 SignPath。

Windows 流程为主程序、原生助手和 NSIS 安装包签名，使用 SHA-256 和时间戳，并验证签名有效性、时间戳和发布者。保留自动更新的签名检查。自签证书不能解决公开下载的信任问题。

## GitHub 配置位置

进入仓库 Settings → Environments，新建 `signing`，限制部署分支为 `main`。仓库方案支持时可设置审核人。下面的信息由你直接填入 GitHub，不要贴到聊天、提交进仓库或放进 Issue。Git 已忽略 `.p12`、`.pfx`、`.p8`、`.signing/` 和正式签名输出目录。

| Environment Secret 名称 | 内容 |
| --- | --- |
| `MAC_CERTIFICATE_P12_BASE64` | 包含私钥且有密码的 `.p12` 文件的 Base64，不是 data URL |
| `MAC_CERTIFICATE_PASSWORD` | `.p12` 导出密码 |
| `APPLE_API_KEY_P8` | 公证 API 的 `.p8` 原文 |
| `APPLE_API_KEY_ID` | API Key ID |
| `APPLE_API_ISSUER` | 团队 API Key 的 Issuer UUID |
| `AZURE_TENANT_ID` | 符合 Public Trust 开通条件的租户 ID |
| `AZURE_CLIENT_ID` | 签名服务主体 ID |
| `AZURE_CLIENT_SECRET` | 服务主体密钥；限制签名权限并定期轮换 |

| Environment Variable 名称 | 内容 |
| --- | --- |
| `APPLE_TEAM_ID` | Apple Team ID |
| `DS_WINDOWS_PUBLISHER` | 证书精确的 Common Name / 发布者名称 |
| `DS_AZURE_SIGNING_ENDPOINT` | 以 `.codesigning.azure.net` 结尾的地区 HTTPS 服务地址 |
| `DS_AZURE_SIGNING_ACCOUNT` | 签名账号名称 |
| `DS_AZURE_CERTIFICATE_PROFILE` | 已通过验证的 Public Trust 证书配置名称 |

配置后，从 `main` 运行 Actions → **Build signed installers**，选择 Mac、Windows 或两者。它仅有仓库读取权限，成功后保存已验证的安装包、更新文件和 Mac 公证回执到 Actions Artifacts，保留 7 天；不会自动发布公开 Release。缺失凭据、签名无效或公证拒绝都会失败。本机输出为 `release-signed/`。

## 首次正式发布

使用新版本号，例如 0.5.6，并同步 lockfile。不要替换现有 v0.5.5 的文件及校验值。真实证书打包成功后，在干净 Windows 和 Mac 上测试下载及安装。用实际测试的代码提交创建草稿 Release，上传签名 EXE、与之匹配的 `latest.yml` 和 blockmap、公证并附加票据的 DMG，以及新计算的 SHA256SUMS。两端通过后才发布并修改主页下载链接及签名说明。现有 **Release** 工作流仍生成开发用包，不能用于发布正式签名版。它现在只接受手动运行并明确勾选 `allow_unsigned`，拒绝覆盖已公开的 Release；创建标签不会再自动触发未签名打包，避免覆盖正式签名版本。

当前验证范围：签名拒绝与结果验证测试、TypeScript 检查、electron-builder 26.15.3 的 Mac / Windows 证书存储 / Azure 三种配置校验。真实签名、公证和干净机器安装尚待账号及证书开通。
