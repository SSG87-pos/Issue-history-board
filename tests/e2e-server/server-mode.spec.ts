import { expect, test, type APIRequestContext, type Download, type Page } from '@playwright/test';
import type { IssueBoardData } from '../../src/domain/types';
import type { CurrentUser } from '../../src/domain/serverApi';
import { seedData } from '../../src/domain/seedData';

const API_BASE_URL = `http://127.0.0.1:${process.env.E2E_SERVER_API_PORT || '42175'}/api`;
const EMPTY_BOARD = {
  categories: [],
  subtopics: [],
  issueGroups: [],
  detailIssues: [],
  historyEntries: [],
};

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !isKnownRenderingConsoleNoise(message.text())) consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });
  return consoleErrors;
}

function withoutExpectedConsoleMessages(consoleErrors: string[], expectedFragments: string[]) {
  return consoleErrors.filter((message) => !expectedFragments.some((fragment) => message.includes(fragment)));
}

function isKnownRenderingConsoleNoise(message: string) {
  return message.includes("THREE.GLTFLoader: Couldn't load texture blob:");
}

async function loginViaUi(page: Page, username: string, password: string) {
  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.removeItem('research-issue-board-auth-token'));
  await page.reload();
  const logoutButton = page.getByRole('button', { name: '로그아웃' });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  }
  await expect(page.getByRole('region', { name: '로그인' })).toBeVisible();
  await page.getByLabel('이메일').fill(username);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible();
}

async function openStsHistoryDetail(page: Page) {
  await page.getByRole('button', { name: 'STS 최근 2026-06-20 미해결 1건' }).click();
  const selectedEntry = page.getByRole('region', { name: '날짜별 이력 목록' }).getByRole('button', {
    name: /시험 조건 편차 원인 검토/,
  });
  await selectedEntry.click();
}

async function logout(page: Page) {
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('region', { name: '로그인' })).toBeVisible();
}

