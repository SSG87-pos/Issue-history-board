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

test.describe('GitHub Pages preview build', () => {
  test('serves fallback demo data under the repository base path', async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto('/Issue-history-board/');

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/Issue-history-board\/$/);
    await expect(page.getByRole('heading', { name: 'PosLAB 이력관리 센터' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '강종/제품' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '투자/과제' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '설비/시험' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '제도/운영' })).toBeVisible();

    await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
    await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();
    const historyList = page.getByRole('region', { name: '날짜별 이력 목록' });
    await expect(historyList).toContainText('시험 조건 편차 원인 검토');
    await historyList.getByRole('button', { name: /시험 조건 편차 원인 검토/ }).click();
    await expect(page.getByRole('region', { name: '선택한 날짜 이력 상세' })).toContainText('향후 계획');
    expect(runtimeIssues).toEqual([]);
  });
});
