# The AnnData workflow

This walks through the full lot lifecycle and which role/endpoint drives each step. It is the same sequence `e2e/tests/golden-path.spec.ts` and `backend/tests/test_full_demo_transaction.py` exercise end to end.

## 1. Onboard farmers

**FPO Agent** → `POST /api/farmers`. Creates a `User` (role `FARMER`) and `FarmerProfile`, returns a demo login the agent can hand to the farmer. Farmers themselves never need to self-register for this pilot's assisted-onboarding model.

## 2. Aggregate a lot

**FPO Agent** → `POST /api/lots` with a list of `{farmer_id, quantity_kg}` contributors. The lot starts in `DRAFT`; total quantity is the sum of contributions. Duplicate contributors and non-positive quantities are rejected at the schema level.

## 3. Mark collected

**FPO Agent** → `POST /api/lots/{id}/collect`. `DRAFT → COLLECTED`. In a full deployment this is where preliminary photos would be attached (`POST /api/uploads/lots/{id}/media`).

## 4. Preliminary screening

**FPO Agent** → `POST /api/lots/{id}/screen`. Runs `services/screening.py` — a deterministic, local, offline heuristic (no external API, no cost). Produces a predicted grade, a confidence score, and defect flags, always paired with the disclaimer *"Preliminary screening only — physical verification required."* `COLLECTED → UNDER_ASSESSMENT`. This result is never treated as authoritative anywhere in the system.

## 5. Physical assessment (authoritative)

**Assayer** → `POST /api/lots/{id}/assessment`. Records sample quantity, final weight, final grade, visible defects and notes. Sets `is_finalized=True`. `UNDER_ASSESSMENT → ASSESSED`. This is the record of truth — see `docs/quality-and-rejection.md` for what "authoritative" actually guarantees.

## 6. Open for offers

**FPO Agent** → `POST /api/lots/{id}/open-for-offers`. `ASSESSED → OPEN_FOR_OFFERS`. The lot becomes visible to buyers in the marketplace.

## 7. Buyers submit offers

**Buyer** (must be `VERIFIED`) → `POST /api/offers`. Each offer carries a gross price plus five itemized deduction fields. See `docs/net-realizable-price.md` for how these are compared.

## 8. Compare and accept

**FPO Agent** views `GET /api/offers/lot/{lot_id}` — ranked by **net** realizable price, with a plain-language explanation of the ranking — then `POST /api/offers/{id}/accept`. Every other active offer on the lot is automatically rejected. `OPEN_FOR_OFFERS → OFFER_ACCEPTED`.

## 9. Purchase order

**FPO Agent** → `POST /api/purchase-orders`. Freezes the accepted offer's price/deduction breakdown and tolerance rules into an immutable contract, and creates the associated `Payment` record. `OFFER_ACCEPTED → PURCHASE_ORDER_CREATED`. See `docs/net-realizable-price.md` and `docs/quality-and-rejection.md`.

## 10. Transport

**FPO Agent** → `POST /api/shipments` assigns a transporter. **Transporter** → `PATCH /api/shipments/{id}/status` steps through `ASSIGNED → PICKUP_SCHEDULED → PICKED_UP → IN_TRANSIT → DELIVERED`. The lot moves to `DISPATCHED` once the shipment reaches `PICKED_UP` or `IN_TRANSIT`.

## 11. Storage (optional)

**FPO Agent or Buyer** → `POST /api/storage/bookings` reserves capacity at a coordinated (not AnnData-owned) storage facility. See `docs/../ARCHITECTURE.md` and the storage section below for the simulated IoT stream.

## 12. Delivery confirmation

**Buyer** → `POST /api/purchase-orders/{id}/confirm-delivery` with the grade observed on arrival (and a contamination flag if relevant). This runs the tolerance-band pricing engine (`docs/quality-and-rejection.md`) and moves the lot to `DELIVERED`.

## 13. Payment

**Buyer** → `POST /api/payments/{id}/initiate`, then one or more `POST /api/payments/{id}/pay` calls (mock — no real money moves; over-payment and duplicate-completion are rejected). See `docs/payment-and-settlement.md`.

## 14. Settlement

**FPO Agent** → `POST /api/settlements/{lot_id}/initiate` once payment has been received. Splits the payment proportionally by each farmer's contributed quantity into itemized `SettlementItem` rows. `DELIVERED → SETTLED`. Every farmer sees only their own line via `GET /api/settlements/lot/{lot_id}` or `/farmer/{id}`.

## 15. Disputes (as needed)

**Buyer or FPO Agent** → `POST /api/disputes`. Moves the lot to `DISPUTED`, remembering its prior status. Evidence can be attached; status moves through an explicit review graph; resolution records a final decision and an optional financial adjustment, which — if a settlement already exists — is applied and every farmer's itemized line is recomputed. The lot returns to its pre-dispute status. See `docs/dispute-management.md`.

## Throughout: the audit trail

Every step above writes an `AuditLog` entry in the same transaction as the mutation. See `docs/audit-log.md`.