async function clickAdminModule(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: '관리 메뉴' })
    .getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}`) })
    .click();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
            clippedByViewport: rect.left < -1 || rect.right > viewportWidth + 1,
            hasInternalOverflow: element.scrollWidth > element.clientWidth + 1,
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

async function adminToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: 'admin', password: 'admin-password' },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).accessToken as string;
}

async function createUser(
  request: APIRequestContext,
  token: string,
  user: { username: string; password: string; displayName: string; role: 'editor' | 'viewer' | 'admin' },
) {
  const response = await request.post(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...user, isActive: true },
  });
  expect(response.status(), await response.text()).toBe(201);
}

async function resetBoard(request: APIRequestContext, token: string) {
  const response = await request.put(`${API_BASE_URL}/board`, {
    headers: { Authorization: `Bearer ${token}` },
    data: EMPTY_BOARD,
  });
  expect(response.status(), await response.text()).toBe(204);
}

async function seedBoard(request: APIRequestContext, token: string) {
  const response = await request.put(`${API_BASE_URL}/board`, {
    headers: { Authorization: `Bearer ${token}` },
    data: seedData,
  });
  expect(response.status(), await response.text()).toBe(204);
}

async function fetchBoard(request: APIRequestContext, token: string): Promise<IssueBoardData> {
  const response = await request.get(`${API_BASE_URL}/board`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json() as Promise<IssueBoardData>;
}

async function fetchUsers(request: APIRequestContext, token: string): Promise<CurrentUser[]> {
  const response = await request.get(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json() as Promise<CurrentUser[]>;
}

test('server mode login enforces editor, viewer, and admin UI permissions', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);
  const suffix = Date.now().toString(36);
  const editor = { username: `editor-${suffix}`, password: 'editor-password', displayName: '편집자', role: 'editor' as const };
  const viewer = { username: `viewer-${suffix}`, password: 'viewer-password', displayName: '조회자', role: 'viewer' as const };
  const uiUser = { username: `ui-editor-${suffix}`, password: 'ui-editor-password', displayName: 'UI 편집자' };

  await createUser(request, token, editor);
  await createUser(request, token, viewer);
  await resetBoard(request, token);

  const editorBoardSaves: string[] = [];
  page.on('request', (requestEvent) => {
    if (requestEvent.method() === 'PUT' && requestEvent.url() === `${API_BASE_URL}/board`) {
      editorBoardSaves.push(requestEvent.url());
    }
  });

  await loginViaUi(page, editor.username, editor.password);
  await expect(
    page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '이력 추가' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '관리자' })).toHaveCount(0);
  await page.getByRole('button', { name: '보고서' }).click();
  await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
  await expect(page.getByRole('region', { name: '데이터 관리' })).toHaveCount(0);
  await expect.poll(() => editorBoardSaves.length).toBeGreaterThan(0);
  await logout(page);

  await loginViaUi(page, viewer.username, viewer.password);
  await expect(page.getByRole('button', { name: '이력 추가' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '관리자' })).toHaveCount(0);
  await page.getByRole('button', { name: '보고서' }).click();
  await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
  await expect(page.getByRole('region', { name: '데이터 관리' })).toHaveCount(0);
  await logout(page);

  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();
  await clickAdminModule(page, '권한 관리');
  await expect(page.getByRole('region', { name: '사용자 권한 관리' })).toBeVisible();
  await expect(page.getByText(editor.username)).toBeVisible();
  await expect(page.getByText(viewer.username)).toBeVisible();

  const userForm = page.locator('form.admin-user-form');
  await userForm.getByLabel('아이디').fill(uiUser.username);
  await userForm.getByLabel('표시 이름').fill(uiUser.displayName);
  await userForm.getByLabel('비밀번호').fill(uiUser.password);
  await userForm.getByLabel('권한').selectOption('editor');
  await userForm.getByRole('button', { name: '사용자 추가' }).click();
  await expect(page.getByText('사용자를 추가했습니다.')).toBeVisible();
  await expect(page.getByText(uiUser.username)).toBeVisible();
  await logout(page);

  await loginViaUi(page, uiUser.username, uiUser.password);
  await expect(
    page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '이력 추가' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '관리자' })).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('server login error state stays readable without layout overflow', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);

  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.removeItem('research-issue-board-auth-token'));
  await page.reload();
  await expect(page.getByRole('region', { name: '로그인' })).toBeVisible();

  await page.getByLabel('이메일').fill('unknown-user');
  await page.getByLabel('비밀번호').fill('wrong-password');
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page.getByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  const metrics = await readVisibleElementMetrics(page, [
    '.login-panel',
    '.auth-mode-tabs',
    '.login-form input',
    '.login-error',
    '.login-submit',
  ]);
  expect(metrics.filter((metric) => metric.clippedByViewport), 'login elements should not clip viewport').toEqual([]);
  expect(
    metrics.filter((metric) => metric.selector === '.login-panel' && metric.width > page.viewportSize()!.width - 24),
    'login panel should respect viewport padding',
  ).toEqual([]);

  expect(withoutExpectedConsoleMessages(consoleErrors, ['401 (Unauthorized)'])).toEqual([]);
});

test('server login screen stays compact and readable across desktop, tablet, and mobile', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const viewports = [
    { name: 'notebook-l', width: 1440, height: 900, panelMaxWidth: 490, panelMaxHeight: 330, lanyardVisible: true },
    { name: 'tablet-landscape', width: 1024, height: 768, panelMaxWidth: 460, panelMaxHeight: 330, lanyardVisible: true },
    { name: 'tablet-portrait', width: 768, height: 1024, panelMaxWidth: 490, panelMaxHeight: 330, lanyardVisible: false },
    { name: 'phone', width: 390, height: 844, panelMaxWidth: 358, panelMaxHeight: 340, lanyardVisible: false },
    { name: 'small-phone', width: 360, height: 740, panelMaxWidth: 328, panelMaxHeight: 340, lanyardVisible: false },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await page.evaluate(() => window.sessionStorage.removeItem('research-issue-board-auth-token'));
    await page.reload();
    await expect(page.getByRole('region', { name: '로그인' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PosLAB 이력관리 센터' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '회원가입' })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeFocused();
    await expectNoHorizontalOverflow(page);
    if (viewport.lanyardVisible) {
      await expect(page.locator('.poslab-lanyard-wrapper canvas')).toBeVisible();
    } else {
      await expect(page.locator('.poslab-lanyard-wrapper canvas')).toBeHidden();
    }

    const metrics = await readVisibleElementMetrics(page, [
      '.poslab-entry-heading',
      '.login-panel',
      '.auth-mode-tabs',
      '.login-form input',
      '.login-submit',
      ...(viewport.lanyardVisible ? ['.poslab-lanyard-wrapper'] : []),
    ]);
    expect(metrics.filter((metric) => metric.clippedByViewport), `${viewport.name} login elements should not clip`).toEqual([]);
    expect(
      metrics.filter((metric) => metric.selector === '.login-panel' && metric.width > viewport.panelMaxWidth),
      `${viewport.name} login panel should keep a compact width`,
    ).toEqual([]);
    expect(
      metrics.filter((metric) => metric.selector === '.login-panel' && metric.height > viewport.panelMaxHeight),
      `${viewport.name} login panel should not become an oversized card`,
    ).toEqual([]);
    expect(
      metrics.filter((metric) => ['.login-form input', '.login-submit'].includes(metric.selector) && (metric.height < 40 || metric.height > 48)),
      `${viewport.name} login fields should keep a consistent touch-friendly height`,
    ).toEqual([]);

    const typography = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.poslab-entry-heading h1, .login-panel__header h2, .login-form label, .login-submit'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((element) => ({
          selector: element.matches('.poslab-entry-heading h1')
            ? 'hero'
            : element.matches('.login-panel__header h2')
              ? 'heading'
              : element.matches('.login-submit')
                ? 'button'
                : 'label',
          fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
        })),
    );
    expect(
      typography.filter((item) => item.selector === 'hero' && (item.fontSize < 32 || item.fontSize > 58)),
      `${viewport.name} login hero should stay prominent without exceeding the intended POSLAB entry scale`,
    ).toEqual([]);
    expect(
      typography.filter((item) => item.selector === 'heading' && (item.fontSize < 15 || item.fontSize > 19)),
      `${viewport.name} login panel heading should stay compact`,
    ).toEqual([]);
    expect(
      typography.filter((item) => !['hero', 'heading'].includes(item.selector) && (item.fontSize < 12 || item.fontSize > 15)),
      `${viewport.name} login supporting text should use one readable compact size band`,
    ).toEqual([]);
  }

  expect(consoleErrors).toEqual([]);
});

test('access request is submitted from login and reviewed by admin', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const suffix = Date.now().toString(36);
  const requestedEmail = `request-${suffix}@example.com`;
  const requestedPassword = `request-password-${suffix}`;
  const displayName = `회원가입자-${suffix}`;

  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.removeItem('research-issue-board-auth-token'));
  await page.reload();
  await expect(page.getByRole('region', { name: '로그인' })).toBeVisible();

  await page.getByRole('tab', { name: '회원가입' }).click();
  await expect(page.getByRole('region', { name: '회원가입' })).toBeVisible();
  await page.getByLabel('이름').fill(displayName);
  await page.getByLabel('이메일').fill(requestedEmail);
  await page.locator('.login-form--request').getByLabel('비밀번호').fill(requestedPassword);
  await page.locator('.login-form--request').getByRole('button', { name: '회원가입' }).click();
  await expect(page.getByText('회원가입이 접수되었습니다. 관리자가 승인하면 가입한 이메일과 비밀번호로 로그인할 수 있습니다.')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('tab', { name: '로그인' }).click();
  await page.getByLabel('이메일').fill('admin');
  await page.getByLabel('비밀번호').fill('admin-password');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();

  await page.getByRole('button', { name: '관리자' }).click();
  await clickAdminModule(page, '권한 관리');
  const requestList = page.getByRole('region', { name: '회원가입 신청 목록' });
  await expect(requestList).toBeVisible();
  await expect(requestList).toContainText(displayName);
  await expect(requestList).toContainText(requestedEmail);
  const requestRow = page.locator('.admin-access-request-row').filter({ hasText: displayName });
  await requestRow.getByRole('button', { name: '승인' }).click();
  await expect(page.getByText('회원가입을 승인하고 사용자 계정을 활성화했습니다.')).toBeVisible();
  await expect(requestRow.getByRole('button', { name: '승인' })).toHaveAttribute('aria-pressed', 'true');
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.getByLabel('이메일').fill(requestedEmail);
  await page.getByLabel('비밀번호').fill(requestedPassword);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('authenticated server work surfaces stay balanced across desktop, tablet, and mobile viewports', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 430, height: 874 },
  ];

  await resetBoard(request, token);
  await expect.poll(async () => fetchBoard(request, token)).toMatchObject(EMPTY_BOARD);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginViaUi(page, 'admin', 'admin-password');
    await expectNoHorizontalOverflow(page);
    await expect(page.getByText('등록된 대분류가 없습니다.')).toBeVisible();

    const shellMetrics = await readVisibleElementMetrics(page, [
      '.app-topbar',
      '.sidebar-nav',
      '.sidebar-nav button',
      '.topbar-logout',
    ]);
    expect(
      shellMetrics.filter((metric) => metric.clippedByViewport),
      `${viewport.name} authenticated shell controls should stay inside the viewport`,
    ).toEqual([]);
    expect(
      shellMetrics.filter((metric) => metric.selector === '.sidebar-nav' && metric.hasInternalOverflow),
      `${viewport.name} server nav should not need horizontal scrolling`,
    ).toEqual([]);

    const homeMetrics = await readVisibleElementMetrics(page, ['.category-card', '.subtopic-card', '.home-empty-state', '.side-panel']);
    expect(homeMetrics.filter((metric) => metric.clippedByViewport), `${viewport.name} server home clipped elements`).toEqual([]);
    expect(
      homeMetrics.filter((metric) => metric.selector === '.subtopic-card' && metric.height > 118),
      `${viewport.name} server subtopic cards should stay compact`,
    ).toEqual([]);

    await page.getByRole('button', { name: '보고서', exact: true }).click();
    await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const reportMetrics = await readVisibleElementMetrics(page, [
      '.report-panel',
      '.report-filter-grid',
      '.report-data-panel .admin-panel',
    ]);
    expect(reportMetrics.filter((metric) => metric.clippedByViewport), `${viewport.name} server report clipped elements`).toEqual([]);
    await expect(page.getByLabel('보고서 조건')).toBeVisible();
    await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

    await page.getByRole('button', { name: '관리자', exact: true }).click();
    await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();
    await clickAdminModule(page, '권한 관리');
    await expect(page.getByRole('region', { name: '사용자 권한 관리' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const permissionMetrics = await readVisibleElementMetrics(page, [
      '.admin-stat-grid button',
      '.admin-module-list button',
      '.admin-users-layout',
      '.admin-user-form',
      '.admin-users-table',
      '.admin-users-table__row',
    ]);
    expect(
      permissionMetrics.filter((metric) => metric.clippedByViewport),
      `${viewport.name} server permission controls should stay inside the viewport`,
    ).toEqual([]);
    expect(
      permissionMetrics.filter((metric) => metric.hasInternalOverflow && !['.admin-users-table'].includes(metric.selector)),
      `${viewport.name} server permission controls should not hide horizontal overflow`,
    ).toEqual([]);

    const typography = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.app-topbar h1, .admin-page .admin-panel h2, .report-panel__header h3'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((element) => ({
          text: element.textContent?.replace(/\s+/g, ' ').trim(),
          fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
        })),
    );
    expect(
      typography.filter((item) => item.fontSize < 14 || item.fontSize > 22),
      `${viewport.name} authenticated headings should keep a readable compact size band`,
    ).toEqual([]);

    await logout(page);
  }

  expect(consoleErrors).toEqual([]);
});

test('admin taxonomy edits persist through the server board snapshot', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);
  const suffix = Date.now().toString(36);
  const categoryLabel = `강종/제품 검증 ${suffix}`;
  const subtopicLabel = `STS 검증 ${suffix}`;

  await seedBoard(request, token);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();

  await page.getByTestId('admin-category-grade-product').fill(categoryLabel);
  await page.getByTestId('admin-subtopic-sts').fill(subtopicLabel);
  await expect.poll(async () => {
    const board = await fetchBoard(request, token);
    return {
      category: board.categories.find((category) => category.id === 'grade-product')?.label,
      subtopic: board.subtopics.find((subtopic) => subtopic.id === 'sts')?.label,
    };
  }).toEqual({
    category: categoryLabel,
    subtopic: subtopicLabel,
  });

  await logout(page);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByTestId('admin-category-grade-product')).toHaveValue(categoryLabel);
  await expect(page.getByTestId('admin-subtopic-sts')).toHaveValue(subtopicLabel);

  expect(consoleErrors).toEqual([]);
});

test('admin permissions surface protects the last active admin account', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);

  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();
  await clickAdminModule(page, '권한 관리');
  await expect(page.getByRole('region', { name: '사용자 권한 관리' })).toBeVisible();

  const adminRow = page.locator('.admin-users-table__row').filter({ hasText: 'admin' });
  await expect(adminRow).toBeVisible();
  await adminRow.getByLabel('권한').selectOption('viewer');
  await expect(page.getByText('마지막 활성 관리자 계정은 비활성화하거나 권한을 낮출 수 없습니다.')).toBeVisible();
  await expect(adminRow.getByLabel('권한')).toHaveValue('admin');

  await expect.poll(async () => {
    const users = await fetchUsers(request, token);
    const admin = users.find((user) => user.username === 'admin');
    return { role: admin?.role, isActive: admin?.isActive };
  }).toEqual({ role: 'admin', isActive: true });

  expect(withoutExpectedConsoleMessages(consoleErrors, ['400 (Bad Request)'])).toEqual([]);
});

test('admin taxonomy master edits persist through server board data', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);
  const suffix = Date.now().toString(36);
  const categoryLabel = `강종제품-${suffix}`;
  const subtopicLabel = `STS관리-${suffix}`;

  await seedBoard(request, token);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();

  await page.getByTestId('admin-category-grade-product').fill(categoryLabel);
  await page.getByTestId('admin-subtopic-sts').fill(subtopicLabel);

  await expect.poll(async () => {
    const board = await fetchBoard(request, token);
    return {
      category: board.categories.find((category) => category.id === 'grade-product')?.label,
      subtopic: board.subtopics.find((subtopic) => subtopic.id === 'sts')?.label,
    };
  }).toEqual({
    category: categoryLabel,
    subtopic: subtopicLabel,
  });

  await logout(page);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByTestId('admin-category-grade-product')).toHaveValue(categoryLabel);
  await expect(page.getByTestId('admin-subtopic-sts')).toHaveValue(subtopicLabel);

  expect(consoleErrors).toEqual([]);
});

test('admin option edits persist and feed add-history controls in server mode', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);
  const suffix = Date.now().toString(36);
  const statusLabel = `조치 진행 ${suffix}`;
  const recordTypeLabel = `액션 기록 ${suffix}`;
  const labelOption = `운영라벨-${suffix}`;
  const secondLabelOption = `긴급라벨-${suffix}`;

  await seedBoard(request, token);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await clickAdminModule(page, '옵션 관리');
  const optionRegion = page.getByRole('region', { name: '옵션 관리' });

  await optionRegion.getByLabel('세부 단계 조치중').fill(statusLabel);
  await optionRegion.getByRole('button', { name: '조치중 위로 이동' }).click();
  await optionRegion.getByRole('switch', { name: '원인검토 보임 상태' }).click();
  await optionRegion.getByRole('tab', { name: /유형/ }).click();
  await optionRegion.getByLabel('유형 조치').fill(recordTypeLabel);
  await optionRegion.getByRole('button', { name: '조치 위로 이동' }).click();
  await optionRegion.getByRole('switch', { name: '회의 보임 상태' }).click();
  await optionRegion.getByRole('tab', { name: /업무 라벨/ }).click();
  await optionRegion.getByLabel('새 업무 라벨').fill(labelOption);
  await optionRegion.getByRole('button', { name: '라벨 추가' }).click();
  await optionRegion.getByLabel('새 업무 라벨').fill(secondLabelOption);
  await optionRegion.getByRole('button', { name: '라벨 추가' }).click();
  await optionRegion.getByRole('button', { name: `${secondLabelOption} 위로 이동` }).click();

  await expect.poll(async () => {
    const board = await fetchBoard(request, token);
    return {
      statusLabel: board.settings?.statusLabels?.actioning,
      recordTypeLabel: board.settings?.recordTypeLabels?.action,
      statusOrder: board.settings?.statusOrder,
      hiddenStatuses: board.settings?.hiddenStatuses,
      recordTypeOrder: board.settings?.recordTypeOrder,
      hiddenRecordTypes: board.settings?.hiddenRecordTypes,
      labelOptions: board.settings?.labelOptions,
    };
  }).toEqual({
    statusLabel,
    recordTypeLabel,
    statusOrder: ['occurred', 'actioning', 'cause_review', 'verification', 'resolved', 'on_hold'],
    hiddenStatuses: ['cause_review'],
    recordTypeOrder: ['meeting', 'test', 'analysis', 'action', 'report', 'approval', 'customer', 'other'],
    hiddenRecordTypes: ['meeting'],
    labelOptions: [secondLabelOption, labelOption],
  });

  await logout(page);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await clickAdminModule(page, '옵션 관리');
  await expect(optionRegion.getByLabel('세부 단계 조치중')).toHaveValue(statusLabel);
  await optionRegion.getByRole('tab', { name: /유형/ }).click();
  await expect(optionRegion.getByLabel('유형 조치')).toHaveValue(recordTypeLabel);
  await optionRegion.getByRole('tab', { name: /세부 단계/ }).click();
  await expect(optionRegion.getByRole('switch', { name: '원인검토 보임 상태' })).not.toBeChecked();
  await optionRegion.getByRole('tab', { name: /유형/ }).click();
  await expect(optionRegion.getByRole('switch', { name: '회의 보임 상태' })).not.toBeChecked();
  await optionRegion.getByRole('tab', { name: /업무 라벨/ }).click();
  await expect(optionRegion.getByLabel(`업무 라벨 ${secondLabelOption}`)).toHaveValue(secondLabelOption);
  await expect(optionRegion.getByLabel(`업무 라벨 ${labelOption}`)).toHaveValue(labelOption);

  await page.getByRole('button', { name: '이력 추가' }).click();
  const statusGroup = page.getByRole('group', { name: '세부 항목 상태' });
  const recordTypeGroup = page.getByRole('group', { name: '유형' });
  await expect(statusGroup.getByRole('button').first()).toHaveText(statusLabel);
  await expect(statusGroup.getByRole('button', { name: '원인검토' })).toHaveCount(0);
  await expect(recordTypeGroup.getByRole('button', { name: recordTypeLabel })).toBeVisible();
  await expect(recordTypeGroup.getByRole('button', { name: '회의' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: '새 이슈로 기록' }).click();
  await expect(page.locator(`datalist#issue-label-options option[value="${labelOption}"]`)).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('authenticated topbar search and notifications navigate through server data', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);

  await seedBoard(request, token);
  await loginViaUi(page, 'admin', 'admin-password');

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

