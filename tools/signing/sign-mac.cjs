const { signAsync } = require('@electron/osx-sign');
const { resolve } = require('node:path');

// The native input helper needs neither JIT nor disabled library validation.
module.exports = async (options) => {
  if (!options.identity || options.identity === '-') throw new Error('Developer ID signing identity is required');
  const helper = resolve(options.app, 'Contents/Resources/hook-helper');
  await signAsync({ ...options, optionsForFile(file) {
    const inherited = options.optionsForFile(file);
    return resolve(file) === helper
      ? { ...inherited, entitlements: resolve('build/signing/helper.plist') }
      : inherited;
  } });
};
