import { expect, test, type Download, type Page } from '@playwright/test';

async function openFreshLocalBoard(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('research-issue-board-data'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'PosLAB 이력관리 센터' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
}

async function openStsHistoryDetail(page: Page) {
  await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
  const selectedEntry = page.getByRole('region', { name: '날짜별 이력 목록' }).getByRole('button', {
    name: /시험 조건 편차 원인 검토/,
  });
  await selectedEntry.click();
}

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });
  return consoleErrors;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const width = window.innerWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return scrollWidth <= width + 1;
  })).toBe(true);
}

async function readVisibleElementMetrics(page: Page, selectors: string[]) {
  return page.evaluate((targetSelectors) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return targetSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
        .map((element, index) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const isVisible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < viewportHeight &&
            rect.left < viewportWidth;

          return {
            selector,
            index,
            isVisible,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            hasInternalOverflow: element.scrollWidth > element.clientWidth + 1,
            clippedByViewport: rect.left < -1 || rect.right > viewportWidth + 1,
          };
        })
        .filter((metric) => metric.isVisible),
    );
  }, selectors);
}

async function downloadToBytes(download: Download): Promise<Uint8Array> {
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];

  for await (const chunk of stream!) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function readZipText(bytes: Uint8Array, fileName: string): string {
  const decoder = new TextDecoder();
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    const signature = view.getUint32(0, true);
    if (signature !== 0x04034b50) break;

    const compression = view.getUint16(8, true);
    const compressedSize = view.getUint32(18, true);
    const fileNameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));

    expect(compression).toBe(0);
    if (name === fileName) {
      return decoder.decode(bytes.slice(dataStart, dataStart + compressedSize));
    }
    offset = dataStart + compressedSize;
  }

  throw new Error(`Could not find ${fileName} in downloaded package`);
}

const importedBoardJson = JSON.stringify({
  categories: [
    {
      id: 'imported-category-e2e',
      label: '가져온 대분류',
      description: 'E2E 가져오기 검증용 대분류',
      order: 1,
      icon: '📌',
    },
  ],
  subtopics: [
    {
      id: 'imported-subtopic-e2e',
      categoryId: 'imported-category-e2e',
      label: '가져온 주제',
      order: 1,
    },
  ],
  issueGroups: [
    {
      id: 'imported-issue-e2e',
      title: '가져온 이슈',
      categoryId: 'imported-category-e2e',
      subtopicId: 'imported-subtopic-e2e',
      status: 'actioning',
      statusSource: 'auto',
      firstOccurredAt: '2026-06-27',
      latestUpdatedAt: '2026-06-27',
      currentSummary: '가져오기 검증 이력',
      tags: ['가져오기'],
      groupLabel: '가져오기',
      groupColorTone: 'neutral',
      ownerName: '가져온 담당자',
      ownerResearchGroup: '검증팀',
      relatedDepartment: '운영팀',
      sensitive: false,
      archived: false,
    },
  ],
  detailIssues: [
    {
      id: 'imported-detail-e2e',
      issueGroupId: 'imported-issue-e2e',
      title: '가져온 세부 항목',
      status: 'actioning',
      firstOccurredAt: '2026-06-27',
      latestUpdatedAt: '2026-06-27',
      currentSummary: '가져오기 검증 이력',
      tags: ['가져오기'],
      ownerName: '가져온 담당자',
      ownerResearchGroup: '검증팀',
      relatedDepartment: '운영팀',
      needsReview: false,
      archived: false,
    },
  ],
  historyEntries: [
    {
      id: 'imported-history-e2e',
      issueGroupId: 'imported-issue-e2e',
      detailIssueId: 'imported-detail-e2e',
      date: '2026-06-27',
      status: 'actioning',
      changesDetailIssueStatus: true,
      recordType: 'meeting',
      summary: '가져오기 검증 이력',
      details: 'JSON 가져오기 후 홈과 보고서에서 확인되는지 검증한다.',
      remainingRisk: '검증 후 운영 반영',
      blockName: '조치중',
      referenceLinks: [],
      authorName: '가져온 담당자',
      createdAt: '2026-06-27T00:00:00.000Z',
      updatedAt: '2026-06-27T00:00:00.000Z',
    },
  ],
});

