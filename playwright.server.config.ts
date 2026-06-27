import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import path from 'node:path';

const apiPort = process.env.E2E_SERVER_API_PORT || '42175';
const webPort = process.env.E2E_SERVER_WEB_PORT || '42176';
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const sqlitePath = process.env.E2E_SERVER_DB_PATH || path.join(tmpdir(), `issue-board-server-e2e-${apiPort}-${webPort}.sqlite`);
const sqliteUrl = `sqlite:///${sqlitePath}`;

export default defineConfig({
  testDir: './tests/e2e-server',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: webBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: [
        `DATABASE_URL=${sqliteUrl}`,
        'SECRET_KEY=server-e2e-secret',
        'ADMIN_USERNAME=admin',
        'ADMIN_PASSWORD=admin-password',
        'ADMIN_DISPLAY_NAME=관리자',
        `CORS_ORIGINS=${webBaseUrl}`,
        `.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port ${apiPort}`,
      ].join(' '),
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `VITE_API_BASE_URL=${apiBaseUrl}/api pnpm exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
