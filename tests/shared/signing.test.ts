import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { signedConfig } = require('../../tools/signing/config.cjs');
const { verifyMacSignature, acceptedReceipt } = require('../../tools/signing/verification.cjs');
const mac = { APPLE_TEAM_ID: 'ABC1234567', APPLE_KEYCHAIN_PROFILE: 'desksignal-notary' };
const azure = {
  DS_WINDOWS_PUBLISHER: 'Example Publisher', DS_WINDOWS_SIGNING_PROVIDER: 'azure',
  AZURE_TENANT_ID: 'tenant', AZURE_CLIENT_ID: 'client', AZURE_CLIENT_SECRET: 'test-only',
  DS_AZURE_SIGNING_ENDPOINT: 'https://eus.codesigning.azure.net/',
  DS_AZURE_SIGNING_ACCOUNT: 'account', DS_AZURE_CERTIFICATE_PROFILE: 'public-profile',
};
const signature = 'Authority=Developer ID Application: Example (ABC1234567)\nTeamIdentifier=ABC1234567\nCodeDirectory v=20500 size=123 flags=0x10000(runtime) hashes=2\nTimestamp=Oct 12, 2026\n';

describe('signed installer gates', () => {
  it('refuses missing credentials instead of emitting an unsigned installer', () => {
    expect(() => signedConfig({}, 'darwin')).toThrow('APPLE_TEAM_ID');
    expect(() => signedConfig({ APPLE_TEAM_ID: mac.APPLE_TEAM_ID }, 'darwin')).toThrow('APPLE_API_KEY');
    expect(() => signedConfig({}, 'win32')).toThrow('DS_WINDOWS_PUBLISHER');
    expect(() => signedConfig({ ...azure, AZURE_CLIENT_SECRET: '' }, 'win32')).toThrow('AZURE_CLIENT_SECRET');
    expect(() => signedConfig(mac, 'linux')).toThrow('macOS or Windows');
  });
  it('requires Developer ID, hardened runtime and notarization including the helper', () => {
    const config = signedConfig(mac, 'darwin');
    expect(config.forceCodeSigning).toBe(true);
    expect(config.mac.identity).toBeUndefined();
    expect(config.mac.type).toBe('distribution');
    expect(config.mac.hardenedRuntime).toBe(true);
    expect(config.mac.notarize).toBe(true);
    expect(config.mac.binaries).toContain('Contents/Resources/hook-helper');
    expect(config.dmg.sign).toBe(true);
    expect(config.directories.output).toBe('release-signed');
    expect(require('../../package.json').build.mac.identity).toBe('-');
  });
  it('uses one Windows signer and keeps signature verification for updates', () => {
    const config = signedConfig(azure, 'win32');
    expect(config.forceCodeSigning).toBe(true);
    expect(config.win.azureSignOptions.publisherName).toBe(azure.DS_WINDOWS_PUBLISHER);
    expect(config.win.signtoolOptions).toBeUndefined();
    expect(config.win.verifyUpdateCodeSignature).toBe(true);
    expect(() => signedConfig({ ...azure, DS_AZURE_SIGNING_ENDPOINT: 'http://example.com' }, 'win32')).toThrow();
    const store = signedConfig({ DS_WINDOWS_PUBLISHER: 'Example Publisher', DS_WINDOWS_SIGNING_PROVIDER: 'store', DS_WINDOWS_CERT_SHA1: 'a'.repeat(40) }, 'win32');
    expect(store.win.azureSignOptions).toBeUndefined();
    expect(store.win.signtoolOptions.signingHashAlgorithms).toEqual(['sha256']);
    expect(() => signedConfig({ ...azure, DS_WINDOWS_SIGNING_PROVIDER: 'self-signed' }, 'win32')).toThrow();
  });
  it('rejects ad-hoc, wrong-team, development, untimestamped and unhardened Mac signatures', () => {
    expect(() => verifyMacSignature(signature, mac.APPLE_TEAM_ID)).not.toThrow();
    for (const invalid of [signature.replace('Developer ID Application:', 'Apple Development:'),
      signature.replace('TeamIdentifier=ABC1234567', 'TeamIdentifier=OTHER12345'),
      signature.replace('flags=0x10000(runtime)', 'flags=0x2(adhoc)'),
      signature.replace(/Timestamp=.*\n/, '')]) {
      expect(() => verifyMacSignature(invalid, mac.APPLE_TEAM_ID)).toThrow();
    }
  });
  it('accepts only completed, accepted notary submissions', () => {
    expect(acceptedReceipt('{"status":"Accepted","id":"submission"}').id).toBe('submission');
    for (const status of ['Invalid', 'In Progress', 'Rejected', '']) {
      expect(() => acceptedReceipt(JSON.stringify({ status, id: 'submission' }))).toThrow();
    }
    expect(() => acceptedReceipt('{"status":"Accepted"}')).toThrow();
  });
  it('never uploads keys or publishes an unverified signed release', () => {
    const workflow = readFileSync('.github/workflows/signed-installers.yml', 'utf8');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).not.toContain('gh release');
    for (const section of workflow.split('uses: actions/upload-artifact@v4').slice(1)) {
      const paths = section.split('path: |')[1].split(/\n\S|\n {2}windows:/)[0];
      expect(paths).not.toMatch(/\.p8|\.p12|\.signing|\*\*/);
      expect(section).toContain('if-no-files-found: error');
    }
  });
});
