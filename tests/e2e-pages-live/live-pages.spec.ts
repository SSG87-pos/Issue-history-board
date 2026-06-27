import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

function collectRuntimeIssues(page: Page): string[] {
  const issues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(message.text());
  });
  page.on('pageerror', (error) => {
    issues.push(error.message);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('/favicon')) return;
    issues.push(`${request.method()} ${url} failed: ${request.failure()?.errorText ?? 'unknown error'}`);
  });

  return issues;
}

function assetPaths(html: string): string[] {
  return Array.from(html.matchAll(/\/Issue-history-board\/assets\/[^"']+/g), (match) => match[0]).sort();
}

test.describe('Live GitHub Pages build', () => {
  test('renders fallback demo data from the deployed URL', async ({ page, baseURL }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto(baseURL ?? '/');

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/Issue-history-board\/?$/);
    await expect(page.getByRole('heading', { name: 'PosLAB 이력관리 센터' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' })).toBeVisible();
    await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
    await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();
    await expect(page.getByRole('region', { name: '날짜별 이력 목록' })).toContainText('시험 조건 편차 원인 검토');
    expect(runtimeIssues).toEqual([]);
  });

  test('can require the live HTML to match the latest local Pages build assets', async ({ page, baseURL }) => {
    test.skip(
      process.env.LIVE_PAGES_REQUIRE_CURRENT_BUILD !== '1',
      'Set LIVE_PAGES_REQUIRE_CURRENT_BUILD=1 after running build:pages to verify that gh-pages serves the latest local assets.',
    );

    const response = await page.goto(baseURL ?? '/');
    expect(response?.ok()).toBe(true);
    const liveHtml = await page.content();
    const localHtml = readFileSync('dist/index.html', 'utf8');

    expect(assetPaths(liveHtml)).toEqual(assetPaths(localHtml));
  });
});
