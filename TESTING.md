# Testing

## Philosophy

Every layer of AnnData is tested at the level where a bug would actually be caught: pure business logic (net price, tolerance pricing, settlement splitting, the lot state machine) gets fast unit tests with no database; API behavior (RBAC, state transitions, the full transaction) gets integration tests against a real (in-memory SQLite) database through the real FastAPI app; the frontend gets component/integration tests with mocked network calls; and the full stack gets driven through an actual browser for the end-to-end demo transaction.

## Backend — pytest

```bash
cd backend
pytest                # full suite
pytest -v tests/test_full_demo_transaction.py   # a single file, verbose
pytest -k "settlement"                          # by keyword
coverage run -m pytest && coverage report        # coverage
```

103 tests across:

| File | Covers |
|---|---|
| `test_net_price_service.py` | Deduction math, ranking by net not gross, the worked spec example |
| `test_settlement_service.py` | Proportional splitting, rounding-drift correction, itemized-not-lump-sum |
| `test_tolerance_service.py` | Step-down pricing, contamination hold, out-of-range rejection |
| `test_lot_state_service.py` | The full lot status transition graph, including terminal/backward rejection |
| `test_screening_service.py` | Determinism, non-certification language, confidence bounds |
| `test_auth.py` | Valid/invalid login, token refresh, RBAC denial/allow |
| `test_farmers.py` | Onboarding, farmer data isolation (a farmer cannot see another farmer's data) |
| `test_lots.py` | Creation, contributor aggregation, invalid quantities/duplicates, state transitions, role-scoped visibility, closing a settled lot (and rejecting a premature/unauthorized close) |
| `test_quality_assessment.py` | Screening, finalized-assessment immutability, audited corrections |
| `test_offers.py` | Offer validation, verified-buyer gating, **net-not-gross ranking**, acceptance |
| `test_purchase_orders_and_payments.py` | PO creation/tolerance, payment state machine, over/duplicate-payment rejection, settlement generation |
| `test_disputes.py` | Full open → evidence → resolve flow, lot status restoration, settlement recomputation |
| `test_uploads.py` | Valid upload, invalid MIME, oversized file, missing-lot 404 |
| `test_rate_limit.py` | Throttling behavior, and the CORS-ordering regression (see below) |
| `test_full_demo_transaction.py` | The entire spec transaction, start to finish, through the real API |

### Fixtures

`tests/conftest.py` spins up a fresh in-memory SQLite database per test (via `StaticPool` so all connections share the same in-memory DB) and overrides FastAPI's `get_db` dependency. `seed_base` provides one FPO, one commodity, one storage facility, and one user+profile per role. bcrypt's cost factor is lowered to 4 rounds for the test session only (`pwd_context.update(bcrypt__rounds=4)` in conftest) — the default cost factor made the ~1,000 password hashes created across the suite take minutes; this has no effect on the runtime cost factor used outside the test process.

## Frontend — Vitest + React Testing Library

```bash
cd frontend
npm test              # watch mode
npm run test -- --run # single run (used in CI)
```

Covers: shared UI primitives (`Button`, `StatusBadge`), the 4-language `I18nContext`, and a full `LoginPage` integration test (mocked API) covering successful login, a failed-login error message, and the demo-account quick-fill.

## End-to-end — Playwright

```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

By default (outside CI) Playwright expects the backend (`:8000`) and frontend (`:5173`) dev servers to already be running — start them per the README first. In CI, `playwright.config.ts` starts both automatically with `ANNADATA_ENV=test` (which disables the rate limiter; see below).

| Spec | Covers |
|---|---|
| `landing-and-auth.spec.ts` | Landing page copy/claims, login success/failure, unauthenticated redirect, all six roles log in with **zero console errors** |
| `golden-path.spec.ts` | The entire demo transaction driven through the real UI: create a lot → collect → screen → assess (assayer) → open for offers → two competing offers → net-price comparison → accept → purchase order → assign transporter → transport to delivered → confirm delivery → pay → settle |

### Why the rate limiter is disabled for tests

`ANNADATA_ENV=test` turns off the in-memory rate limiter (`app/middleware/rate_limit.py`). An automated suite firing requests far faster than a human would otherwise trips the 120/min limit and produces flaky, hard-to-diagnose failures unrelated to the feature under test. The limiter's own behavior is still verified directly and in isolation by `test_rate_limit.py`.

## Manual verification performed during development

Beyond the automated suites, the running application was exercised directly in a real Chromium browser (via the E2E harness) to catch things static analysis can't: two real bugs were found and fixed this way — a CORS/middleware-ordering bug that made rate-limit rejections look like network failures, and a logout/login race that could send a user to a stale page after re-login. Both now have regression tests (`test_rate_limit.py::test_rate_limited_response_still_carries_cors_headers`, and the fixed `golden-path.spec.ts` flow itself, which logs out and back in as five different roles).

## Data integrity / edge cases covered

0 kg and negative quantities (rejected), duplicate farmer contributor in one lot (rejected), an offer submitted to a non-open lot (rejected), an unverified buyer submitting an offer (rejected), a payment larger than the amount due (rejected), a duplicate payment after completion (rejected), a duplicate settlement for the same lot (rejected), an invalid lot status transition (rejected with `INVALID_STATE_TRANSITION`), a buyer or FPO agent attempting to edit a finalized quality assessment (403), a farmer attempting to view another farmer's data (403), an invalid file MIME type and an oversized upload (both rejected).

## What isn't covered

- Load/performance testing.
- Cross-browser E2E (Chromium only, for time — Playwright's config makes adding Firefox/WebKit projects a one-line change).
- Visual regression testing.