test('admin report shortcuts open filtered server reports and downloads office files', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);

  await seedBoard(request, token);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();

  await clickAdminModule(page, '보고서 바로가기');
  await expect(page.getByRole('region', { name: '보고서 바로가기' })).toBeVisible();
  await expect(page.getByText('선택범위_이력_보고서_YYYY-MM-DD')).toBeVisible();

  await page.getByRole('button', { name: /강종\/제품 \/ STS/ }).click();
  await expect(page.getByRole('heading', { name: '이력 보고서 만들기' })).toBeVisible();
  await expect(page.getByLabel('하위 주제')).toHaveValue('sts');
  await expect(page.getByLabel('보고서 이력 목록')).toHaveCount(0);

  const excelDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel 다운로드' }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const excelSheet = readZipText(await downloadToBytes(excelDownload), 'xl/worksheets/sheet1.xml');
  expect(excelSheet).toContain('STS');
  expect(excelSheet).toContain('시험 조건 편차 원인 검토');
  expect(excelSheet).not.toContain('공동연구 샘플 반출 승인 지연');

  const wordDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Word 보고서' }).click();
  const wordDownload = await wordDownloadPromise;
  expect(wordDownload.suggestedFilename()).toMatch(/^STS_이력_보고서-\d{4}-\d{2}-\d{2}\.docx$/);
  const wordDocument = readZipText(await downloadToBytes(wordDownload), 'word/document.xml');
  expect(wordDocument).toContain('STS 이력 보고서');
  expect(wordDocument).toContain('시험 조건 편차 원인 검토');
  expect(wordDocument).not.toContain('공동연구 샘플 반출 승인 지연');

  expect(consoleErrors).toEqual([]);
});

