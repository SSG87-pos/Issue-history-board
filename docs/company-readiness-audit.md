# Company Readiness Audit

Date: 2026-06-28
Branch: `main`
Verified code baseline: `bca8a04 test: align server readiness checks`

## Verdict

The application is ready for a company Docker host validation pass. Local code, backend API, frontend build, static deployment checks, and FastAPI/Vite server-mode browser flows passed on `main`.

The only unproven gate is Docker Compose execution on a host that has Docker installed. This Mac environment does not have the Docker CLI, so container build/start/health cannot be proven here.

## Evidence Already Proven

- `pnpm verify:static`
  - `scripts/company-run.sh` shell syntax passed.
  - Deployment readiness static checks passed.
  - `.env.example` validation passed with placeholders allowed.
  - Backend unittest suite passed: 6 tests.
  - Frontend Vitest suite passed: 13 files, 53 tests.
  - TypeScript check and production Vite build passed.
- `pnpm test:e2e:server`
  - FastAPI and Vite started together on local loopback ports.
  - Desktop and mobile browser flows passed: 25 passed, 1 skipped.
  - Covered login, signup approval, role-based menu visibility, admin permissions, taxonomy persistence, option persistence, report shortcuts/downloads, important marker persistence, and mobile permission handling.
- `git push origin HEAD:main`
  - `origin/main` was updated to the verified code baseline.

## Company Host Final Gate

Run these on the Ubuntu/Docker server after copying `.env.example` to `.env` and replacing all placeholder secrets:

```bash
./scripts/company-run.sh env-check
./scripts/company-run.sh check
./scripts/company-run.sh up
./scripts/company-run.sh health
```

Optional developer/CI validation on a Docker host:

```bash
pnpm check:deployment -- --with-docker
```

Expected result:

- `env-check` accepts real secrets, `WEB_PORT`, and `CORS_ORIGINS`.
- `check` validates Docker availability and `docker compose config`.
- `up` builds and starts `postgres`, `api`, and `web`.
- `health` confirms `http://127.0.0.1:<WEB_PORT>/health`.

## Notes

- `scripts/company-run.sh` does not require Node or pnpm for company operation. It uses shell, Docker Compose, and curl or wget for health checks.
- GitHub Actions workflow files are not on `main` yet because the current GitHub push token lacks `workflow` scope. This does not block Docker-based company operation. Add the workflow files later after refreshing the token scope.
- GitHub Pages demo publishing currently uses the `gh-pages` branch path. Actions-based Pages deployment can be enabled later with the workflow files.
