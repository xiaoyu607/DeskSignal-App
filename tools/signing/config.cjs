const base = require('../../package.json').build;

function required(env, name) {
  if (!env[name]?.trim()) throw new Error(`Missing signing setting: ${name}`);
  return env[name].trim();
}

function signedConfig(env = process.env, platform = process.platform) {
  const config = { ...base, forceCodeSigning: true, directories: { ...base.directories, output: 'release-signed' } };
  if (platform === 'darwin') {
    const team = required(env, 'APPLE_TEAM_ID');
    if (!/^[A-Z0-9]{10}$/.test(team)) throw new Error('APPLE_TEAM_ID must be a 10-character Team ID');
    if (!env.APPLE_KEYCHAIN_PROFILE) {
      for (const key of ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']) required(env, key);
    }
    // Refuse developer/ad-hoc fallback; electron-builder selects Developer ID Application.
    config.mac = { ...base.mac, identity: undefined, type: 'distribution', hardenedRuntime: true,
      notarize: true, strictVerify: true, timestamp: 'http://timestamp.apple.com/ts01',
      entitlements: 'build/signing/electron.plist', entitlementsInherit: 'build/signing/electron.plist',
      binaries: ['Contents/Resources/hook-helper'], sign: './tools/signing/sign-mac.cjs' };
    config.dmg = { ...base.dmg, sign: true };
  } else if (platform === 'win32') {
    const publisherName = required(env, 'DS_WINDOWS_PUBLISHER');
    const provider = required(env, 'DS_WINDOWS_SIGNING_PROVIDER');
    config.win = { ...base.win, signExts: ['.exe'], verifyUpdateCodeSignature: true };
    if (provider === 'store') {
      const certificateSha1 = required(env, 'DS_WINDOWS_CERT_SHA1');
      if (!/^[0-9a-f]{40}$/i.test(certificateSha1)) throw new Error('DS_WINDOWS_CERT_SHA1 must be a certificate thumbprint');
      config.win.signtoolOptions = { publisherName, certificateSha1, signingHashAlgorithms: ['sha256'],
        rfc3161TimeStampServer: 'http://timestamp.digicert.com' };
    } else if (provider === 'azure') {
      for (const key of ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET']) required(env, key);
      const endpoint = required(env, 'DS_AZURE_SIGNING_ENDPOINT');
      if (!/^https:\/\/[a-z0-9-]+\.codesigning\.azure\.net\/?$/i.test(endpoint)) throw new Error('Invalid Azure signing endpoint');
      config.win.azureSignOptions = { publisherName, endpoint,
        codeSigningAccountName: required(env, 'DS_AZURE_SIGNING_ACCOUNT'),
        certificateProfileName: required(env, 'DS_AZURE_CERTIFICATE_PROFILE'),
        fileDigest: 'SHA256', timestampDigest: 'SHA256', timestampRfc3161: 'http://timestamp.acs.microsoft.com' };
    } else throw new Error('DS_WINDOWS_SIGNING_PROVIDER must be store or azure');
  } else throw new Error('Signed builds require macOS or Windows');
  return config;
}

module.exports = { signedConfig };
