#!/usr/bin/env node
// Prepare safe flags before submission without deleting directories.
// It updates featureFlags.json to disable ads/analytics/remote config.

const fs = require('fs');
const path = require('path');

function writeFlags(file, flags) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(flags, null, 2) + '\n', 'utf8');
}

const flagsPath = path.join('assets', 'resources', 'config', 'featureFlags.json');
const safeFlags = { ENABLE_ADS: false, ENABLE_ANALYTICS: false, ENABLE_REMOTE_CONFIG: false };
writeFlags(flagsPath, safeFlags);

console.log('Updated feature flags for submission:', flagsPath, safeFlags);
console.log('Next steps:');
console.log('- In Cocos Creator, Clean Cache (or manually remove temp/build via the editor UI).');
console.log('- Rebuild WeChat Game in non-release with logs enabled for validation.');