test.describe('Issue board local mode smoke', () => {
  test('primary work surfaces stay balanced across desktop, tablet, and mobile viewports', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 430, height: 874 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openFreshLocalBoard(page);
      await expectNoHorizontalOverflow(page);

      const navigationMetrics = await readVisibleElementMetrics(page, ['.sidebar-nav', '.sidebar-nav button']);
      expect(
        navigationMetrics.filter((metric) => metric.selector === '.sidebar-nav' && metric.hasInternalOverflow),
        `${viewport.name} main navigation should not need internal horizontal scrolling`,
      ).toEqual([]);
      expect(
        navigationMetrics.filter((metric) => metric.clippedByViewport),
        `${viewport.name} main navigation items should stay inside the viewport`,
      ).toEqual([]);

      const homeMetrics = await readVisibleElementMetrics(page, ['.category-card', '.subtopic-card', '.side-panel']);
      expect(homeMetrics.filter((metric) => metric.clippedByViewport), `${viewport.name} home clipped elements`).toEqual([]);
      expect(
        homeMetrics.filter((metric) => metric.selector === '.category-card' && metric.height > viewport.height * 0.42),
        `${viewport.name} home category cards should not dominate the first viewport`,
      ).toEqual([]);
      const delayedIssueCards = await page.locator('.long-running-card').count();
      const sidePanelHeightLimit = delayedIssueCards > 0 ? viewport.height * 0.68 : viewport.height * 0.42;
      expect(
        homeMetrics.filter((metric) => metric.selector === '.side-panel' && metric.height > sidePanelHeightLimit),
        `${viewport.name} delayed-issue panel should fit its actual content without stretching`,
      ).toEqual([]);
      expect(
        homeMetrics.filter((metric) => metric.selector === '.subtopic-card' && metric.height > 118),
        `${viewport.name} subtopic cards should stay compact`,
      ).toEqual([]);

      await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
      await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const detailMetrics = await readVisibleElementMetrics(page, [
        '.summary-strip.issue-dashboard',
        '.dashboard-card',
        '.history-list-panel',
        '.history-detail',
      ]);
      expect(detailMetrics.filter((metric) => metric.clippedByViewport), `${viewport.name} detail clipped elements`).toEqual([]);
      expect(
        detailMetrics.filter((metric) => metric.selector === '.dashboard-card' && metric.height > 180),
        `${viewport.name} issue dashboard cards should stay compact`,
      ).toEqual([]);

      await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '보고서', exact: true }).click();
      await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const reportMetrics = await readVisibleElementMetrics(page, [
        '.report-panel',
        '.report-filter-grid',
      ]);
      expect(reportMetrics.filter((metric) => metric.clippedByViewport), `${viewport.name} report clipped elements`).toEqual([]);
      await expect(page.getByLabel('보고서 조건')).toBeVisible();
      await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    }

    expect(consoleErrors).toEqual([]);
  });

  test('admin cards navigate to connected modules and phase filters affect owner rows', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();

    await page.getByRole('button', { name: /이슈 \/ 세부 카드 .*건 보기/ }).click();
    await expect(page.getByRole('button', { name: /이슈 \/ 세부 카드 .*건 보기/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '담당 정보 관리' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).toContainText('염수 분무 조건 편차 확인');
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).toContainText('압연 조건 변경 후 재발 확인');
    await expect.poll(async () => page.evaluate(() => {
      const table = document.querySelector('.admin-owner-table');
      const layout = document.querySelector('.admin-layout');
      return {
        tableFits: table ? table.scrollWidth <= table.clientWidth + 1 : false,
        layoutMode: layout?.className ?? '',
      };
    })).toEqual({
      tableFits: true,
      layoutMode: 'admin-layout admin-layout--owners',
    });

    await page.getByRole('button', { name: /진행 .*건/ }).click();
    await expect(page.getByRole('button', { name: /진행 .*건/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).toContainText('염수 분무 조건 편차 확인');
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).not.toContainText('압연 조건 변경 후 재발 확인');

    await page.getByRole('button', { name: /전체 단계 보기 .*건/ }).click();
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).toContainText('압연 조건 변경 후 재발 확인');
    await page.getByTestId('admin-detail-owner-detail-sts-corrosion-test-condition').fill('보고서담당');

    await page.getByRole('button', { name: /대분류 \/ 하위 주제 .*개 보기/ }).click();
    await expect(page.getByRole('button', { name: '분류 관리' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('대분류명 강종/제품')).toHaveValue('강종/제품');

    await page.getByRole('button', { name: /옵션 .*개 표시명과 후보 관리 보기/ }).click();
    await expect(page.getByRole('button', { name: '옵션 관리' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: '옵션 관리' })).toContainText('세부 단계 표시명');

    await page.getByRole('button', { name: /데이터 .*건 내보내기와 가져오기 보기/ }).click();
    await expect(page.getByRole('button', { name: '데이터 관리' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: '데이터 연결 현황' })).toContainText('이력');

    await page.getByRole('button', { name: '권한 관리 사용자 추가와 역할 변경 보기' }).click();
    await expect(page.getByRole('button', { name: '권한 관리', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: '권한 관리' })).toBeVisible();

    await page.getByRole('button', { name: /이력 .*건 보고서 양식 보기/ }).click();
    await expect(page.getByRole('button', { name: '보고서 양식', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /강종\/제품 \/ STS/ }).click();
    await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
    await expect(page.getByLabel('하위 주제')).toHaveValue('sts');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test('admin owner master edits propagate to home, detail, and report surfaces', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '관리자 마스터 데이터 연결 검증은 데스크톱 로컬 모드에서 실행합니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: '담당 정보 관리', exact: true }).click();
    await page.getByLabel('염수 분무 조건 편차 확인 이슈명').fill('STS 조건 편차 통합 관리');
    await page.getByLabel('염수 분무 조건 편차 확인 업무 라벨').fill('조건편차연결');
    await page.getByLabel('염수 분무 조건 편차 확인 대표 단계').selectOption('closed');
    await page.getByLabel('염수 분무 조건 편차 확인 담당자').fill('연결담당');
    await page.getByLabel('염수 분무 조건 편차 확인 담당부서').fill('연결검증팀');
    await page.getByLabel('염수 분무 조건 편차 확인 세부 항목명').fill('관리자 연결 세부 항목');

    await page.getByRole('button', { name: '홈', exact: true }).click();
    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    await page.getByRole('button', { name: /STS/ }).click();

    await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();
    await expect(page.getByText('STS 조건 편차 통합 관리')).toBeVisible();
    await expect(page.getByText('조건편차연결')).toBeVisible();
    await page.getByRole('region', { name: '날짜별 이력 목록' }).getByRole('button', {
      name: /시험 조건 편차 원인 검토/,
    }).click();

    const detail = page.getByRole('region', { name: '선택한 날짜 이력 상세' });
    await expect(detail).toContainText('STS 조건 편차 통합 관리');
    await expect(detail).toContainText('연결담당');
    await expect(detail).toContainText('연결검증팀');
    await expect(page.getByRole('button', { name: /처리 지연 이슈/ })).toContainText('0건');

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: /이력 .*건 보고서 양식 보기/ }).click();
    await page.getByRole('button', { name: /강종\/제품 \/ STS/ }).click();

    await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
    await expect(page.getByLabel('하위 주제')).toHaveValue('sts');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test('admin modules stay balanced across desktop, tablet, and mobile viewports', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 430, height: 874 },
    ];
    const modules = [
      {
        buttonName: '분류 관리',
        regionName: '분류 관리',
        selectors: ['.admin-taxonomy-group', '.admin-subtopic-row'],
      },
      {
        buttonName: '데이터 관리',
        regionName: '데이터 관리',
        selectors: ['.admin-data-summary span', '.admin-actions button', '.file-button'],
      },
      {
        buttonName: '담당 정보 관리',
        regionName: '담당 정보 관리',
        selectors: ['.admin-owner-table', '.admin-owner-table__row'],
      },
      {
        buttonName: '옵션 관리',
        regionName: '옵션 관리',
        selectors: ['.admin-option-card', '.admin-option-row', '.admin-label-option-row'],
      },
      {
        buttonName: '권한 관리',
        regionName: '권한 관리',
        selectors: ['.admin-panel--permission-note'],
      },
      {
        buttonName: '보고서 양식',
        regionName: '보고서 양식',
        selectors: ['.admin-template-preview', '.admin-report-shortcut-list button'],
      },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openFreshLocalBoard(page);
      await page.getByRole('button', { name: '관리자' }).click();
      await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const dashboardMetrics = await readVisibleElementMetrics(page, ['.admin-stat-grid button', '.admin-module-list button']);
      expect(
        dashboardMetrics.filter((metric) => metric.clippedByViewport),
        `${viewport.name} admin shortcut buttons should stay inside the viewport`,
      ).toEqual([]);
      expect(
        dashboardMetrics.filter((metric) => metric.selector === '.admin-stat-grid button' && metric.height > 128),
        `${viewport.name} admin stat cards should not become oversized`,
      ).toEqual([]);

      for (const module of modules) {
        await page.getByRole('button', { name: module.buttonName, exact: true }).click();
        await expect(page.getByRole('region', { name: module.regionName })).toBeVisible();
        await expectNoHorizontalOverflow(page);

        const moduleMetrics = await readVisibleElementMetrics(page, module.selectors);
        expect(
          moduleMetrics.filter((metric) => metric.clippedByViewport),
          `${viewport.name} ${module.buttonName} should not clip visible controls`,
        ).toEqual([]);
        expect(
          moduleMetrics.filter((metric) => metric.hasInternalOverflow && !['.admin-owner-table'].includes(metric.selector)),
          `${viewport.name} ${module.buttonName} should not require hidden internal horizontal scrolling`,
        ).toEqual([]);
      }

      const typography = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.admin-page .admin-panel h2, .admin-module-list button, .admin-stat-grid span'))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          })
          .map((element) => ({
            text: element.textContent?.replace(/\s+/g, ' ').trim(),
            selector: element.matches('h2') ? 'h2' : element.matches('button') ? 'module-button' : 'stat-label',
            fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
          })),
      );
      const panelHeadings = typography.filter((item) => item.selector === 'h2');
      const moduleButtons = typography.filter((item) => item.selector === 'module-button');
      const statLabels = typography.filter((item) => item.selector === 'stat-label');
      expect(
        panelHeadings.filter((item) => item.fontSize < 14 || item.fontSize > 18),
        `${viewport.name} admin panel headings should keep a consistent compact size`,
      ).toEqual([]);
      expect(
        moduleButtons.filter((item) => item.fontSize < 11 || item.fontSize > 13),
        `${viewport.name} admin menu labels should use one compact size band`,
      ).toEqual([]);
      expect(
        statLabels.filter((item) => item.fontSize < 11 || item.fontSize > 13),
        `${viewport.name} admin stat labels should use one compact size band`,
      ).toEqual([]);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('home long-running issue shortcuts open the delayed issue view', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    const delayedPanel = page.getByRole('complementary', { name: '장기 미해결 이슈' });
    await expect(delayedPanel.getByText('30일 이상 미해결')).toBeVisible();
    await delayedPanel.getByRole('button', { name: '전체 보기' }).click();

    await expect(page.getByRole('heading', { name: /이슈$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /처리 지연 이슈/ })).toHaveClass(/is-active/);
    await expect(page.getByRole('button', { name: '전체 보기' })).toBeVisible();

    await page.getByRole('button', { name: '홈으로' }).click();
    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    const firstDelayedIssue = delayedPanel.locator('.long-running-card').first();
    const firstDelayedIssueScope = await firstDelayedIssue.locator('span').textContent();
    await firstDelayedIssue.click();

    await expect(page.getByRole('button', { name: /처리 지연 이슈/ })).toHaveClass(/is-active/);
    const firstDelayedSubtopic = firstDelayedIssueScope?.split('>').pop()?.trim();
    if (firstDelayedSubtopic) {
      await expect(page.getByRole('heading', { name: `${firstDelayedSubtopic} 이슈` })).toBeVisible();
    }
    await expect(page.getByRole('region', { name: '날짜별 이력' })).toContainText('대시보드: 처리 지연 이슈');

    expect(consoleErrors).toEqual([]);
  });

  test('topbar search and notifications navigate to connected issue views', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByLabel('전체 검색').fill('내식성');
    const searchResults = page.getByRole('region', { name: '검색 결과' });
    await expect(searchResults).toBeVisible();
    await searchResults.getByRole('button', { name: /STS 내식성 시험 조건 이슈/ }).first().click();

    await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();
    await expect(page.getByRole('region', { name: '날짜별 이력' })).toContainText('시험 조건 편차 원인 검토');

    await page.getByRole('button', { name: '홈', exact: true }).click();
    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();

    await page.getByRole('button', { name: /알림 \d+건/ }).click();
    const notificationPanel = page.getByRole('region', { name: '알림 목록' });
    await expect(notificationPanel).toBeVisible();
    await expect(notificationPanel).toContainText('처리 지연');
    await notificationPanel.getByRole('button', { name: /후판 초음파 탐상 재검 일정 조정/ }).click();

    await expect(page.getByRole('heading', { name: '후판 이슈' })).toBeVisible();
    await expect(page.getByRole('button', { name: /처리 지연 이슈/ })).toHaveClass(/is-active/);

    expect(consoleErrors).toEqual([]);
  });

  test('topbar search and notification overlays stay readable across desktop and mobile', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 430, height: 874 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openFreshLocalBoard(page);

      await page.getByLabel('전체 검색').fill('내식성');
      await expect(page.getByRole('region', { name: '검색 결과' })).toBeVisible();
      const searchOverlayMetrics = await readVisibleElementMetrics(page, ['.global-search-results', '.global-search-results button']);
      expect(
        searchOverlayMetrics.filter((metric) => metric.clippedByViewport),
        `${viewport.name} search overlay should stay inside the viewport`,
      ).toEqual([]);
      expect(
        searchOverlayMetrics.filter((metric) => metric.selector === '.global-search-results' && metric.height > viewport.height * 0.64),
        `${viewport.name} search overlay should not dominate the viewport`,
      ).toEqual([]);

      await page.getByRole('button', { name: /알림 \d+건/ }).click();
      await expect(page.getByRole('region', { name: '검색 결과' })).toHaveCount(0);
      await expect(page.getByRole('region', { name: '알림 목록' })).toBeVisible();
      const notificationMetrics = await readVisibleElementMetrics(page, ['.notification-panel', '.notification-group button']);
      expect(
        notificationMetrics.filter((metric) => metric.clippedByViewport),
        `${viewport.name} notification panel should stay inside the viewport`,
      ).toEqual([]);
      expect(
        notificationMetrics.filter((metric) => metric.selector === '.notification-panel' && metric.height > viewport.height * 0.68),
        `${viewport.name} notification panel should stay compact enough to scan`,
      ).toEqual([]);
      await expectNoHorizontalOverflow(page);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('history detail important marker toggles review state', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await openStsHistoryDetail(page);
    const importantButton = page.getByRole('button', { name: '중요 표시', exact: true });
    await expect(importantButton).toBeVisible();
    await expect(importantButton).toHaveAttribute('aria-pressed', 'false');

    await importantButton.click();

    await expect(page.getByRole('button', { name: '중요 표시 해제' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('검토 필요')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('report page filters history and produces Excel and Word downloads', async ({ page }, testInfo) => {
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '보고서', exact: true }).click();
    await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
    if (testInfo.project.name === 'chromium') {
      await expect(page.getByRole('region', { name: '데이터 관리' })).toBeVisible();
    }

    await page.getByLabel('하위 주제').selectOption('sts');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    const excelDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel 다운로드' }).click();
    const excelDownload = await excelDownloadPromise;
    expect(excelDownload.suggestedFilename()).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const excelSheet = readZipText(await downloadToBytes(excelDownload), 'xl/worksheets/sheet1.xml');
    expect(excelSheet).toContain('STS');
    expect(excelSheet).toContain('시험 조건 편차 원인 검토');
    expect(excelSheet).toContain('박연구');
    expect(excelSheet).not.toContain('공동연구 샘플 반출 승인 지연');

    const wordDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Word 보고서' }).click();
    const wordDownload = await wordDownloadPromise;
    expect(wordDownload.suggestedFilename()).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.docx$/);
    const wordDocument = readZipText(await downloadToBytes(wordDownload), 'word/document.xml');
    expect(wordDocument).toContain('STS 이력 보고서');
    expect(wordDocument).toContain('이력: 5건');
    expect(wordDocument).toContain('시험 조건 편차 원인 검토');
    expect(wordDocument).not.toContain('공동연구 샘플 반출 승인 지연');

    await page.getByLabel('보고서 양식').selectOption('delayed');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    await page.getByLabel('하위 주제').selectOption('');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    const delayedWordDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Word 보고서' }).click();
    const delayedWordDownload = await delayedWordDownloadPromise;
    expect(delayedWordDownload.suggestedFilename()).toMatch(/^전체_처리_지연_이슈_보고서-\d{4}-\d{2}-\d{2}\.docx$/);
    const delayedWordDocument = readZipText(await downloadToBytes(delayedWordDownload), 'word/document.xml');
    expect(delayedWordDocument).toContain('보고서 양식: 처리 지연 이슈');
    expect(delayedWordDocument).toContain('후판 초음파 탐상 재검 일정 조정');
    expect(delayedWordDocument).not.toContain('시험 조건 편차 원인 검토');

    expect(consoleErrors).toEqual([]);
  });

  test('report page keeps empty filtered results readable and exports the empty report', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '빈 결과 보고서 다운로드 내용 검증은 데스크톱에서 실행합니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '보고서', exact: true }).click();
    await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
    await page.getByLabel('하위 주제').selectOption('sts');
    await page.getByLabel('시작일').fill('2026-06-26');
    await page.getByLabel('종료일').fill('2026-06-27');

    await expect(page.getByRole('region', { name: '보고서 조건' })).toContainText('0건');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    const reportMetrics = await readVisibleElementMetrics(page, [
      '.report-panel',
      '.report-page__actions button',
    ]);
    expect(reportMetrics.filter((metric) => metric.clippedByViewport), 'empty report view should not clip').toEqual([]);

    const wordDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Word 보고서' }).click();
    const wordDownload = await wordDownloadPromise;
    expect(wordDownload.suggestedFilename()).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.docx$/);
    const wordDocument = readZipText(await downloadToBytes(wordDownload), 'word/document.xml');
    expect(wordDocument).toContain('이력: 0건');
    expect(wordDocument).toContain('선택한 조건에 해당하는 이력이 없습니다.');
    expect(wordDocument).toContain('기간 2026-06-26 ~ 2026-06-27');
    expect(wordDocument).not.toContain('시험 조건 편차 원인 검토');

    expect(consoleErrors).toEqual([]);
  });

  test('mobile report page keeps empty filtered results compact and readable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', '모바일 빈 결과 보고서 레이아웃 전용 회귀 테스트입니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '보고서', exact: true }).click();
    await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
    await page.getByLabel('하위 주제').selectOption('sts');
    await page.getByLabel('시작일').fill('2026-06-26');
    await page.getByLabel('종료일').fill('2026-06-27');

    await expect(page.getByRole('region', { name: '보고서 조건' })).toContainText('0건');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const width = window.innerWidth;
      const documentScrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const filterPanel = document.querySelector('.report-panel--filters');
      const actions = document.querySelector('.report-page__actions');
      return {
        hasHorizontalOverflow: documentScrollWidth > width + 1,
        filterPanelWidth: filterPanel?.clientWidth ?? 0,
        filterPanelScrollWidth: filterPanel?.scrollWidth ?? 0,
        actionsWidth: actions?.clientWidth ?? 0,
        actionsScrollWidth: actions?.scrollWidth ?? 0,
      };
    });

    expect(layout.hasHorizontalOverflow).toBe(false);
    expect(layout.filterPanelScrollWidth).toBeLessThanOrEqual(layout.filterPanelWidth + 1);
    expect(layout.actionsScrollWidth).toBeLessThanOrEqual(layout.actionsWidth + 1);
    expect(consoleErrors).toEqual([]);
  });

  test('data management exports board files and imports JSON board data', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '데이터 관리 패널은 모바일 레이아웃에서 숨겨집니다.');
    const consoleErrors = collectConsoleErrors(page);
    const customStatusLabel = '원인 확인 E2E';
    const customRecordTypeLabel = '기타 기록 E2E';
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: '옵션 관리', exact: true }).click();
    await page.getByLabel('세부 단계 원인검토').fill(customStatusLabel);
    await page.getByLabel('유형 기타').fill(customRecordTypeLabel);

    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '보고서', exact: true }).click();
    await expect(page.getByRole('region', { name: '데이터 관리' })).toBeVisible();

    const jsonDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'JSON 내보내기' }).click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/^research-issue-board-\d{4}-\d{2}-\d{2}\.json$/);
    const exportedJson = JSON.parse(Buffer.from(await downloadToBytes(jsonDownload)).toString('utf-8')) as {
      categories: Array<{ label: string }>;
      issueGroups: Array<{ title: string }>;
      historyEntries: Array<{ summary: string }>;
    };
    expect(exportedJson.categories.some((category) => category.label === '강종/제품')).toBe(true);
    expect(exportedJson.issueGroups.some((issue) => issue.title === 'STS 내식성 시험 조건 이슈')).toBe(true);
    expect(exportedJson.historyEntries.some((entry) => entry.summary === '시험 조건 편차 원인 검토')).toBe(true);

    const excelDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel 내보내기' }).click();
    const excelDownload = await excelDownloadPromise;
    expect(excelDownload.suggestedFilename()).toMatch(/^research-issue-board-history-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const excelBytes = await downloadToBytes(excelDownload);
    const excelSheet = readZipText(excelBytes, 'xl/worksheets/sheet1.xml');
    expect(excelSheet).toContain('STS 내식성 시험 조건 이슈');
    expect(excelSheet).toContain('시험 조건 편차 원인 검토');
    expect(excelSheet).toContain(customStatusLabel);
    expect(excelSheet).toContain(customRecordTypeLabel);

    await page.getByLabel('Excel 가져오기').setInputFiles({
      name: 'roundtrip-board.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(excelBytes),
    });
    await expect.poll(async () => page.evaluate(() => {
      const raw = window.localStorage.getItem('research-issue-board-data');
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as {
        historyEntries: Array<{ id: string; status: string; recordType?: string; blockName: string }>;
      };
      const entry = parsed.historyEntries.find((item) => item.id === 'hist-sts-corrosion-review');
      return entry ? { status: entry.status, recordType: entry.recordType, blockName: entry.blockName } : undefined;
    })).toEqual({
      status: 'cause_review',
      recordType: 'other',
      blockName: customStatusLabel,
    });

    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '보고서', exact: true }).click();
    await expect(page.getByRole('region', { name: '데이터 관리' })).toBeVisible();
    await page.getByLabel('JSON 가져오기').setInputFiles({
      name: 'imported-board.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importedBoardJson),
    });

    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '가져온 대분류' })).toBeVisible();
    await page.getByRole('button', { name: '보고서' }).click();
    await page.getByLabel('하위 주제').selectOption('imported-subtopic-e2e');
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test('admin data management imports JSON and resets the board', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: '데이터 관리', exact: true }).click();
    await expect(page.getByRole('region', { name: '데이터 관리' })).toBeVisible();
    await page.getByLabel('JSON 가져오기').setInputFiles({
      name: 'imported-board.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importedBoardJson),
    });

    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '가져온 대분류' })).toBeVisible();

    await page.getByRole('button', { name: '관리자' }).click();
    await expect(page.getByTestId('admin-category-imported-category-e2e')).toHaveValue('가져온 대분류');
    await page.getByRole('button', { name: '데이터 관리', exact: true }).click();
    await page.getByRole('button', { name: '초기 데이터' }).click();

    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '강종/제품' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '가져온 대분류' })).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test('admin option labels feed add-history controls and saved detail chips in local mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '옵션 연결 검증은 데스크톱 로컬 모드에서 실행합니다.');
    const consoleErrors = collectConsoleErrors(page);
    const statusLabel = '검증 완료 E2E';
    const recordTypeLabel = '보고서형 기록 E2E';
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: '옵션 관리', exact: true }).click();
    const optionRegion = page.getByRole('region', { name: '옵션 관리' });
    await optionRegion.getByLabel('세부 단계 검증').fill(statusLabel);
    await optionRegion.getByLabel('유형 보고').fill(recordTypeLabel);

    await page
      .getByRole('navigation', { name: '주요 메뉴' })
      .getByRole('button', { name: '이력 추가', exact: true })
      .click();
    const drawer = page.getByRole('complementary', { name: '이력 추가' });
    await expect(drawer).toBeVisible();
    await drawer.getByLabel('기존 대분류').selectOption({ label: '강종/제품' });
    await drawer.getByLabel('기존 하위 주제').selectOption({ label: 'STS' });
    await drawer.getByLabel('기존 이슈').selectOption({ label: 'STS 내식성 시험 조건 이슈' });
    await drawer.getByLabel('기존 세부 항목').selectOption({ label: '염수 분무 조건 편차 확인' });

    await drawer.getByRole('group', { name: '상태' }).getByRole('button', { name: '진행' }).click();
    await drawer.getByRole('group', { name: '세부 항목 상태' }).getByRole('button', { name: statusLabel }).click();
    await drawer.getByRole('group', { name: '유형' }).getByRole('button', { name: recordTypeLabel }).click();
    await drawer.getByLabel('요약').fill('관리자 옵션 연결 검증');
    await drawer.getByLabel('상세 내용').fill('- 관리자에서 바꾼 표시명이 drawer와 상세에 이어지는지 확인했다.');
    await drawer.getByLabel('향후 계획').fill('- 보고서 양식 연결도 같은 옵션을 사용한다.');
    await drawer.getByRole('button', { name: '이력 추가', exact: true }).click();

    const historyList = page.getByRole('region', { name: '날짜별 이력 목록' });
    await expect(historyList).toContainText('관리자 옵션 연결 검증');
    await historyList.getByRole('button', { name: /관리자 옵션 연결 검증/ }).click();

    const detail = page.getByRole('region', { name: '선택한 날짜 이력 상세' });
    await expect(detail).toContainText('관리자 옵션 연결 검증');
    await expect(detail.getByLabel('이력 메타 정보')).toContainText(statusLabel);
    await expect(detail.getByLabel('이력 메타 정보')).toContainText(recordTypeLabel);
    expect(consoleErrors).toEqual([]);
  });

  test('admin taxonomy edits propagate to home cards and add-history selectors', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '분류 편집 연결 검증은 데스크톱 로컬 모드에서 실행합니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByTestId('admin-category-grade-product').fill('강종/제품군');
    await page.getByTestId('admin-subtopic-sts').fill('STS-관리연결');
    const hpfRow = page.locator('.admin-subtopic-row').filter({ has: page.getByTestId('admin-subtopic-hpf') });
    await hpfRow.getByRole('checkbox').check();

    await page.getByRole('button', { name: '홈', exact: true }).click();
    await expect(page.getByRole('heading', { name: '강종/제품군' })).toBeVisible();
    await expect(page.getByRole('button', { name: /STS-관리연결/ })).toBeVisible();
    await expect(page.locator('.subtopic-card').filter({ hasText: 'HPF' })).toHaveCount(0);

    await page
      .getByRole('navigation', { name: '주요 메뉴' })
      .getByRole('button', { name: '이력 추가', exact: true })
      .click();
    const drawer = page.getByRole('complementary', { name: '이력 추가' });
    await expect(drawer.getByLabel('기존 대분류')).toContainText('강종/제품군');
    await drawer.getByLabel('기존 대분류').selectOption({ label: '강종/제품군' });
    await expect(drawer.getByLabel('기존 하위 주제')).toContainText('STS-관리연결');
    await expect(drawer.getByLabel('기존 하위 주제')).not.toContainText('HPF');

    expect(consoleErrors).toEqual([]);
  });

  test('STS history detail keeps plan text, timeline colors, and issue grouping connected', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '상세/타임라인 시각 상태 검증은 데스크톱 로컬 모드에서 실행합니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    const selectedSubtopicCard = page.locator('.subtopic-card.is-selected').filter({ hasText: 'STS' });
    await expect(selectedSubtopicCard).toBeVisible();
    const selectionStyle = await selectedSubtopicCard.evaluate((element) => {
      const computedStyle = window.getComputedStyle(element);
      const markerStyle = window.getComputedStyle(element, '::after');
      return {
        boxShadow: computedStyle.boxShadow,
        markerDisplay: markerStyle.display,
        markerContent: markerStyle.content,
      };
    });
    expect(selectionStyle.boxShadow).not.toContain('inset 3px');
    expect(selectionStyle.markerDisplay).toBe('none');
    expect(selectionStyle.markerContent === 'none' || selectionStyle.markerContent === 'normal').toBe(true);

    await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
    const detail = page.getByRole('region', { name: '선택한 날짜 이력 상세' });
    await expect(detail).toContainText('향후 계획');
    await expect(detail).toContainText('동일 조건 반복 시험 필요');
    await expect(detail).not.toContainText('다음 확인일');

    const selectedTimelineRow = detail.locator('.timeline-row').filter({ hasText: '시험 조건 편차 원인 검토' });
    await expect(selectedTimelineRow).toHaveClass(/is-selected/);
    await expect(selectedTimelineRow).toHaveClass(/status-cause_review/);

    const historyList = page.getByRole('region', { name: '날짜별 이력 목록' });
    const selectedHistoryRow = historyList.getByRole('button', { name: /시험 조건 편차 원인 검토/ });
    await expect(selectedHistoryRow).toHaveClass(/is-selected/);

    await historyList.getByRole('button', { name: '이슈별 모음' }).click();
    const selectedIssueRow = page.locator('.issue-group-row').filter({ hasText: 'STS 내식성 시험 조건 이슈' });
    await expect(selectedIssueRow).toHaveClass(/is-selected/);
    await page.locator('.issue-group-row').filter({ hasText: 'STS-430 표면 결함 재발' }).click();
    await expect(detail).toContainText('STS-430 표면 결함 재발');
    await expect(detail).toContainText('최종 조건 조정 후 재발 없음');

    expect(consoleErrors).toEqual([]);
  });

  test('history issue labels remain visible and contained for long work labels', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const longLabel = '초장기공정조건변경검토라벨';
    await openFreshLocalBoard(page);

    await page.evaluate((label) => {
      const rawData = window.localStorage.getItem('research-issue-board-data');
      if (!rawData) throw new Error('Missing board data');
      const data = JSON.parse(rawData) as {
        issueGroups: Array<{ id: string; groupLabel: string; tags: string[] }>;
      };
      data.issueGroups = data.issueGroups.map((issue) =>
        issue.id === 'issue-sts-corrosion-test'
          ? { ...issue, groupLabel: label, tags: [label, ...issue.tags.filter((tag) => tag !== label)] }
          : issue,
      );
      window.localStorage.setItem('research-issue-board-data', JSON.stringify(data));
    }, longLabel);
    await page.reload();
    await expect(page.getByRole('heading', { name: '카테고리별 현황' })).toBeVisible();

    await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
    const historyList = page.getByRole('region', { name: '날짜별 이력 목록' });
    const dateRow = historyList.getByRole('button', { name: /시험 조건 편차 원인 검토/ });
    await expect(dateRow.locator('.issue-chip')).toContainText(longLabel);

    async function readChipLayout(selector: string) {
      return page.locator(selector).evaluate((row) => {
        const chip = row.querySelector('.issue-chip');
        const meta = row.querySelector('.row-meta');
        if (!chip || !meta) return { hasChip: false };
        const rowRect = row.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        return {
          hasChip: true,
          rowOverflow: row.scrollWidth > row.clientWidth + 1,
          metaOverflow: meta.scrollWidth > meta.clientWidth + 1,
          chipVisible: chipRect.width >= 48 && chipRect.height >= 10,
          chipWithinRow: chipRect.left >= rowRect.left - 1 && chipRect.right <= rowRect.right + 1,
        };
      });
    }

    await expect.poll(() => readChipLayout('.history-row.is-selected')).toEqual({
      hasChip: true,
      rowOverflow: false,
      metaOverflow: false,
      chipVisible: true,
      chipWithinRow: true,
    });

    await historyList.getByRole('button', { name: '이슈별 모음' }).click();
    const issueRow = page.locator('.issue-group-row').filter({ hasText: 'STS 내식성 시험 조건 이슈' });
    await expect(issueRow.locator('.issue-chip')).toContainText(longLabel);
    await expect.poll(() => readChipLayout('.issue-group-row.is-selected')).toEqual({
      hasChip: true,
      rowOverflow: false,
      metaOverflow: false,
      chipVisible: true,
      chipWithinRow: true,
    });

    expect(consoleErrors).toEqual([]);
  });

  test('edit history drawer preserves an unselected record type while saving changes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', '수정 drawer 흐름은 데스크톱 로컬 모드에서 실행합니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
    const detail = page.getByRole('region', { name: '선택한 날짜 이력 상세' });
    await expect(detail.getByLabel('이력 메타 정보')).toContainText('일반');

    await page.getByRole('button', { name: '이력 수정' }).click();
    const drawer = page.getByRole('complementary', { name: '이력 수정' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('checkbox', { name: '미선택' })).toBeChecked();

    await drawer.getByLabel('요약').fill('이력 수정 drawer 검증');
    await drawer.getByLabel('향후 계획').fill('- 수정 저장 후에도 유형 미선택을 유지한다.');
    await drawer.getByRole('button', { name: '이력 수정 저장' }).click();

    await expect(detail).toContainText('이력 수정 drawer 검증');
    await expect(detail).toContainText('수정 저장 후에도 유형 미선택을 유지한다.');
    await expect(detail.getByLabel('이력 메타 정보')).toContainText('일반');
    await expect(detail.getByLabel('이력 메타 정보')).not.toContainText('조치');
    expect(consoleErrors).toEqual([]);
  });

  test('mobile admin view keeps operational controls within the viewport', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 430, height: 874 });
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: '담당 정보 관리' }).click();
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const width = window.innerWidth;
      const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const ownerTable = document.querySelector('.admin-owner-table');
      return {
        hasHorizontalOverflow: scrollWidth > width + 1,
        ownerTableClientWidth: ownerTable?.clientWidth ?? 0,
        ownerTableScrollWidth: ownerTable?.scrollWidth ?? 0,
      };
    });

    expect(layout.hasHorizontalOverflow).toBe(false);
    expect(layout.ownerTableScrollWidth).toBeLessThanOrEqual(layout.ownerTableClientWidth + 1);
    expect(consoleErrors).toEqual([]);
  });

  test('tablet admin owner controls use readable full-width cards without horizontal overflow', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: '관리자' }).click();
    await page.getByRole('button', { name: '담당 정보 관리' }).click();
    await expect(page.getByRole('region', { name: '담당 정보 관리' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const width = window.innerWidth;
      const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const ownerTable = document.querySelector('.admin-owner-table');
      const ownerRow = document.querySelector('.admin-owner-table__row');
      return {
        hasHorizontalOverflow: scrollWidth > width + 1,
        ownerTableClientWidth: ownerTable?.clientWidth ?? 0,
        ownerTableScrollWidth: ownerTable?.scrollWidth ?? 0,
        ownerRowClientWidth: ownerRow?.clientWidth ?? 0,
      };
    });

    expect(layout.hasHorizontalOverflow).toBe(false);
    expect(layout.ownerTableScrollWidth).toBeLessThanOrEqual(layout.ownerTableClientWidth + 1);
    expect(layout.ownerRowClientWidth).toBeGreaterThan(620);
    expect(consoleErrors).toEqual([]);
  });

  test('mobile STS history view keeps tabs, list, and detail reveal contained', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', '모바일 STS 상세 레이아웃 전용 회귀 테스트입니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
    await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();

    await expect.poll(async () => page.evaluate(() => {
      const width = window.innerWidth;
      const tabs = document.querySelector('.history-view-tabs');
      const summary = document.querySelector('.issue-dashboard');
      return {
        hasHorizontalOverflow: document.documentElement.scrollWidth > width + 1,
        tabsOverflow: tabs ? tabs.scrollWidth > tabs.clientWidth + 1 : true,
        summaryOverflow: summary ? summary.scrollWidth > summary.clientWidth + 1 : true,
      };
    })).toEqual({
      hasHorizontalOverflow: false,
      tabsOverflow: false,
      summaryOverflow: false,
    });

    const historyList = page.getByRole('region', { name: '날짜별 이력 목록' });
    await historyList.getByRole('button', { name: '이슈별 모음' }).click();
    await expect(page.locator('.issue-group-row').filter({ hasText: 'STS 내식성 시험 조건 이슈' })).toBeVisible();
    await page.locator('.issue-group-row').filter({ hasText: 'STS-430 표면 결함 재발' }).click();

    const detail = page.getByRole('region', { name: '선택한 날짜 이력 상세' });
    await expect(detail).toContainText('STS-430 표면 결함 재발');
    await expect(detail).toContainText('향후 계획');
    await expect(detail).not.toContainText('다음 확인일');

    await page.getByRole('button', { name: '상세 닫기' }).click();
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(consoleErrors).toEqual([]);
  });

  test('mobile add history drawer saves a connected existing issue entry without layout overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', '모바일 drawer 레이아웃 전용 회귀 테스트입니다.');
    const consoleErrors = collectConsoleErrors(page);
    await openFreshLocalBoard(page);

    await page
      .getByRole('navigation', { name: '주요 메뉴' })
      .getByRole('button', { name: '이력 추가', exact: true })
      .click();
    const drawer = page.getByRole('complementary', { name: '이력 추가' });
    await expect(drawer).toBeVisible();

    await drawer.getByLabel('기존 대분류').selectOption({ label: '강종/제품' });
    await drawer.getByLabel('기존 하위 주제').selectOption({ label: 'STS' });
    await drawer.getByLabel('기존 이슈').selectOption({ label: 'STS 내식성 시험 조건 이슈' });
    await drawer.getByLabel('기존 세부 항목').selectOption({ label: '염수 분무 조건 편차 확인' });

    await drawer.getByRole('group', { name: '상태' }).getByRole('button', { name: '진행' }).click();
    await drawer.getByRole('group', { name: '세부 항목 상태' }).getByRole('button', { name: '검증' }).click();
    await drawer.getByRole('checkbox', { name: '미선택' }).check();
    await expect(drawer.getByRole('group', { name: '유형' }).getByRole('button', { name: '보고' })).toBeDisabled();
    await drawer.getByRole('checkbox', { name: '미선택' }).uncheck();
    await drawer.getByRole('group', { name: '유형' }).getByRole('button', { name: '보고' }).click();

    await drawer.getByLabel('담당자').fill('모바일검증');
    await drawer.getByLabel('담당부서').fill('품질검증팀');
    await drawer.getByLabel('유관부서').fill('분석지원팀');
    await drawer.getByLabel('요약').fill('모바일 drawer 저장 검증');
    await drawer.getByLabel('상세 내용').fill('- 모바일에서 기존 이슈와 세부 항목을 연결했다.\n- 유형 미선택 토글과 보고 선택을 확인했다.');
    await drawer.getByLabel('향후 계획').fill('- 다음 회의에서 재현 조건을 확인한다.');
    await drawer.getByLabel('첨부 URL (여러 개 가능)').fill('https://poslab.example/mobile-drawer-1\nhttps://poslab.example/mobile-drawer-2');

    await expect.poll(async () => page.evaluate(() => {
      const element = document.querySelector('.add-history-drawer');
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return (
        document.documentElement.scrollWidth <= window.innerWidth + 1 &&
        element.scrollWidth <= element.clientWidth + 1 &&
        rect.left >= -1 &&
        rect.right <= window.innerWidth + 1
      );
    })).toBe(true);

    await drawer.getByRole('button', { name: '이력 추가', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'STS 이슈' })).toBeVisible();
    const historyList = page.getByRole('region', { name: '날짜별 이력 목록' });
    await expect(historyList).toContainText('모바일 drawer 저장 검증');
    await historyList.getByRole('button', { name: /모바일 drawer 저장 검증/ }).click();

    await expect(page.getByRole('region', { name: '선택한 날짜 이력 상세' })).toContainText('모바일 drawer 저장 검증');
    await expect(page.getByRole('region', { name: '선택한 날짜 이력 상세' })).toContainText('품질검증팀');
    await expect(page.getByRole('region', { name: '선택한 날짜 이력 상세' })).toContainText('보고');
    await expect(page.getByRole('region', { name: '선택한 날짜 이력 상세' })).toContainText('https://poslab.example/mobile-drawer-1');
    await expect(page.getByRole('region', { name: '선택한 날짜 이력 상세' })).toContainText('https://poslab.example/mobile-drawer-2');
    expect(consoleErrors).toEqual([]);
  });
});
