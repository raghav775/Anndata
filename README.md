# AnnData

**FPO-assisted transparent agricultural market and settlement platform.**

> Smart India Hackathon 2026 — Problem Statement 26132 (Agriculture / FoodTech / Rural Development)
> Pilot: **onion**, Niphad–Lasalgaon cluster, Nashik, Maharashtra.

AnnData helps small onion farmers aggregate produce through their FPO (Farmer Producer Organization) / collection centre, connect verified lots with verified buyers, compare **net realizable price** rather than gross price, record quality and logistics evidence, resolve rejections through configurable tolerance bands, coordinate transport and storage, and give every farmer an itemized, traceable settlement.

**AnnData does not** guarantee prices, eliminate every intermediary, provide AI-certified grading, certify shelf life, guarantee buyer payment, offer farmer loans, or own any transport/storage infrastructure. It provides **transparency, traceability and accountability** around a transaction that people — FPO agents, assayers, buyers, transporters — still carry out.

---

## Live demo

**[annadata-onion-pilot.vercel.app](https://annadata-onion-pilot.vercel.app)** · API: [annadata-onion-pilot-api.onrender.com](https://annadata-onion-pilot-api.onrender.com/api/health)

The backend is a free-tier instance that spins down after 15 minutes idle and reseeds fresh demo data on its next request. The frontend handles that transparently — it retries automatically through a cold start with a "waking up" notice, rather than showing an error — so no action is needed if a page seems to hang briefly on first load. See [Demo accounts](#demo-accounts) below, or [`DEPLOYMENT.md`](DEPLOYMENT.md) for how this is deployed and handled.

---

## Table of contents

- [Live demo](#live-demo)
- [Problem & solution](#problem--solution)
- [Core workflow](#core-workflow)
- [Demo transaction](#demo-transaction)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Roles & permissions](#roles--permissions)
- [Feature list](#feature-list)
- [Net realizable price](#net-realizable-price)
- [Local installation](#local-installation)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Demo accounts](#demo-accounts)
- [Synthetic demo data disclaimer](#synthetic-demo-data-disclaimer)
- [Known limitations](#known-limitations)
- [Future roadmap](#future-roadmap)
- [Documentation index](#documentation-index)
- [License](#license)

## Problem & solution

Small onion farmers around Niphad–Lasalgaon often sell through layers of intermediaries with little visibility into how their final price was actually calculated, whether a rejected lot was fairly assessed, or when payment will arrive. AnnData doesn't remove the FPO or the buyer relationship — it makes the transaction between them auditable: every deduction disclosed before an offer is accepted, every quality call backed by a physical assessment and an audit trail, every settlement itemized per farmer, every dispute resolved against retained evidence.

## Core workflow

**Aggregate → Verify → Compare → Transport → Settle → Trace**

1. FPO agent onboards farmers and aggregates their produce into one traceable lot.
2. A deterministic, local, non-authoritative AI pre-screen flags a likely grade.
3. An assayer performs the physical assessment — the authoritative quality record.
4. Verified buyers submit offers; AnnData ranks them by **net realizable price**, not gross price.
5. The FPO accepts the best-net offer; a purchase order freezes price, quality tolerance and terms.
6. A transporter is assigned and tracked to delivery; storage can be booked and monitored (simulated IoT).
7. The buyer confirms delivery (tolerance-band pricing applies if the delivered grade differs) and pays (mock).
8. The FPO settles — every contributing farmer sees an itemized payout.
9. Any dispute is resolved against retained lot/quality/delivery/evidence records, with audit-logged decisions.

Full detail: [`docs/workflow.md`](docs/workflow.md).

## Demo transaction

The seeded demo's flagship lot (`LOT-2026-0001`) carries a **2,000kg onion lot** through the entire workflow:

```
Kavita Shinde (420kg) + Ganesh Patil (680kg) + Rajendra Jadhav (900kg) = 2,000kg lot
  → preliminary screening → physical assessment (Grade B)
  → two buyer offers:
        Buyer A — ₹30.00/kg gross, ₹4.00/kg deductions → ₹26.00/kg net
        Buyer B — ₹29.00/kg gross, ₹1.50/kg deductions → ₹27.50/kg net  ✅ accepted
  → purchase order → transport → storage → delivery
  → payment → itemized settlement per farmer
  → a dispute raised and resolved with a partial financial adjustment
```

That's one lot out of **16** seeded across two FPOs (Niphad and Yeola talukas, Nashik district). The rest deliberately span every remaining status and edge case — `DRAFT`, `COLLECTED`, `UNDER_ASSESSMENT`, `ASSESSED`, `OPEN_FOR_OFFERS` (with 2–3 competing offers each), `OFFER_ACCEPTED`, `PURCHASE_ORDER_CREATED`, `DISPATCHED` (including a storage `WARNING`/`ALERT` sensor sequence), `DELIVERED` with a partially-paid balance, two more `SETTLED` multi-farmer lots, a fresh **unresolved** `DISPUTED` lot (distinct from the flagship's already-resolved one), and a `CLOSED` lot priced down through the Grade C tolerance step — so every dashboard, list, and chart has substantial, realistic data rather than one example. Prices, villages, varieties and grading bands are grounded in public reference data researched for this pilot; see [`research/`](research/).

All farmers, buyers, and organizations in the demo are **synthetic** — see [Synthetic demo data disclaimer](#synthetic-demo-data-disclaimer). You can watch the flagship sequence play out by logging in as each demo account and following [`docs/workflow.md`](docs/workflow.md), browse the other 15 lots for every other state, or drive a **brand-new** lot through the same sequence yourself from the FPO dashboard.

## Architecture

```
┌─────────────────────┐        HTTPS / WSS        ┌──────────────────────────┐
│   React SPA (Vite)   │ ─────────────────────────▶ │      FastAPI backend     │
│  Router · Query ·     │ ◀───────────────────────── │  JWT auth + RBAC ·       │
│  Tailwind CSS         │        REST + WS            │  SQLAlchemy · Pydantic   │
└──────────┬───────────┘                             └────────────┬─────────────┘
           │                                                       │
           ▼                                                       ▼
   local uploads/                                          SQLite (annadata.db)
                                                    (Postgres-portable — see DATABASE.md)
```

Full detail, including why CORS middleware ordering matters and how the net-price engine is structured: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Tech stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, Recharts, Axios.
**Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, JWT (`python-jose`), bcrypt (`passlib`).
**Database:** SQLite by default; PostgreSQL-portable with a `DATABASE_URL` change (no code changes).
**Testing:** pytest (103 backend tests), Vitest + React Testing Library (14 frontend tests), Playwright (E2E).
**Zero paid dependencies:** no external AI API, no payment gateway, no paid map provider, no paid auth provider — see [Environment variables](#environment-variables).

## Repository structure

```
annadata/
├── backend/            FastAPI app, Alembic migrations, pytest suite, seed scripts
│   └── app/
│       ├── api/          REST routers (one per resource)
│       ├── core/          config, DB session, JWT/password helpers, error format
│       ├── middleware/    RBAC dependency, rate limiter
│       ├── models/        SQLAlchemy models
│       ├── schemas/       Pydantic request/response schemas
│       └── services/      net-price engine, tolerance pricing, settlement math,
│                           lot state machine, screening, IoT simulator, audit log
├── frontend/           React + Vite + TypeScript + Tailwind app, Vitest tests
├── e2e/                Playwright end-to-end tests
├── docs/               workflow, roles, net-realizable-price, quality-and-rejection,
│                        payment-and-settlement, dispute-management, audit-log
├── scripts/            (see backend/scripts/ — seed.py, reset_demo.py)
├── .github/workflows/  CI: backend, frontend, e2e
├── .env.example
├── ARCHITECTURE.md · API.md · DATABASE.md · SECURITY.md · TESTING.md
├── DEPLOYMENT.md · CONTRIBUTING.md · CHANGELOG.md
└── README.md (this file)
```

## Roles & permissions

| Role | Can do |
|---|---|
| **Farmer** | View own profile, produce, lots, offers relevant to their produce, itemized settlement, dispute status |
| **FPO Agent** | Onboard farmers, aggregate lots, manage collection/screening, compare offers, accept, issue purchase orders, coordinate transport/storage, initiate settlement |
| **Buyer** | Browse eligible lots, submit offers, confirm delivery, pay, raise disputes |
| **Assayer** | Perform the authoritative physical quality assessment, upload evidence |
| **Transporter** | View assigned shipments, update pickup/delivery status |
| **Admin** | Manage users & buyer verification, view audit log, platform analytics |

Enforced server-side on every endpoint, not just hidden in the UI — see [`docs/roles.md`](docs/roles.md) and [`SECURITY.md`](SECURITY.md).

## Feature list

Landing page · JWT auth with refresh · role-based dashboards (×6) · multilingual UI (English/Hindi/Marathi/Gujarati) · farmer onboarding · lot aggregation with a full state machine · local deterministic preliminary AI screening · authoritative physical quality assessment with audited corrections · verified-buyer marketplace · **net realizable price engine** · printable purchase orders with tolerance-band step-down pricing · logistics/shipment tracking · storage booking + simulated live IoT monitoring (WebSocket) · mock payment tracking · itemized per-farmer settlements · dispute management with evidence and financial-adjustment resolution · append-only audit log · in-app notifications · platform analytics.

## Net realizable price

The core transparency mechanism. Offers are **never** ranked by gross price:

| | Buyer A | Buyer B |
|---|---|---|
| Gross | ₹30.00/kg | ₹29.00/kg |
| Deductions | ₹4.00/kg | ₹1.50/kg |
| **Net** | **₹26.00/kg** | **₹27.50/kg** ✅ |

Buyer B's lower gross price still nets the farmer ₹1.50/kg more, and AnnData surfaces this explicitly with a plain-language explanation. Full detail: [`docs/net-realizable-price.md`](docs/net-realizable-price.md).

## Local installation

Requires Python 3.11+, Node.js 20+. Everything below runs with **zero paid services and zero secrets**.

### 1. Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate        # Windows — use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
alembic upgrade head           # create the schema
python scripts/seed.py         # seed synthetic demo data (or: python scripts/reset_demo.py to wipe+reseed)
uvicorn app.main:app --reload  # http://localhost:8000  (docs at /docs)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Open `http://localhost:5173`, click **Log in**, and pick any demo account (password shown on the login page).

### 3. Resetting the demo

```bash
cd backend
python scripts/reset_demo.py   # drops all tables, recreates schema, reseeds
```

## Environment variables

See [`.env.example`](.env.example) for the full, documented list. **Nothing is required** — every default is safe for local use. Copy it to `backend/.env` (and `frontend/.env` for `VITE_*` overrides) only to change a default (e.g. pointing at PostgreSQL, or a non-default frontend origin for CORS).

## Testing

```bash
# Backend — 103 tests
cd backend && pytest

# Frontend — 14 tests
cd frontend && npm run test -- --run

# End-to-end (requires both dev servers running, or CI auto-starts them)
cd e2e && npm install && npx playwright install chromium && npm test
```

Full detail on what's covered, the two real bugs caught and fixed during development (a CORS/middleware-ordering issue and a logout/login race), and what's explicitly out of scope: [`TESTING.md`](TESTING.md).

## Demo accounts

All passwords: **`Demo@123`**

| Role | Email |
|---|---|
| Farmer | `farmer@annadata.demo` (Kavita Shinde) |
| Farmer | `ganesh.patil@annadata.demo` |
| Farmer | `rajendra.jadhav@annadata.demo` |
| FPO Agent | `fpo@annadata.demo` (Niphad FPO) |
| Buyer | `buyer@annadata.demo`, `buyer2@annadata.demo`, `buyer3@annadata.demo` |
| Assayer | `assayer@annadata.demo` |
| Transporter | `transporter@annadata.demo` |
| Admin | `admin@annadata.demo` |

The seed also creates a second FPO and a wider farmer/buyer roster (18 farmers, 6 buyers, 2 assayers, 2 transporters, 3 storage facilities across two talukas) to populate the extended 16-lot dataset — see [`backend/scripts/seed.py`](backend/scripts/seed.py) for the full roster. A few are worth knowing about specifically:

| Role | Email | Notable for |
|---|---|---|
| FPO Agent | `fpo2@annadata.demo` | Yeola FPO — second collection centre |
| Buyer | `buyer4@annadata.demo` | Exporter, verified — submits a `PURCHASE_ORDER`-type offer |
| Buyer | `buyer5@annadata.demo` | Wholesaler, verification **PENDING** |
| Buyer | `buyer6@annadata.demo` | Retailer, **UNVERIFIED** — demonstrates the "unverified buyers cannot offer" rule |

## Synthetic demo data disclaimer

**Every farmer, FPO, buyer, assayer, transporter and storage facility in this repository is a synthetic demo record**, created solely to illustrate the AnnData workflow for evaluation. None represent real people, real organizations, or real transactions. Do not treat any name, phone number, or quantity in the seed data as real-world information. Villages, talukas, onion varieties, and price bands are drawn from public reference data researched for this pilot (see [`research/`](research/)) to keep the demo realistic, but the specific transactions are entirely fabricated.

## Known limitations

- **Money fields use `Float`, not `Decimal`** — acceptable for a demo, a real deployment handling payments should migrate to fixed-point arithmetic (see `DATABASE.md`).
- **Refresh tokens live in `localStorage`**, not an httpOnly cookie — a reasonable simplification for a local demo, not for production (see `SECURITY.md`).
- **Notification push is best-effort**: the WebSocket channel exists and works, but most mutations don't yet bridge their synchronous handler into an async broadcast, so the frontend's 15-second poll is the reliable path today (the IoT storage stream, by contrast, is a genuine async background task and is fully real-time).
- **No S3/object-storage backend** — the storage abstraction (`FileStorage`) exists but only a local-filesystem implementation is built.
- **No consent-capture UI** — the `ConsentRecord` model and storage exist; a full consent flow isn't wired into onboarding.
- **Offline-first is a queue architecture, not a shipped feature** — see the codebase's TanStack Query setup as the natural extension point; a full IndexedDB queue with sync-status UI wasn't built in this pass.
- **Repository-pattern-free backend** — routers query SQLAlchemy directly rather than through a repository abstraction, a scope trade-off (see `ARCHITECTURE.md`).
- **Chromium-only E2E** — Firefox/WebKit Playwright projects aren't configured.
- **Free-tier hosting, not hardened production infra** — the [live demo](#live-demo) runs on Render's free web service (SQLite, resets on cold start) and Vercel's free static hosting; no Docker/CI deploy pipeline, Postgres, persistent disk or autoscaling is set up. See `DEPLOYMENT.md` for what a harder deployment would need.

## Future roadmap

- PostgreSQL + S3 object storage for a real multi-instance deployment.
- httpOnly-cookie refresh tokens + CSRF protection.
- A genuine sync-to-async notification bridge for fully real-time push on every mutation, not just IoT.
- A real offline queue (IndexedDB) with visible sync status for farmer/FPO data entry in low-connectivity areas.
- Optional pluggable real ML grading model behind the existing `services/screening.py` interface, still clearly labeled non-authoritative.
- Multi-crop, multi-region expansion beyond the onion/Niphad-Lasalgaon pilot.

## Documentation index

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system design, request lifecycle, the net-price engine, deployment portability
- [`API.md`](API.md) — endpoint reference (interactive docs at `/docs` when the backend is running)
- [`DATABASE.md`](DATABASE.md) — schema, relationships, seed data
- [`SECURITY.md`](SECURITY.md) — auth, RBAC, file uploads, CORS, rate limiting, known limitations
- [`TESTING.md`](TESTING.md) — what's tested and how to run it
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — running it locally and what a real deployment would need
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — local setup, branching, commit style
- [`CHANGELOG.md`](CHANGELOG.md)
- [`docs/workflow.md`](docs/workflow.md) · [`docs/roles.md`](docs/roles.md) · [`docs/net-realizable-price.md`](docs/net-realizable-price.md) · [`docs/quality-and-rejection.md`](docs/quality-and-rejection.md) · [`docs/payment-and-settlement.md`](docs/payment-and-settlement.md) · [`docs/dispute-management.md`](docs/dispute-management.md) · [`docs/audit-log.md`](docs/audit-log.md)

## Screenshots

_Placeholder — add screenshots of the landing page, FPO dashboard, net-price comparison, and purchase order view here._

## License

[MIT](LICENSE)
