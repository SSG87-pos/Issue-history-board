import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

const mode = process.argv[2];
const passthroughArgs = process.argv.slice(3);
if (passthroughArgs[0] === '--') passthroughArgs.shift();

const MODES = new Set(['local', 'pages', 'server']);

if (!MODES.has(mode)) {
  console.error('Usage: node scripts/run-playwright-with-ports.mjs <local|pages|server> [...playwright args]');
  process.exit(1);
}

const portRanges = {
  local: [42_000, 60_999],
  pages: [42_000, 60_999],
  serverApi: [42_000, 60_999],
  serverWeb: [42_000, 60_999],
};

const env = { ...process.env };
const playwrightArgs = ['exec', 'playwright', 'test'];
const claimedPorts = new Set();

if (mode === 'local') {
  env.E2E_WEB_PORT = env.E2E_WEB_PORT || String(await findOpenPort(...portRanges.local, claimedPorts));
  claimedPorts.add(Number(env.E2E_WEB_PORT));
} else if (mode === 'pages') {
  env.E2E_PAGES_PORT = env.E2E_PAGES_PORT || String(await findOpenPort(...portRanges.pages, claimedPorts));
  claimedPorts.add(Number(env.E2E_PAGES_PORT));
  playwrightArgs.push('--config', 'playwright.pages.config.ts');
} else if (mode === 'server') {
  env.E2E_SERVER_API_PORT = env.E2E_SERVER_API_PORT || String(await findOpenPort(...portRanges.serverApi, claimedPorts));
  claimedPorts.add(Number(env.E2E_SERVER_API_PORT));
  env.E2E_SERVER_WEB_PORT = env.E2E_SERVER_WEB_PORT || String(await findOpenPort(...portRanges.serverWeb, claimedPorts));
  claimedPorts.add(Number(env.E2E_SERVER_WEB_PORT));
  env.E2E_SERVER_DB_PATH =
    env.E2E_SERVER_DB_PATH ||
    path.join(tmpdir(), `issue-board-server-e2e-${env.E2E_SERVER_API_PORT}-${env.E2E_SERVER_WEB_PORT}.sqlite`);
  playwrightArgs.push('--config', 'playwright.server.config.ts');
}

playwrightArgs.push(...passthroughArgs);

const visiblePorts = Object.fromEntries(
  ['E2E_WEB_PORT', 'E2E_PAGES_PORT', 'E2E_SERVER_API_PORT', 'E2E_SERVER_WEB_PORT']
    .filter((key) => env[key])
    .map((key) => [key, env[key]]),
);
console.log(`Using Playwright ports: ${JSON.stringify(visiblePorts)}`);

const result = spawnSync('pnpm', playwrightArgs, {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

async function findOpenPort(start, end, excluded = new Set()) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const port = await getEphemeralPort().catch(() => undefined);
    if (port && !excluded.has(port) && port >= 1024 && (await isOpen(port))) return port;
  }

  const seed = Number.parseInt(process.env.E2E_PORT_SEED || String(process.pid), 10);
  const size = end - start + 1;
  const first = start + (Number.isFinite(seed) ? seed % size : 0);

  for (let index = 0; index < size; index += 1) {
    const port = start + ((first - start + index) % size);
    if (!excluded.has(port) && (await isOpen(port))) return port;
  }

  throw new Error(`No open port found in ${start}-${end}`);
}

function getEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
        } else {
          reject(new Error('Unable to read ephemeral port'));
        }
      });
    });
  });
}

function isOpen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolve(true));
    });
  });
}
