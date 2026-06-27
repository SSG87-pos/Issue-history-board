# HANDOFF

## Scope

Issue board UI/UX design readability refresh.

Current branch: `codex/design-readability-refresh`
Remote: `origin` -> `https://github.com/SSG87-pos/Issue-history-board.git`
Demo URL after `gh-pages` branch deploy: `https://ssg87-pos.github.io/Issue-history-board/`

Use this file with `AGENTS.md`, `DESIGN.md`, `docs/current-ui-decisions.md`, `docs/design-readability-refresh.md`, `docs/research-history-board-summary.md`, and `TODO.md` when continuing the project in a new chat.

## Current State

The `main` branch now carries the latest design, report, backend, and agent guardrail work. The active branch `codex/design-readability-refresh` is kept aligned with `main` for continuation convenience.

The latest UI direction is a restrained, light internal operations dashboard:

- soft blue/mint sidebar, not dark navy
- subtle selection rings and light surfaces, not hard blue boxes
- no left selection rail for sidebar or selected content cards
- status colors remain consistent: received/orange, in-progress/blue, closed/green
- selected timeline rows use status-colored light backgrounds
- selected timeline dots and dates follow the row status color
- detailed entry body uses `향후 계획`, not `남은 리스크`
- add/edit drawer uses a cascading `대분류 > 하위 주제 > 이슈 > 세부 항목` step/select flow
- every add drawer step should offer both existing-item selection and new-item creation where applicable
- add drawer status buttons are compact segmented controls, not large sticker chips
- the independent `다음 확인일` block is intentionally removed from the detail body
- login uses the POSLAB entry screen with `로그인 / 회원가입` tabs; visible login labels are `이메일` and `비밀번호`
- signup collects `이름 / 이메일 / 비밀번호`, then admin approval creates an active viewer account with the submitted password
- report page is download-focused; the large report preview/list card is intentionally removed

The most important source of truth for visual decisions is:

- `DESIGN.md`
- `docs/current-ui-decisions.md`
- `docs/design-readability-refresh.md`

## Completed Work

- Created the main app flow for category, subtopic, issue group, detail issue, and dated history entries.
- Added local MVP persistence through browser storage and JSON import/export/reset controls.
- Added Excel `.xlsx` import/export for app-generated history row files. JSON remains the full backup/restore path; Excel is an operational table-review helper.
- Added report export filters and Excel/Word download output. The former large report preview rows were removed because they duplicated the actual downloadable report and made the report page too heavy.
- Expanded fallback seed data so the MVP demo has visible issues across all four top-level categories.
- Added GitHub Pages demo build support and Pages preview/live Playwright smoke tests for the `/Issue-history-board/` base path.
- GitHub Actions workflow files are not committed on `main` yet because the current GitHub push token lacks `workflow` scope. Until that token is refreshed, deploy Pages from `gh-pages` and run the Pages verification commands manually.
- Added home dashboard, subtopic detail page, history list, issue-group view, detail panel, and add/edit drawer.
- Reworked the server login screen to follow the reusable `SSG87-pos/poslab-login-page` POSLAB entry format, with `로그인 / 회원가입` tabs and app-specific `PosLAB 이력관리 센터` title copy.
- Added signup persistence through FastAPI and surfaced submitted signup requests in the admin permission screen. Approval creates an active viewer account using the submitted email and password.
- Split representative states into `접수 / 진행 / 종료`.
- Reworked the design branch through several visual passes:
  - softer sidebar color
  - refined selected surfaces
  - mobile detail compaction
  - no visible `선택` label on selected cards
  - search labels simplified
  - status chips and timeline selection clarified
  - `향후 계획` label applied in detail view
  - `다음 확인일` detail block removed
  - add/edit drawer reorganized into cascading existing/new selection steps for mobile readability

## Changed Files

Primary source files for this design work:

- `src/App.tsx`
- `src/components/HomeDashboard.tsx`
- `src/components/SubtopicDetailPage.tsx`
- `src/components/HistoryList.tsx`
- `src/components/HistoryDetail.tsx`
- `src/components/AddHistoryPanel.tsx`
- `src/domain/types.ts`
- `src/domain/selectors.ts`
- `src/domain/seedData.ts`
- `src/domain/xlsxExchange.ts`
- `src/domain/xlsxExchange.test.ts`
- `src/domain/selectors.test.ts`
- `src/styles.css`
- `package.json`
- `vite.config.ts`

Continuity and decision files:

- `docs/current-ui-decisions.md`
- `docs/design-readability-refresh.md`
- `HANDOFF.md`
- `TODO.md`

## Remaining TODO

See `TODO.md`. The next useful work is visual QA in the browser, then any additional user comments should be applied without undoing the locked design decisions in `docs/current-ui-decisions.md`.

