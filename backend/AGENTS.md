# AGENTS.md

Rules for `backend/`. Use this together with the root `../AGENTS.md`.

## Module Context

`backend/` contains the FastAPI server for auth, role-based access, signup approval, and persisted board snapshots.

## Commands

From the repository root:

```bash
pnpm test:backend
pnpm check:deployment
pnpm verify:static
```

Direct backend test command:

```bash
.venv/bin/python -m unittest backend.tests.test_security backend.tests.test_api
```

## Tech Stack and Constraints

- FastAPI handles HTTP routing and dependency-based auth.
- SQLAlchemy models define persisted users, access requests, and board snapshots.
- Pydantic schemas define API request and response shapes.
- Passwords must always be hashed through `security.py`.
- JWT handling must use the existing helper functions in `security.py`.

## Local Golden Rules

- Do not bypass `require_user`, `require_editor`, or `require_admin` for protected endpoints.
- Do not allow the final active admin to be disabled or demoted.
- Do not store plain-text passwords, signup passwords, or tokens.
- Do not change API field names without updating frontend `src/domain/serverApi.ts`, schemas, tests, and deployment checks.
- Keep `/health` unauthenticated and lightweight.
- Keep CORS origins environment-driven through config, not hardcoded for production.
- Preserve compatibility with the board snapshot shape used by the frontend domain model.

## Implementation Patterns

- Add new request/response fields in `schemas.py` first, then wire endpoint logic in `main.py`.
- Add new persisted columns in `models.py` with a clear migration or initialization strategy before relying on them.
- Keep role checks at endpoint boundary through FastAPI dependencies.
- Keep signup approval behavior consistent: approved signup creates an active viewer unless a later product decision changes the default role.

## Testing Strategy

- Add API behavior tests in `backend/tests/test_api.py`.
- Add password/token/security tests in `backend/tests/test_security.py`.
- Test both success and permission-denied paths for admin/editor-only behavior.
- For persistence shape changes, verify frontend server-mode flows as well as backend unit tests.

