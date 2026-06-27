import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requireDocker = process.argv.includes('--with-docker');
const checks = [];

function pass(message) {
  checks.push({ ok: true, message });
}

function fail(message) {
  checks.push({ ok: false, message });
}

function readRequired(path) {
  if (!existsSync(path)) {
    fail(`${path} is missing`);
    return '';
  }
  pass(`${path} exists`);
  return readFileSync(path, 'utf8');
}

function expectIncludes(name, text, needle) {
  if (text.includes(needle)) {
    pass(`${name} contains ${needle}`);
  } else {
    fail(`${name} must contain ${needle}`);
  }
}

const compose = readRequired('docker-compose.yml');
const webDockerfile = readRequired('Dockerfile.web');
const apiDockerfile = readRequired('backend/Dockerfile');
const nginx = readRequired('nginx.conf');
const envExample = readRequired('.env.example');
const envChecker = readRequired('scripts/check-company-env.mjs');
const companyRunner = readRequired('scripts/company-run.sh');
const playwrightPortRunner = readRequired('scripts/run-playwright-with-ports.mjs');
const backend = readRequired('backend/app/main.py');
const packageJson = readRequired('package.json');
const viteConfig = readRequired('vite.config.ts');
const pagesConfig = readRequired('playwright.pages.config.ts');
const livePagesConfig = readRequired('playwright.live-pages.config.ts');
const ciWorkflow = readRequired('.github/workflows/ci.yml');
const pagesWorkflow = readRequired('.github/workflows/pages.yml');

for (const service of ['postgres:', 'api:', 'web:']) {
  expectIncludes('docker-compose.yml', compose, service);
}

for (const required of [
  'POSTGRES_PASSWORD',
  'SECRET_KEY',
  'ADMIN_PASSWORD',
  'CORS_ORIGINS',
  'condition: service_healthy',
  'healthcheck:',
  'expose:',
]) {
  expectIncludes('docker-compose.yml', compose, required);
}

if (compose.includes('"8000:8000"') || compose.includes("'8000:8000'") || compose.includes('- 8000:8000')) {
  fail('docker-compose.yml must not publish the api service directly on host port 8000');
} else {
  pass('docker-compose.yml keeps the api service off host port 8000');
}

expectIncludes('Dockerfile.web', webDockerfile, 'ARG VITE_API_BASE_URL=/api');
expectIncludes('Dockerfile.web', webDockerfile, 'RUN pnpm build');
expectIncludes('backend/Dockerfile', apiDockerfile, 'uvicorn');
expectIncludes('backend/Dockerfile', apiDockerfile, 'backend.app.main:app');
expectIncludes('nginx.conf', nginx, 'location /api/');
expectIncludes('nginx.conf', nginx, 'proxy_pass http://api:8000/api/');
expectIncludes('nginx.conf', nginx, 'location /health');
expectIncludes('backend/app/main.py', backend, '@app.get("/health")');
expectIncludes('scripts/check-company-env.mjs', envChecker, 'Company environment check passed');
expectIncludes('scripts/company-run.sh', companyRunner, 'env-check');
expectIncludes('scripts/company-run.sh', companyRunner, 'run_up');
expectIncludes('scripts/company-run.sh', companyRunner, 'wait_for_health');
expectIncludes('scripts/company-run.sh', companyRunner, 'run_health');
expectIncludes('scripts/company-run.sh', companyRunner, 'compose config');
expectIncludes('scripts/run-playwright-with-ports.mjs', playwrightPortRunner, 'findOpenPort');
expectIncludes('scripts/run-playwright-with-ports.mjs', playwrightPortRunner, 'E2E_SERVER_API_PORT');
expectIncludes('package.json', packageJson, 'check:shell');
expectIncludes('package.json', packageJson, 'test:backend');
expectIncludes('package.json', packageJson, 'verify:static');
expectIncludes('package.json', packageJson, 'verify:e2e');
expectIncludes('package.json', packageJson, 'verify:all');
expectIncludes('package.json', packageJson, 'build:pages');
expectIncludes('package.json', packageJson, 'test:e2e:pages');
expectIncludes('package.json', packageJson, 'test:e2e:pages:live');
expectIncludes('package.json', packageJson, 'run-playwright-with-ports.mjs');
expectIncludes('.github/workflows/ci.yml', ciWorkflow, 'pnpm test:e2e:pages:live');
expectIncludes('vite.config.ts', viteConfig, '/Issue-history-board/');
expectIncludes('playwright.pages.config.ts', pagesConfig, '/Issue-history-board/');
expectIncludes('playwright.live-pages.config.ts', livePagesConfig, 'LIVE_PAGES_URL');
expectIncludes('playwright.live-pages.config.ts', livePagesConfig, 'ssg87-pos.github.io/Issue-history-board/');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'pnpm build:pages');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'pnpm exec playwright install --with-deps chromium');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'actions/configure-pages');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'actions/deploy-pages');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'pnpm test:e2e:pages');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'pnpm test:e2e:pages:live:current');
expectIncludes('.github/workflows/pages.yml', pagesWorkflow, 'LIVE_PAGES_URL');

for (const key of ['POSTGRES_PASSWORD=', 'SECRET_KEY=', 'ADMIN_PASSWORD=', 'WEB_PORT=', 'CORS_ORIGINS=']) {
  expectIncludes('.env.example', envExample, key);
}

if (requireDocker) {
  const result = spawnSync('docker', ['compose', 'config'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'deployment-check-db-password',
      SECRET_KEY: process.env.SECRET_KEY || 'deployment-check-secret-key',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'deployment-check-admin-password',
    },
    encoding: 'utf8',
  });

  if (result.error) {
    const detail = result.error.code === 'ENOENT'
      ? 'docker CLI is not available; install Docker on this host or run without --with-docker for static checks'
      : result.error.message;
    fail(`docker compose config failed: ${detail}`);
  } else if (result.status === 0) {
    pass('docker compose config succeeded');
  } else {
    fail(`docker compose config failed: ${(result.stderr || result.stdout || 'unknown error').trim()}`);
  }
} else {
  pass('docker compose config skipped; pass --with-docker on a Docker host to validate it');
}

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error(`Deployment readiness check failed: ${failed.length} issue(s)`);
  process.exit(1);
}

console.log(`Deployment readiness check passed: ${checks.length} checks`);
