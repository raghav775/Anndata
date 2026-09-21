# Contributing

## Local setup

See the README's "Local installation" section for the full setup. In short:

```bash
# Backend
cd backend
python -m venv venv
./venv/Scripts/activate   # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# E2E (optional)
cd e2e
npm install
npx playwright install chromium
npm test
```

## Branching

- `main` is always deployable.
- Feature work happens on `feature/<area>` branches (e.g. `feature/disputes`), merged back into `main` once tests pass.

## Before opening a PR

1. Backend: `ruff check app scripts tests`, `ruff format --check app scripts tests`, `pytest`.
2. Frontend: `npm run lint`, `npm run build` (runs `tsc` + Vite build), `npm run test -- --run`.
3. If you touched a user-facing flow, run the relevant E2E spec locally (`cd e2e && npm test`).

## Commit style

Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`), imperative mood, scoped to one logical change. Prefer several small, buildable commits over one large one.

## Code style

- **Backend**: type-hinted Python, Pydantic schemas for every request/response, business logic that's more than a query goes in `app/services/`, not the router. Every state-changing endpoint writes an audit log entry in the same transaction as the mutation.
- **Frontend**: function components + hooks, one TanStack Query hook per backend resource in `src/hooks/api.ts`, shared UI primitives in `src/components/ui/`. Don't re-implement backend business rules (e.g. workflow validity) in the frontend — render what the API returns and let the API be the source of truth.

## Adding a new workflow action

1. Add/extend the Pydantic schema in `backend/app/schemas/`.
2. Implement the endpoint in the relevant `backend/app/api/*.py` router, enforcing both role (`require_roles`) and object-level access checks.
3. If it mutates state, call `record_audit(...)` before `db.commit()`.
4. Add a pytest covering the happy path, an RBAC-denied path, and at least one edge case (invalid state, missing data, etc.).
5. Add the corresponding TanStack Query hook in `frontend/src/hooks/api.ts` and wire it into the relevant page/component.
6. If it's part of the core demo transaction, extend `e2e/tests/golden-path.spec.ts`.

## Reporting issues

Open a GitHub issue describing the expected vs. actual behavior, the role/account you were using, and steps to reproduce.
