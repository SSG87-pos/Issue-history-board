# HANDOFF

## Scope

Issue board UI/UX design readability refresh.

Current branch: `codex/design-readability-refresh`
Remote: `origin` -> `https://github.com/SSG87-pos/Issue-history-board.git`

Use this file with `docs/current-ui-decisions.md` and `TODO.md` when continuing the project in a new chat.

## Current State

The `main` branch should remain the pre-design-change baseline. The active design work is on `codex/design-readability-refresh`.

The latest UI direction is a restrained, light internal operations dashboard:

- soft blue/mint sidebar, not dark navy
- subtle selection rings and light surfaces, not hard blue boxes
- no left selection rail for sidebar or selected content cards
- status colors remain consistent: received/orange, in-progress/blue, closed/green
- selected timeline rows use status-colored light backgrounds
- selected timeline dots and dates follow the row status color
- detailed entry body uses `향후 계획`, not `남은 리스크`
- the independent `다음 확인일` block is intentionally removed from the detail body

The most important source of truth for visual decisions is:

- `docs/current-ui-decisions.md`
- `docs/design-readability-refresh.md`

## Completed Work

- Created the main app flow for category, subtopic, issue group, detail issue, and dated history entries.
- Added local MVP persistence through browser storage and JSON import/export/reset controls.
- Added home dashboard, subtopic detail page, history list, issue-group view, detail panel, and add/edit drawer.
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
- `src/styles.css`

Continuity and decision files:

- `docs/current-ui-decisions.md`
- `docs/design-readability-refresh.md`
- `HANDOFF.md`
- `TODO.md`

## Remaining TODO

See `TODO.md`. The next useful work is visual QA in the browser, then any additional user comments should be applied without undoing the locked design decisions in `docs/current-ui-decisions.md`.

## Validation Status

Before this handoff update, the latest source changes passed:

```bash
pnpm build
pnpm test
```

Expected result:

- build passes
- 2 test files pass
- 9 tests pass

After documentation-only edits, run the same commands again before committing if source files change.

## Risks and Notes

- `src/styles.css` contains several later override blocks. New CSS should usually be added near the latest override area instead of editing an early obsolete rule and expecting it to win.
- The user is sensitive to UI elements feeling like generic AI-generated dashboards. Avoid excessive gradients, bokeh/orbs, oversized empty spaces, hard blue outlines, and random emojis.
- Do not reintroduce the `다음 확인일` detail block unless the user explicitly asks for a redesigned schedule field.
- Do not rename `향후 계획` back to `남은 리스크` in visible UI. The underlying data field can remain `remainingRisk` for compatibility.
- Do not convert the sidebar back to a dark navigation panel.

## Next Prompt

```text
AGENTS.md, HANDOFF.md, TODO.md, docs/current-ui-decisions.md, docs/design-readability-refresh.md에서 계속 진행에 필요한 부분만 확인하고 Issue board의 `codex/design-readability-refresh` 브랜치 작업을 이어서 진행해줘. main은 디자인 변경 전 기준으로 유지하고, 현재 디자인 브랜치에서는 `docs/design-readability-refresh.md`의 선택 상태/사이드바/상세 패널 원칙을 되돌리지 말아줘. 다음 작업은 TODO.md의 Now 항목부터 처리하고, 소스 변경 후 `pnpm build`와 `pnpm test`를 확인한 뒤 커밋/푸시해줘.
```
