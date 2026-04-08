const net = require('net');

// Keep this tiny and dependency-free so it can be used from tooling (e.g. Playwright config).
const host = process.env.VITE_DEV_SERVER_HOST || '127.0.0.1';
const start = Number(process.env.VITE_DEV_SERVER_PORT || 3001);
const end = start + 20;

function isPortFreeOnHost(port, hostName) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') return resolve(false);
      return resolve(true);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host: hostName });
  });
}

async function main() {
  for (let port = start; port <= end; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFreeOnHost(port, host);
    if (free) {
      process.stdout.write(String(port));
      return;
    }
  }

  process.stderr.write(`No free port found on ${host} between ${start} and ${end}.\n`);
  process.exit(1);
}

main();