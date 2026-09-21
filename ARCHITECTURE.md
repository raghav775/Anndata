# Architecture

## Overview

AnnData is a conventional three-tier web application: a React SPA, a FastAPI REST API, and a SQLite database (portable to PostgreSQL). There is no separate microservice layer — the domain is small enough that a modular monolith is the right call for this pilot, and it keeps the whole system runnable with zero infrastructure.

```
┌─────────────────────┐        HTTPS / WSS        ┌──────────────────────────┐
│   React SPA (Vite)   │ ─────────────────────────▶ │      FastAPI backend     │
│  - React Router      │ ◀───────────────────────── │  - JWT auth + RBAC       │
│  - TanStack Query    │        REST + WS            │  - Pydantic validation   │
│  - Tailwind CSS       │                             │  - SQLAlchemy ORM        │
└──────────┬───────────┘                             └────────────┬─────────────┘
           │                                                       │
           │ local filesystem (dev uploads)                        │ SQLAlchemy
           ▼                                                       ▼
   backend/uploads/                                        SQLite (annadata.db)
                                                       (swap DATABASE_URL for
                                                        PostgreSQL — no code
                                                        changes needed)
```

## Backend structure

```
backend/app/
├── api/          REST routers, one file per resource (lots, offers, disputes, ...)
├── core/         config, database session, JWT/password helpers, error format
├── middleware/   RBAC dependency, IP-based rate limiter
├── models/       SQLAlchemy ORM models, grouped by domain area
├── schemas/      Pydantic request/response schemas, mirroring models
├── services/     business logic that isn't a thin CRUD wrapper:
│                   net_price.py     — the net realizable price engine
│                   tolerance.py     — tolerance-band step-down pricing
│                   settlement.py    — per-farmer settlement splitting
│                   lot_state.py     — the lot status state machine
│                   screening.py     — deterministic local "AI" preflight screen
│                   iot_simulator.py — simulated sensor reading generator
│                   audit.py         — the one place AuditLog rows get written
│                   file_storage.py  — upload validation + storage abstraction
│                   ws_manager.py    — in-process WebSocket connection registry
│                   background.py    — the periodic IoT simulation loop
└── main.py       FastAPI app wiring: middleware order, routers, lifespan
```

**Why no separate repository layer?** The task list called for one; given the time budget for this build, routers query SQLAlchemy directly rather than through a repository abstraction. Business logic that's more than a query — pricing, tolerance, settlement math, state transitions — is factored into `services/` and is pure/unit-testable independent of the database. This is a conscious simplification: adding a repository layer later is a mechanical refactor, not a design change, since routers never construct raw SQL.

## Request lifecycle

1. `main.py` wires middleware in a specific, load-bearing order: the rate limiter is added first (innermost), CORS last (outermost). CORS must wrap every response, including one an inner middleware short-circuits (e.g. a 429) — otherwise the browser reports a legitimate rejection as an opaque network error. See `SECURITY.md` for the story behind this.
2. Every authenticated route depends on `get_current_user` (decodes and validates the JWT, loads the `User` row) and, where relevant, `require_roles(...)` (rejects the wrong role with 403).
3. Object-level checks happen inside the route function itself (e.g. "is this farmer viewing their own record") — role checks alone are necessary but not sufficient.
4. Mutating routes call `record_audit(...)` in the same DB transaction as the mutation, then `db.commit()` once at the end — so an audit entry and its mutation are always atomic.

## The lot state machine

`Lot.status` moves through a fixed, explicit graph (`services/lot_state.py`): `DRAFT → COLLECTED → UNDER_ASSESSMENT → ASSESSED → OPEN_FOR_OFFERS → OFFER_ACCEPTED → PURCHASE_ORDER_CREATED → DISPATCHED → DELIVERED → SETTLED → CLOSED`, with `DISPUTED` reachable from several post-PO states and returning to whichever state preceded it (`Lot.pre_dispute_status`) once the dispute resolves. Every transition is checked against an explicit allow-list; an invalid transition raises a typed `InvalidStateTransitionError` mapped to HTTP 409.

## The net realizable price engine

`services/net_price.py` is the mechanism behind the platform's core transparency promise. A buyer offer carries a gross price plus five itemized deduction fields (transport, loading/unloading, grading, storage, platform fee) plus a free-form list of other disclosed deductions. `rank_offers_by_net_realization` always sorts by **net** price per kg, never gross, and `build_comparison_explanation` produces the human-readable sentence the UI shows explaining *why* a lower-gross offer can still be the better one. This logic is pure and has no database dependency, so it's covered by fast unit tests independent of the API layer.

## Frontend structure

```
frontend/src/
├── components/
│   ├── ui/           Button, Card, Badge/StatusBadge, loading/empty/error states
│   ├── layout/        AppShell (role-aware nav), ProtectedRoute
│   ├── notifications/  polling notification bell
│   └── storage/       IoT mini line chart
├── context/           Auth, Toast, I18n (English/Hindi/Marathi/Gujarati) providers
├── hooks/api.ts        one TanStack Query hook per backend resource
├── lib/                axios client with refresh-token interceptor, nav config
├── pages/              one file per route; dashboards/ has one per role
└── types/index.ts      TypeScript types mirroring the backend Pydantic schemas
```

The frontend never encodes business rules that the backend already enforces (e.g. it does not re-implement the lot state machine) — it renders whatever the API returns and lets the API be the single source of truth for what's allowed next. This is deliberate: a UI-only restriction is a suggestion, not a control.

## Real-time channels

- **IoT storage simulation** (`/api/storage/ws/{facility_id}`): a genuine background asyncio task (`services/background.py`) generates one reading per facility every 8 seconds, persists it, and broadcasts it over WebSocket to any connected client. This is real-time end to end.
- **Notifications** (`/api/notifications/ws?token=...`): the WebSocket authenticates the caller's own JWT and pushes to their private channel, but most routes that call `create_notification(...)` run as synchronous FastAPI handlers and don't currently push over the socket in the same call — the notification is written to the database immediately and picked up by the frontend's 15-second poll. Documented as a known limitation rather than silently only-sometimes-working: wiring a sync-to-async dispatch bridge (e.g. `anyio.from_thread.run`) would make it fully real-time and is a reasonable next step.

## Deployment portability

- **Database**: SQLite by default; the SQLAlchemy layer uses no SQLite-specific features, so changing `DATABASE_URL` to a `postgresql+psycopg2://` DSN and re-running Alembic migrations is the entire migration path.
- **File storage**: `services/file_storage.py` defines a `FileStorage` abstract base with one concrete `LocalFileStorage` implementation. `STORAGE_BACKEND=s3` is documented in `.env.example` as a future option but intentionally not implemented, to avoid a false claim of S3 support that isn't real.
- **AI screening**: `services/screening.py` is 100% local and deterministic — no external API call, no API key. This is a design requirement (zero mandatory paid services), not a placeholder for a real model.
