# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] — Unreleased (Smart India Hackathon 2026 build)

### Added

- FastAPI + SQLAlchemy + SQLite backend covering the full AnnData workflow: authentication/RBAC, farmer onboarding, FPO lot aggregation, deterministic local preliminary screening, assayer physical quality assessment (with audited corrections), a net-realizable-price engine, purchase orders with tolerance-band step-down pricing, logistics coordination, storage booking with a simulated IoT sensor stream, mock payments, per-farmer itemized settlements, dispute management with evidence and financial-adjustment resolution, and an append-only audit log.
- React + TypeScript + Tailwind CSS frontend: marketing landing page, JWT auth with demo-account quick-login, a role-aware app shell and navigation, dashboards for all six roles, the full lot workflow UI, buyer marketplace, purchase order view/print, shipment tracking, live storage/IoT monitoring with charts, payments, settlements, disputes, admin audit log, analytics, and a 4-language (English/Hindi/Marathi/Gujarati) interface for major labels.
- Deterministic demo seed: three synthetic onion farmers aggregated into one 2,000kg lot, carried through the entire workflow to a resolved dispute, plus reference data for the pilot (FPO, buyers, assayer, transporter, storage facility).
- Test suites: 97 backend pytest tests (unit + API integration + full end-to-end demo transaction), 12 frontend Vitest/RTL tests, and a Playwright E2E suite covering auth, RBAC, and the complete transaction driven through the real UI.
- GitHub Actions CI for backend, frontend, and E2E.

### Fixed

- Middleware ordering bug where the rate limiter's 429 response bypassed CORS headers entirely (CORS middleware must wrap outermost), which the browser reported as an opaque network error instead of the actual status.
- A logout race between an imperative `navigate()` call and `ProtectedRoute`'s reactive redirect, which could carry a stale "return to this page" location into the *next* login on a shared browser — fixed with an explicit hard navigation on logout.
- Settlement items not being recomputed when a dispute's financial adjustment changed the settlement total, leaving each farmer's itemized line stale relative to the adjusted total.

### Known limitations

See the README's "Known limitations" section.
