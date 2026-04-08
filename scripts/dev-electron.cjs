const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function withCleanEnv(baseEnv) {
  // This env var makes Electron behave like plain Node, which breaks the app boot.
  // Some user setups export it globally.
  const env = { ...baseEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function run(cmd, args, { env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
      windowsHide: false,
    });

    child.on('error', (err) => reject(err));
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function main() {
  const env = withCleanEnv(process.env);

  const electronPath = require('electron');
  if (!electronPath || typeof electronPath !== 'string' || !fs.existsSync(electronPath)) {
    console.error('[dev:electron] Could not resolve Electron executable.');
    console.error('[dev:electron] Expected a path string from require("electron"), got:', electronPath);
    process.exit(1);
  }

  const tscBin = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(tscBin)) {
    console.error('[dev:electron] Missing TypeScript compiler at:', tscBin);
    console.error('[dev:electron] Did you run `npm install`?');
    process.exit(1);
  }

  try {
    await run(process.execPath, [tscBin, '-p', 'tsconfig.node.json'], { env });
    await run(process.execPath, [path.join(repoRoot, 'scripts', 'rename-electron-output.cjs')], { env });
  } catch (err) {
    console.error('[dev:electron] Build failed:', err?.message || err);
    process.exit(1);
  }

  const child = spawn(electronPath, ['.'], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('error', (err) => {
    console.error('[dev:electron] Failed to start Electron:', err?.message || err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

main();