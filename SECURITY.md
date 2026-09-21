# Security

This document describes AnnData's security posture for the pilot/demo deployment and calls out what is explicitly out of scope for the MVP.

## Authentication

- Passwords are hashed with bcrypt (via `passlib`) — never stored or logged in plaintext.
- Authentication uses short-lived JWT access tokens (default 60 minutes) plus longer-lived refresh tokens (default 7 days), both HMAC-signed (`HS256`) with `JWT_SECRET_KEY`.
- `JWT_SECRET_KEY` defaults to a clearly-marked development value in `.env.example`. **This must be overridden with a strong, random secret before any real deployment.**
- Refresh tokens are stored in the browser's `localStorage` in this MVP for simplicity. A production deployment should move to an httpOnly, `Secure`, `SameSite=Strict` cookie to reduce XSS exposure — documented here as a known limitation, not implemented, given the scope of this build.

## Authorization (RBAC)

- Every sensitive endpoint enforces role checks server-side via FastAPI dependencies (`require_roles(...)` in `app/middleware/deps.py`) — the frontend hiding a button is a UX convenience only, never the actual control.
- Object-level authorization is enforced in addition to role checks: e.g. a farmer can only view their own profile/lots/settlement; a buyer can only act on their own offers/payments; an FPO agent is scoped to their own FPO.
- A finalized quality assessment cannot be edited by buyers or FPO agents — only an assayer or admin can issue a correction, and every correction writes an audit log entry with before/after values.

## Input validation

- All request bodies are validated with Pydantic schemas (`app/schemas/`), including field-level constraints (positive quantities, valid enums, etc.).
- Duplicate farmer contributors, empty contributor lists, and non-positive quantities are rejected at the schema level before touching the database.

## File uploads

- Uploads are restricted to an explicit MIME type allowlist (JPEG, PNG, WebP, PDF) and a configurable maximum size (`MAX_UPLOAD_SIZE_MB`, default 5MB), enforced in `app/services/file_storage.py`.
- Uploaded files are renamed to a random UUID-based filename on disk — the original filename is never used as a path component, eliminating path traversal risk.
- Files are stored outside the application's importable code path and served read-only via a dedicated static mount (`/uploads`).

## SQL injection

- All database access goes through SQLAlchemy's ORM/query builder with parameter binding. No raw string-interpolated SQL exists anywhere in the codebase.

## CORS

- CORS is restricted to an explicit allowlist (`CORS_ORIGINS`, defaulting to the local Vite dev server) rather than a wildcard.
- **Middleware ordering matters and was a real bug caught during development**: `CORSMiddleware` must be the *outermost* middleware (added last, since Starlette applies the last-added middleware first) so that even a short-circuited response from an inner middleware — like the rate limiter's 429 — still carries CORS headers. Getting this backwards causes the browser to report a legitimate 429 as an opaque "Network Error" instead of surfacing it. A regression test (`tests/test_rate_limit.py::test_rate_limited_response_still_carries_cors_headers`) guards this.

## Rate limiting

- A minimal in-memory, per-IP fixed-window rate limiter (`app/middleware/rate_limit.py`) is applied to the whole API, default 120 requests/minute. It is deliberately simple (not distributed) — sufficient to demonstrate the control for a single-process demo deployment, not a production-grade solution.
- Disabled automatically when `ANNADATA_ENV=test` so automated test suites aren't throttled by their own request volume.

## Audit logging

- `AuditLog` is append-only: no API endpoint anywhere supports updating or deleting an audit entry. Entries are written exclusively by `app/services/audit.py`, always inside the same transaction as the mutation they describe.
- Every important mutation (lot creation/transitions, quality assessment finalization/correction, offers, purchase orders, shipments, payments, settlements, disputes, user/buyer status changes) writes an audit entry recording actor, role, action, entity, before/after values and a timestamp.

## Consent

- `ConsentRecord` exists in the schema to record consent (e.g. for photo/data collection) per user and version. The MVP wires the model and storage; a full consent-capture UI flow is not implemented and is listed under Known Limitations in the main README.

## Secrets

- No secrets are committed to the repository. `.env` is gitignored; `.env.example` documents every variable with safe, non-secret defaults.
- Demo account passwords (`Demo@123`) are intentionally weak and clearly documented as demo-only — never use them, or the default `JWT_SECRET_KEY`, outside a local demo.

## Known limitations (explicitly out of scope for this MVP)

- No CSRF token scheme — mitigated in the current design by using a bearer token (not a cookie) for authenticated requests, which is inherently not subject to classic CSRF. This assumption breaks if refresh tokens are later moved to a cookie, at which point CSRF protection would need to be added.
- No email verification / password reset flow.
- No account lockout after repeated failed logins (rate limiting provides partial mitigation).
- The WebSocket notification channel authenticates via a query-string JWT (`/api/notifications/ws?token=...`), which can appear in server access logs. Acceptable for a local demo; a production deployment should prefer a short-lived, single-use ticket instead.
