# AGENTS.md

This file is the entry contract for AI agents working in this repository. Keep it concise and update it when project rules drift.

## Operational Commands

Use `pnpm` for frontend and repository-level scripts.

```bash
pnpm dev
pnpm build
pnpm build:pages
pnpm test
pnpm test:backend
pnpm verify:static
pnpm verify:all
```

Useful focused checks:

```bash
pnpm check:shell
pnpm check:deployment
pnpm check:env:example
pnpm test:e2e
pnpm test:e2e:pages
pnpm test:e2e:pages:live:current
pnpm test:e2e:server
```

On this machine, if `node` or `pnpm` is missing from `PATH`, prepend the bundled runtime:

```bash
PATH="/Users/seulgi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/seulgi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm test
```

Company server flow:

```bash
cp .env.example .env
./scripts/company-run.sh check
./scripts/company-run.sh up
./scripts/company-run.sh health
```

## Project Context

PosLAB Issue History Board is an internal research-history tool for recording, reviewing, filtering, and reporting issue history.

Tech stack:

- React, TypeScript, Vite, Vitest, Playwright
- FastAPI, SQLAlchemy, PostgreSQL
- Docker Compose for company server operation
- GitHub Pages for static demo deployment

## Golden Rules

- Read `DESIGN.md` before changing UI, layout, responsive behavior, copy tone, or visual style.
- Read `docs/current-ui-decisions.md` before changing product flow, status language, history/detail behavior, admin modules, or report UX.
- Preserve visible status language: `접수 / 진행 / 종료`.
- Preserve status colors: 접수 orange, 진행 blue, 종료 green.
- Do not reintroduce large empty metric cards, hard blue filled selection states, decorative blobs/orbs, or marketing-style hero layouts.
- Do not rename visible `향후 계획` back to `남은 리스크`; the stored field may remain `remainingRisk`.
- Do not reintroduce a standalone `다음 확인일` detail block without a new product decision.
- Production data must be able to start from an empty board; demo seed data must not be required for layout integrity.
- JSON remains the full backup/restore path. Excel `.xlsx` is an operational table-review helper. Do not replace `.xlsx` exchange with CSV.
- Do not hardcode secrets, credentials, tokens, or production URLs.
- Do not stage unrelated untracked files. Inspect `.github/` before including it; it may be intentionally left out of an app-only commit.

## Git Rules

- Default working branch for active UI work has been `codex/design-readability-refresh`.
- Keep commits focused by concern: app changes, deployment artifacts, and docs should not be mixed unless the user asks for a combined checkpoint.
- Before commit, run checks proportional to risk. For UI/code changes, at minimum run:

```bash
pnpm build
pnpm test
```

- For design/responsive changes, also verify the affected screen in a browser.
- For Pages deployment, build with `pnpm build:pages`, then confirm the live HTML references the new asset hash.

## Documentation Order

When resuming work, read only what is relevant:

1. `AGENTS.md`
2. `DESIGN.md` for design guardrails
3. `docs/current-ui-decisions.md` for current UX/product decisions
4. `HANDOFF.md` and `TODO.md` for continuation state
5. The specific source files you will edit

Do not infer current rules from older mockup files or screenshots when `DESIGN.md` and `docs/current-ui-decisions.md` already settle the decision.

## Context Map

- **[Frontend UI and domain state](./src/AGENTS.md)** — React components, CSS, persistence, seed/empty data, reports, Excel, and browser-facing behavior.
- **[Backend API and auth](./backend/AGENTS.md)** — FastAPI endpoints, SQLAlchemy models, auth, role checks, and backend tests.

## Maintenance Policy

If code and these rules diverge, do not silently follow stale rules. Update the relevant `AGENTS.md` or propose the smallest correction before continuing.