test('important marker toggles review state and persists on the server', async ({ page, request }) => {
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);

  await seedBoard(request, token);
  await loginViaUi(page, 'admin', 'admin-password');
  await openStsHistoryDetail(page);

  const importantButton = page.locator('.issue-title-row .icon-button').first();
  await expect(importantButton).toHaveAttribute('aria-pressed', 'false');
  await importantButton.scrollIntoViewIfNeeded();
  await importantButton.click();
  await expect(importantButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('검토 필요')).toBeVisible();

  await expect.poll(async () => {
    const board = await fetchBoard(request, token);
    return board.detailIssues.find((issue) => issue.id === 'detail-sts-corrosion-test-condition')?.needsReview;
  }).toBe(true);

  await logout(page);
  await loginViaUi(page, 'admin', 'admin-password');
  await openStsHistoryDetail(page);
  await expect(page.locator('.issue-title-row .icon-button').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('검토 필요')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('mobile admin can operate user permissions without horizontal overflow', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', '모바일 권한관리 조작성은 모바일 프로젝트에서만 확인합니다.');
  const consoleErrors = collectConsoleErrors(page);
  const token = await adminToken(request);
  const suffix = Date.now().toString(36);
  const mobileUser = {
    username: `mobile-viewer-${suffix}`,
    password: 'mobile-viewer-password',
    displayName: '모바일 조회자',
    role: 'viewer' as const,
  };
  const resetPassword = 'mobile-reset-password';

  await createUser(request, token, mobileUser);
  await loginViaUi(page, 'admin', 'admin-password');
  await page.getByRole('button', { name: '관리자' }).click();
  await expect(page.getByRole('region', { name: '관리자 페이지' })).toBeVisible();
  await clickAdminModule(page, '권한 관리');
  await expect(page.getByRole('region', { name: '사용자 권한 관리' })).toBeVisible();

  const userRow = page.locator('.admin-users-table__row').filter({ hasText: mobileUser.username });
  await expect(userRow).toBeVisible();
  await userRow.getByLabel('권한').selectOption('editor');
  await expect(page.getByText('사용자 권한을 저장했습니다.')).toBeVisible();
  await expect.poll(async () => {
    const users = await fetchUsers(request, token);
    return users.find((user) => user.username === mobileUser.username)?.role;
  }).toBe('editor');

  await userRow.getByLabel('비밀번호 재설정').fill(resetPassword);
  await userRow.getByRole('button', { name: '재설정' }).click();
  await expect(page.getByText('사용자 권한을 저장했습니다.')).toBeVisible();

  const layout = await page.evaluate(() => {
    const width = window.innerWidth;
    const documentScrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const table = document.querySelector('.admin-users-table');
    return {
      hasHorizontalOverflow: documentScrollWidth > width + 1,
      tableClientWidth: table?.clientWidth ?? 0,
      tableScrollWidth: table?.scrollWidth ?? 0,
    };
  });
  expect(layout.hasHorizontalOverflow).toBe(false);
  expect(layout.tableScrollWidth).toBeLessThanOrEqual(layout.tableClientWidth + 1);

  await logout(page);
  await loginViaUi(page, mobileUser.username, resetPassword);
  await expect(
    page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '이력 추가' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '관리자' })).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});
