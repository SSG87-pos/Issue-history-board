import { defineConfig, devices } from '@playwright/test';

const pagesPort = process.env.E2E_PAGES_PORT || '42174';
const pagesBaseUrl = `http://127.0.0.1:${pagesPort}`;

export default defineConfig({
  testDir: './tests/e2e-pages',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: pagesBaseUrl,
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
  webServer: {
    command: `pnpm build:pages && pnpm exec vite preview --host 127.0.0.1 --port ${pagesPort} --strictPort --base /Issue-history-board/`,
    url: `${pagesBaseUrl}/Issue-history-board/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
