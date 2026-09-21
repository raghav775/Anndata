# Deployment

## Local demo (the supported, verified path)

Everything in this project runs locally with zero paid services. See the README's "Local installation" for the full step-by-step. Summary:

```bash
# Backend — http://localhost:8000
cd backend && python -m venv venv && ./venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload

# Frontend — http://localhost:5173
cd frontend && npm install && npm run dev
```

## Configuration

All configuration is environment-variable driven (see `.env.example` at the repo root). The application starts and runs the full demo with **zero** variables set — every default is safe for local use. Copy `.env.example` to `backend/.env` (and `frontend/.env` for `VITE_*` overrides) only if you need to change a default.

## Database

SQLite is the default and requires no setup. To move to PostgreSQL:

1. Run a Postgres instance (locally, in a container, or a managed service).
2. Set `DATABASE_URL=postgresql+psycopg2://user:password@host:5432/annadata` in `backend/.env`.
3. Install a Postgres driver: `pip install psycopg2-binary` (not included by default, to keep the zero-cost SQLite path dependency-free).
4. Run `alembic upgrade head` against the new database.

No model or query changes are required — the SQLAlchemy layer is database-agnostic.

## File storage

Uploads are written to `backend/uploads/` (configurable via `LOCAL_STORAGE_PATH`) and served from `/uploads`. `app/services/file_storage.py` defines a `FileStorage` interface with one implementation (`LocalFileStorage`); swapping in an S3-compatible backend later means adding a second implementation and branching in `get_storage()` — no caller code changes. **Not implemented in this build** — see Known Limitations.

## Running the backend in production-like mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Before doing this for anything beyond a local demo:

- Set a strong, random `JWT_SECRET_KEY` (never the development default).
- Set `CORS_ORIGINS` to your actual frontend origin(s) — never `*`.
- Set `ANNADATA_ENV=production` (disables nothing functionally today, but keep it accurate — `test` specifically disables the rate limiter, and you do not want that in production).
- Point `DATABASE_URL` at Postgres, not SQLite (SQLite's single-writer model doesn't suit concurrent multi-worker production traffic).
- Put a reverse proxy (nginx, Caddy) in front for TLS termination.
- Because `RateLimitMiddleware` keeps state in-process, running multiple workers/instances means each has its own independent rate-limit counter — acceptable for a demo, not for a real multi-instance deployment (would need a shared store like Redis).

## Building the frontend for static hosting

```bash
cd frontend
npm run build        # outputs to frontend/dist/
```

`dist/` is a static bundle — deployable to any static host (Netlify, Vercel, S3+CloudFront, nginx) as long as `VITE_API_BASE_URL` at build time points to your backend's public URL.

## Docker

Not included in this build. Given the zero-dependency nature of the stack (SQLite file + a single Python process + a static frontend bundle), a `Dockerfile` per service would be a mechanical addition (`python:3.11-slim` + `pip install` + `uvicorn` for the backend; a multi-stage `node:20` build + `nginx` static serve for the frontend) rather than an architectural one — left out here to keep the delivered scope honest about what was actually built and tested versus what would be a reasonable follow-up.

## CI/CD

GitHub Actions workflows exist for backend tests, frontend build/tests, and the Playwright E2E suite (`.github/workflows/`). None of them deploy anywhere — they gate merges to `main` on tests passing. Wiring an actual deploy step (e.g. to a PaaS) is out of scope for this build; the workflows are structured so adding one is a matter of appending a `deploy` job that depends on the existing `test`/`build` jobs.
