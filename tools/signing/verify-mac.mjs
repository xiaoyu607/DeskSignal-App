import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
const { signedConfig } = require('./config.cjs');
const { verifyMacSignature, acceptedReceipt } = require('./verification.cjs');
signedConfig(); // Credentials are mandatory, even when a previous artifact exists.

function run(tool, args) {
  // Never print credentials or a child process's command line on failure.
  try { return execFileSync(tool, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw new Error(`${tool} verification/notarization failed; inspect the service submission history locally`); }
}
const app = resolve('release-signed/mac-arm64/DeskSignal.app');
const dmg = resolve(`release-signed/DeskSignal-${version}-arm64.dmg`);
for (const file of [app, `${app}/Contents/Resources/hook-helper`]) {
  run('codesign', ['--verify', '--deep', '--strict', file]);
}
// Signature details, including the Team ID and runtime flag, are written to stderr.
for (const file of [app, `${app}/Contents/Resources/hook-helper`]) {
  const result = spawnSync('codesign', ['-d', '--verbose=4', file], { encoding: 'utf8' });
  const metadata = result.stderr || '';
  if (result.status !== 0) throw new Error('Cannot inspect Developer ID signature');
  verifyMacSignature(metadata, process.env.APPLE_TEAM_ID);
}
run('xcrun', ['stapler', 'validate', app]);
run('spctl', ['--assess', '--type', 'execute', '--verbose=2', app]);
run('hdiutil', ['verify', dmg]);
run('codesign', ['--verify', '--strict', dmg]);
const credentials = process.env.APPLE_KEYCHAIN_PROFILE
  ? ['--keychain-profile', process.env.APPLE_KEYCHAIN_PROFILE, ...(process.env.APPLE_KEYCHAIN ? ['--keychain', process.env.APPLE_KEYCHAIN] : [])]
  : ['--key', process.env.APPLE_API_KEY, '--key-id', process.env.APPLE_API_KEY_ID, '--issuer', process.env.APPLE_API_ISSUER];
const receipt = acceptedReceipt(run('xcrun', ['notarytool', 'submit', dmg, ...credentials, '--wait', '--timeout', '30m', '--output-format', 'json']));
run('xcrun', ['stapler', 'staple', dmg]);
run('xcrun', ['stapler', 'validate', dmg]);
run('spctl', ['--assess', '--type', 'open', '--context', 'context:primary-signature', '--verbose=2', dmg]);
writeFileSync('release-signed/mac-notarization.json', JSON.stringify({ version, status: receipt.status, id: receipt.id }, null, 2));
console.log('Developer ID signatures, app ticket, accepted DMG submission, DMG ticket and Gatekeeper checks passed.');
