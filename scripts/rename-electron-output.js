/*
 * Cross-platform rename for Electron compiled outputs.
 * Converts electron/main.js -> electron/main.cjs and electron/preload.js -> electron/preload.cjs
 */
const fs = require('fs');
const path = require('path');

const targets = [
  { from: 'electron/main.js', to: 'electron/main.cjs' },
  { from: 'electron/main.js.map', to: 'electron/main.cjs.map', optional: true },
  { from: 'electron/preload.js', to: 'electron/preload.cjs' },
  { from: 'electron/preload.js.map', to: 'electron/preload.cjs.map', optional: true },
];

for (const { from, to, optional } of targets) {
  const fromPath = path.resolve(process.cwd(), from);
  const toPath = path.resolve(process.cwd(), to);
  try {
    if (!fs.existsSync(fromPath)) {
      if (!optional) {
        console.warn(`[rename-electron-output] Missing ${from}`);
      }
      continue;
    }
    if (fs.existsSync(toPath)) {
      fs.unlinkSync(toPath);
    }
    fs.renameSync(fromPath, toPath);
    console.log(`[rename-electron-output] Renamed ${from} -> ${to}`);
  } catch (err) {
    console.error(`[rename-electron-output] Failed to rename ${from} -> ${to}:`, err);
    process.exitCode = 1;
  }
}