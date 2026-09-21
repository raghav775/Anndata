# Dispute management

## Lifecycle

`Dispute.status`: `OPEN → UNDER_REVIEW ⇄ EVIDENCE_REQUESTED → RESOLVED | REJECTED`, with `ESCALATED` reachable from `OPEN`/`UNDER_REVIEW` and itself able to resolve or reject. The allowed-transition graph lives in `app/api/disputes.py::_DISPUTE_TRANSITIONS` and is enforced the same way the lot state machine is — an out-of-graph transition raises `INVALID_STATE_TRANSITION` (409).

## Opening a dispute

`POST /api/disputes` (buyer or FPO agent) — `{lot_id, purchase_order_id?, reason}`. If the lot is in one of the post-purchase-order states (`PURCHASE_ORDER_CREATED`, `DISPATCHED`, `DELIVERED`, `SETTLED`), the lot itself moves to `DISPUTED`, and its prior status is remembered on `Lot.pre_dispute_status` so it can be restored later. This means a dispute is visible on the lot itself, not just as a detached record.

## Evidence

`POST /api/disputes/{id}/evidence` — multipart form, `{evidence_type, description, sensor_event_id?, file?}`. Evidence can be a description referencing an uploaded photo, a link to a specific `StorageEvent` (sensor reading) at the time of the incident, or a free-text note. Evidence cannot be added once a dispute is `RESOLVED` or `REJECTED` (`test_evidence_cannot_be_added_to_a_closed_dispute`).

## What gets retained as evidence for resolution

Per the spec, a resolution should be able to draw on: lot information, the quality record, the weight record, delivery timestamp, photographs, sensor events, the buyer's stated reason, and the proposed resolution. In this implementation, all of that is queryable by `lot_id` from existing records (`QualityAssessment`, `Shipment.delivered_at`, `LotMedia`, `StorageEvent` via `DisputeEvidence.sensor_event_id`) rather than duplicated into the dispute row — the dispute stores the reason, proposed resolution and evidence list; everything else is looked up from the lot's own history, which is itself immutable/audited.

## Resolution

`POST /api/disputes/{id}/resolve` (FPO agent/admin) — `{final_decision, financial_adjustment?, status: RESOLVED | REJECTED}`:

1. Records the decision, adjustment, resolver and timestamp.
2. Restores the lot to `Lot.pre_dispute_status` if it was moved to `DISPUTED`.
3. If a `financial_adjustment` is given and a `Settlement` already exists for the lot, adjusts the total and **recomputes every farmer's itemized line** (see `docs/payment-and-settlement.md`).
4. Notifies the user who raised the dispute.
5. Writes an audit entry.

## Seeded example

The demo seed (`backend/scripts/seed.py`) includes one fully resolved dispute (`DSP-2026-0001`) on the demo lot: a buyer-raised sprouting complaint, resolved with a partial ₹450 deduction rather than full lot rejection — a concrete illustration of the tolerance philosophy applied to disputes too.
