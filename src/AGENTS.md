# AGENTS.md

Rules for `src/`. Use this together with the root `../AGENTS.md`.

## Module Context

`src/` contains the browser app: React screens, operational UI state, local/Pages fallback persistence, report generation, Excel exchange, and typed issue-board domain helpers.

## Commands

From the repository root:

```bash
pnpm test
pnpm build
pnpm test:e2e
pnpm test:e2e:pages
```

Focused unit tests:

```bash
pnpm exec vitest run src/components/HistoryList.test.tsx
pnpm exec vitest run src/domain/reportExports.test.ts
```

## Local Golden Rules

- Read `../DESIGN.md` before editing components or CSS.
- Read `../docs/current-ui-decisions.md` before changing status wording, admin modules, detail layout, add/edit flow, reports, or data management placement.
- Keep visible stage language as `접수 / 진행 / 종료`.
- Keep detail content order as `상세 내용 / 향후 계획 / 첨부 URL`.
- Do not make the app depend on seed data. `emptyBoardData` must remain a valid production start state.
- Keep demo/Pages fallback behavior available, but do not let fallback logic override server-mode data.
- Do not add new persisted fields without updating `types.ts`, normalization, server schema compatibility, tests, and any report/Excel mappings that consume the field.
- Do not add ad hoc string parsing where typed selectors, settings maps, or existing domain helpers can express the rule.

## UI Implementation Patterns

- Prefer existing component boundaries before introducing new abstractions.
- Use `lucide-react` icons for controls when an icon exists.
- Use tabs for mode changes, toggles for hide/show, compact inputs for editable names, and segmented controls for stage-like options.
- Keep admin pages compact and task-led. Avoid large stat cards above the real controls.
- Keep summary cards operational and filter-driven.
- On mobile, wrap cards and controls instead of requiring horizontal scroll.
- For history issue rows, responsible person/department should follow detail-level fallback before showing unknown labels.

## CSS Rules

- `src/styles.css` has later override blocks. Check existing selectors before adding new ones.
- Prefer existing CSS variables from `:root`.
- Avoid new dominant palettes. Keep the light operational tone.
- Keep text inside controls from wrapping awkwardly or overlapping.
- Verify responsive changes at narrow mobile and compact desktop widths.

## Testing Strategy

- For domain changes, add or update `src/domain/*.test.ts`.
- For component behavior, add or update nearby `src/components/*.test.tsx`.
- For user-flow or responsive behavior, prefer Playwright checks under `tests/` or browser verification.
- For reports and Excel, test generated content, not just button presence.

