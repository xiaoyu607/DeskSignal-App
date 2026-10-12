# Signed installers and macOS notarization

[简体中文](SIGNING.zh-CN.md)

Status: the public v0.5.5 Windows installer is unsigned; its Mac DMG contains an ad-hoc signed app and is not notarized. The signing pipeline below is prepared, but has not completed a real certificate-backed build. Credentials and provider enrollment are required first.

## macOS

1. [Enroll in the Apple Developer Program](https://developer.apple.com/programs/enroll/). Membership is USD 99 per year, with local pricing at enrollment. Complete identity verification, agreements and payment yourself.
2. Create a **Developer ID Application** certificate, using Apple's [Developer ID guide](https://developer.apple.com/help/account/certificates/create-developer-id-certificates). Install it with its private key in your login keychain. Apple Development, Mac Distribution and Developer ID Installer certificates do not replace this certificate for a DMG-distributed app.
3. For local builds, save notarization credentials with the interactive `xcrun notarytool store-credentials desksignal-notary` command. Set `APPLE_KEYCHAIN_PROFILE=desksignal-notary` and `APPLE_TEAM_ID` to your 10-character Team ID, then run `npm run dist:mac:signed`. Do not pass passwords in shell command history or send keys in chat.
4. For CI, export the certificate **with its private key** as a password-protected `.p12`. Create a team App Store Connect API key authorized for notarization. The workflow uses a private `.p8` file temporarily and deletes it when the build step exits.

The signed profile enables hardened runtime and secure timestamps, signs the native input helper too, and grants JIT permission only to Electron processes. The native helper receives an empty entitlement file. The app is notarized and stapled before packaging; the signed DMG is then separately submitted, must receive `Accepted`, and is stapled. Signature, Team ID, runtime, timestamps, stapler and Gatekeeper checks must all succeed. Accessibility permission remains required for global input gestures.

## Windows

Use a publicly trusted code-signing provider. Signing identifies the publisher and detects tampering; it does **not guarantee** that a new download avoids SmartScreen reputation warnings. See Microsoft's [signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).

- **Azure Artifact Signing, Public Trust:** the [current onboarding requirements](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) restrict individual developers to the United States and Canada. Do not enroll with inaccurate identity or residency details. For an eligible account, create a Public Trust certificate profile and grant the CI service principal the certificate-profile signer role at the narrowest applicable scope. Set the Azure variables/secrets below. Hosted Windows CI uses this provider.
- **Hardware token / CA-managed HSM:** choose a CA that accepts your legal identity and region. Install its signing software and certificate in the Windows certificate store, connect the token, and complete its authorization/PIN prompt locally. Set `DS_WINDOWS_SIGNING_PROVIDER=store`, `DS_WINDOWS_CERT_SHA1` to its 40-character thumbprint, and `DS_WINDOWS_PUBLISHER` to the certificate's exact Common Name, then run `npm run dist:win:signed` on that Windows machine. A USB token cannot be attached to a GitHub-hosted runner. Cloud HSM providers that require a custom signing API need an additional provider integration after you select one.
- **Open-source application:** [SignPath Foundation](https://signpath.org/) offers free signing to qualifying open-source projects. Approval is not guaranteed; application and provider-specific integration are separate steps and are not configured in the current workflow.

The Windows pipeline signs the app, native helper and NSIS installer using SHA-256 and timestamping, checks `Get-AuthenticodeSignature`, timestamps and expected publisher, and keeps updater signature verification enabled. Do not use a self-signed certificate for public downloads.

## GitHub Actions credentials

In repository Settings → Environments, create `signing`. Restrict deployments to `main`; configure reviewers if your repository plan supports them. Enter credentials yourself in GitHub; never commit them or attach them to issues. `.p12`, `.pfx`, `.p8`, `.signing/` and signed output are ignored by Git.

| Environment secret | Value |
| --- | --- |
| `MAC_CERTIFICATE_P12_BASE64` | Base64 of the password-protected certificate/private-key `.p12` (not a data URL) |
| `MAC_CERTIFICATE_PASSWORD` | `.p12` export password |
| `APPLE_API_KEY_P8` | Raw contents of the notarization API `.p8` key |
| `APPLE_API_KEY_ID` | API key ID |
| `APPLE_API_ISSUER` | Team API key issuer UUID |
| `AZURE_TENANT_ID` | Tenant ID for an eligible Public Trust account |
| `AZURE_CLIENT_ID` | Signing service principal ID |
| `AZURE_CLIENT_SECRET` | Its client secret; rotate it and keep the signing role scoped |

| Environment variable | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Apple Team ID |
| `DS_WINDOWS_PUBLISHER` | Exact certificate Common Name / publisher name |
| `DS_AZURE_SIGNING_ENDPOINT` | Regional HTTPS endpoint ending in `.codesigning.azure.net` |
| `DS_AZURE_SIGNING_ACCOUNT` | Signing account name |
| `DS_AZURE_CERTIFICATE_PROFILE` | Approved Public Trust certificate profile name |

Run Actions → **Build signed installers** from `main`, choosing Mac, Windows or both. This read-only workflow uploads only verified installers/update files and a Mac submission receipt as private Actions artifacts (7-day retention); it cannot publish a release. Missing credentials, rejected notarization or invalid signatures fail the build. The local output directory is `release-signed/`, separate from development packages.

## Publishing the first signed release

Use a new version (for example 0.5.6) and update the lockfile. Do not replace published v0.5.5 files or their checksums. After both platforms pass with real credentials, test downloaded installers on clean Windows and Mac machines. Create a draft release at the tested source commit, upload the signed EXE, its matching `latest.yml` and blockmap, the notarized/stapled DMG, and fresh SHA256SUMS. Publish only after both platform checks pass; then update homepage download links and signing status. The existing **Release** workflow still builds development/unsigned packages and must not be used to publish a signed version. It now requires manual dispatch with `allow_unsigned` explicitly checked, refuses published releases, and does not run on tag creation, preventing an unsigned build from replacing signed installers.

Validation so far: signing rejection/verification tests, TypeScript checks and electron-builder 26.15.3 schema validation for Mac, Windows store and Azure configurations. Actual provider-backed builds, notarization and clean-machine installation remain pending enrollment.
