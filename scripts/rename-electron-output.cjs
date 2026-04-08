/*
 * Cross-platform rename for Electron compiled outputs.
 * Converts all electron/*.js files to .cjs and updates require paths in main.cjs
 */
const fs = require('fs');
const path = require('path');

const electronDir = path.resolve(process.cwd(), 'electron');

// Get all .js files in electron directory (excluding .d.ts related)
const jsFiles = fs.readdirSync(electronDir)
  .filter(f => f.endsWith('.js') && !f.endsWith('.d.js'));

// Rename all .js files to .cjs
for (const file of jsFiles) {
  const fromPath = path.join(electronDir, file);
  const toPath = path.join(electronDir, file.replace('.js', '.cjs'));

  try {
    if (fs.existsSync(toPath)) {
      fs.unlinkSync(toPath);
    }
    fs.renameSync(fromPath, toPath);
    console.log(`[rename-electron-output] Renamed electron/${file} -> electron/${file.replace('.js', '.cjs')}`);
  } catch (err) {
    console.error(`[rename-electron-output] Failed to rename electron/${file}:`, err);
    process.exitCode = 1;
  }

  // Also rename .js.map if exists
  const mapFromPath = fromPath + '.map';
  const mapToPath = toPath + '.map';
  if (fs.existsSync(mapFromPath)) {
    try {
      if (fs.existsSync(mapToPath)) {
        fs.unlinkSync(mapToPath);
      }
      fs.renameSync(mapFromPath, mapToPath);
      console.log(`[rename-electron-output] Renamed electron/${file}.map -> electron/${file.replace('.js', '.cjs')}.map`);
    } catch (err) {
      // Map file rename is optional
    }
  }
}

// Update require paths in main.cjs to use .cjs extensions
const mainCjsPath = path.join(electronDir, 'main.cjs');
if (fs.existsSync(mainCjsPath)) {
  let content = fs.readFileSync(mainCjsPath, 'utf8');

  // Update relative require paths to use .cjs extension
  // Match patterns like require("./capture") or require('./storage')
  content = content.replace(/require\(["']\.\/([\w]+)["']\)/g, 'require("./$1.cjs")');

  fs.writeFileSync(mainCjsPath, content, 'utf8');
  console.log('[rename-electron-output] Updated require paths in main.cjs');
}