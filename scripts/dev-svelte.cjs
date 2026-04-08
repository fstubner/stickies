const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');

function hasFlag(argv, flag) {
  return argv.includes(flag) || argv.some((a) => a.startsWith(`${flag}=`));
}

function main() {
  if (!fs.existsSync(viteBin)) {
    console.error('[dev:svelte] Missing Vite binary at:', viteBin);
    console.error('[dev:svelte] Did you run `npm install`?');
    process.exit(1);
  }

  const argv = process.argv.slice(2);

  // Prefer IPv4 to avoid localhost IPv6 vs IPv4 mismatch (common in Electron on Windows).
  const host = process.env.VITE_DEV_SERVER_HOST || '127.0.0.1';
  const port = process.env.VITE_DEV_SERVER_PORT || '3001';

  // Keep `npm run dev:svelte -- --port ...` working by only injecting defaults when missing.
  const args = ['dev'];
  if (!hasFlag(argv, '--host')) args.push('--host', host);
  if (!hasFlag(argv, '--port')) args.push('--port', String(port));
  if (!hasFlag(argv, '--strictPort')) args.push('--strictPort');
  args.push(...argv);

  const child = spawn(process.execPath, [viteBin, ...args], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('error', (err) => {
    console.error('[dev:svelte] Failed to start Vite:', err?.message || err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

main();