## Validation Status

Latest broad validation:

```bash
pnpm verify:static
pnpm verify:e2e
```

Expected result:

- unit tests pass
- production build passes
- backend security/API unittest passes
- local and server-mode Playwright tests pass
- deployment/env static checks pass

Latest focused admin/data connection validation:

```bash
pnpm test:e2e -- --grep "admin|report page filters" --project=chromium --project=mobile-chrome
pnpm test:e2e:server -- --grep "admin taxonomy and owner master edits|admin report shortcuts" --project=chromium
```

These checks cover admin module navigation, owner/master data propagation into home/detail/report surfaces, report downloads, mobile admin layout, and FastAPI server persistence after relogin.

Focused login and signup validation:

```bash
pnpm test:e2e:server -- --grep "login screen|access request" --project=chromium --project=mobile-chrome
```

This checks the POSLAB entry login panel across the priority viewports `1440x900`, `1024x768`, `768x1024`, `390x844`, and `360x740`; keeps the notebook-style two-column composition through tablet landscape; hides the lanyard below compact tablet mode; verifies the email field is focused; guards against oversized login cards and typography drift; and confirms a `회원가입` submitted from the login screen appears in admin permission management, can be approved, and can then log in with the submitted email and password.

Local Playwright scripts run through `scripts/run-playwright-with-ports.mjs`, which picks open loopback ports for Vite/FastAPI so parallel Codex threads do not reuse each other's `5173`, `5175`, or `8010` servers. The runner first tries OS-assigned ephemeral ports when the environment permits it, then scans a wider `42000-60999` loopback range. Override with `E2E_WEB_PORT`, `E2E_PAGES_PORT`, `E2E_SERVER_API_PORT`, or `E2E_SERVER_WEB_PORT` only when a fixed port is intentionally needed.

Pages preview validation:

```bash
pnpm test:e2e:pages
pnpm test:e2e:pages:live
```

The preview command builds with `vite --mode github-pages`, serves `dist`, and checks the `/Issue-history-board/` base path with fallback seed data. The live command checks the public GitHub Pages URL.

Live Pages check:

```text
https://ssg87-pos.github.io/Issue-history-board/ returns HTTP 200 and has been manually refreshed from the latest `main` build. Re-run `pnpm test:e2e:pages:live:current` after any new Pages deployment before treating the public demo as current.
```

After refreshing `gh-pages`, run:

```bash
pnpm test:e2e:pages:live:current
```

Known external validation gap:

```text
Docker CLI is not available on the current Mac environment. Run `./scripts/company-run.sh check`, `./scripts/company-run.sh up`, `./scripts/company-run.sh health`, and `pnpm check:deployment -- --with-docker` on a Docker host before company rollout.
```

## Risks and Notes

- `src/styles.css` contains several later override blocks. New CSS should usually be added near the latest override area instead of editing an early obsolete rule and expecting it to win.
- The user is sensitive to UI elements feeling like generic AI-generated dashboards. Avoid excessive gradients, bokeh/orbs, oversized empty spaces, hard blue outlines, and random emojis.
- Do not reintroduce the `다음 확인일` detail block unless the user explicitly asks for a redesigned schedule field.
- Do not rename `향후 계획` back to `남은 리스크` in visible UI. The underlying data field can remain `remainingRisk` for compatibility.
- Do not revert the add/edit drawer to a large card-list layout; it becomes too complex when issue/detail data grows.
- Keep the add drawer hierarchy explicit: `대분류 > 하위 주제 > 이슈 > 세부 항목`, with existing and new choices available at each step.
- Do not convert the sidebar back to a dark navigation panel.
- Do not replace Excel `.xlsx` exchange with CSV. CSV can break Korean text, line breaks, comma-containing content, and multiple attachment URLs.
- Do not reintroduce the old `권한 신청` tab, temporary-password signup copy, login description paragraph, department/emoji badge, or `이메일 또는 아이디` visible label on the login screen.
- Do not reintroduce the large report preview card/list on the report page unless the report workflow is redesigned around an explicit preview mode.

## Next Prompt

```text
AGENTS.md, DESIGN.md, HANDOFF.md, TODO.md, docs/current-ui-decisions.md, docs/design-readability-refresh.md에서 계속 진행에 필요한 부분만 확인하고 Issue board 작업을 이어서 진행해줘. DESIGN.md의 디자인 시스템 원칙과 docs/current-ui-decisions.md의 제품/UX 결정을 되돌리지 말아줘. 다음 작업은 TODO.md의 Now 항목부터 처리하고, 소스 변경 후 `pnpm build`와 `pnpm test`를 확인한 뒤 커밋/푸시해줘.
```
