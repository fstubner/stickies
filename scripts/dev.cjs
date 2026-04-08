const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');

const DEFAULT_PORT = Number(process.env.VITE_DEV_SERVER_PORT || 3001);
const MAX_PORT = DEFAULT_PORT + 20;
const WAIT_TIMEOUT_MS = 60_000;
const WAIT_INTERVAL_MS = 500;

// Prefer IPv4 to avoid localhost IPv6 vs IPv4 mismatches (common in Electron on Windows).
const DEFAULT_HOST = process.env.VITE_DEV_SERVER_HOST || '127.0.0.1';

const isWindows = process.platform === 'win32';

// Useful for CI or local validation without launching Electron.
// Example: `STICKIES_DEV_SMOKE=1 npm run dev`
const IS_SMOKE = process.env.STICKIES_DEV_SMOKE === '1';

function killProcessTree(child, label = 'process') {
  if (!child || child.killed || !child.pid) return Promise.resolve();

  if (isWindows) {
    // `kill()` only targets the direct PID; `taskkill /T` takes the whole tree.
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      killer.on('exit', () => resolve());
      killer.on('error', (err) => {
        // Best-effort. If taskkill fails, attempt direct kill.
        try { child.kill('SIGINT'); } catch {}
        console.error(`[dev] Failed to taskkill ${label}:`, err?.message || err);
        resolve();
      });
    });
  }

  try {
    child.kill('SIGINT');
  } catch (err) {
    console.error(`[dev] Failed to kill ${label}:`, err?.message || err);
  }

  return Promise.resolve();
}

function isPortFreeOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      // Only EADDRINUSE means "not free". Other errors (like IPv6 unsupported) should not block.
      if (err && err.code === 'EADDRINUSE') return resolve(false);
      return resolve(true);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host });
  });
}

async function findFreePort(start, end, host) {
  for (let port = start; port <= end; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFreeOnHost(port, host);
    if (free) return port;
  }
  return null;
}

function waitForVite(host, port, timeoutMs) {
  const start = Date.now();
  const url = `http://${host}:${port}/@vite/client`;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        // Vite serves /@vite/client with a 200. Anything else likely isn't our dev server.
        if (res.statusCode === 200) {
          res.resume();
          resolve(true);
          return;
        }

        res.resume();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for Vite at ${url} (status ${res.statusCode})`));
          return;
        }

        setTimeout(attempt, WAIT_INTERVAL_MS);
      });

      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for Vite at ${url}`));
          return;
        }
        setTimeout(attempt, WAIT_INTERVAL_MS);
      });
    };

    attempt();
  });
}

async function main() {
  const host = DEFAULT_HOST;
  const port = await findFreePort(DEFAULT_PORT, MAX_PORT, host);
  if (!port) {
    console.error(`No free port found on ${host} between ${DEFAULT_PORT} and ${MAX_PORT}.`);
    process.exit(1);
  }

  console.log(`[dev] Starting Vite on http://${host}:${port} ...`);

  const env = {
    ...process.env,
    VITE_DEV_SERVER_HOST: host,
    VITE_DEV_SERVER_PORT: String(port),
  };

  // Some setups export this globally which breaks launching Electron from dev scripts.
  delete env.ELECTRON_RUN_AS_NODE;

  const repoRoot = path.join(__dirname, '..');
  const devSvelteScript = path.join(__dirname, 'dev-svelte.cjs');
  const devElectronScript = path.join(__dirname, 'dev-electron.cjs');

  // Start Vite.
  const vite = spawn(process.execPath, [devSvelteScript], { env, cwd: repoRoot, stdio: 'inherit', windowsHide: false });
  let electron = null;

  // If Vite dies early, bail (electron can't load anything).
  vite.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Vite dev server exited with code ${code}.`);
      if (electron) {
        killProcessTree(electron, 'Electron').finally(() => {
          process.exit(code || 1);
        });
        return;
      }
      process.exit(code || 1);
    }
  });

  vite.on('error', (err) => {
    console.error('[dev] Failed to start Vite:', err?.message || err);
    process.exit(1);
  });

  try {
    await waitForVite(host, port, WAIT_TIMEOUT_MS);
  } catch (error) {
    console.error(error.message);
    await killProcessTree(vite, 'Vite');
    process.exit(1);
  }

  if (IS_SMOKE) {
    console.log(`[dev] Vite is ready at http://${host}:${port} (smoke mode; skipping Electron).`);
    await killProcessTree(vite, 'Vite');
    process.exit(0);
    return;
  }

  console.log('[dev] Starting Electron...');

  electron = spawn(process.execPath, [devElectronScript], { env, cwd: repoRoot, stdio: 'inherit', windowsHide: false });
  electron.on('error', (err) => {
    console.error('[dev] Failed to start Electron:', err?.message || err);
    killProcessTree(vite, 'Vite').finally(() => process.exit(1));
  });

  electron.on('exit', (electronCode) => {
    killProcessTree(vite, 'Vite').finally(() => process.exit(electronCode || 0));
  });

  process.on('SIGINT', () => {
    Promise.all([
      killProcessTree(vite, 'Vite'),
      killProcessTree(electron, 'Electron'),
    ]).finally(() => process.exit(0));
  });
}

main();