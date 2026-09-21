# Quality assessment and tolerance-band rejection

## Two distinct quality signals, never confused

1. **Preliminary AI screening** (`services/screening.py`) — deterministic, local, offline. Produces an indicative grade, a confidence score, and defect flags. Always carries the disclaimer *"Preliminary screening only — physical verification required."* The API and UI never call this "certified" or "verified" anywhere.
2. **Physical quality assessment** (`QualityAssessment` model) — performed by an `ASSAYER`, the only authoritative quality record in the system. Once `POST /api/lots/{id}/assessment` finalizes it (`is_finalized=True`), it becomes immutable through normal update paths.

### What "immutable" actually means

No endpoint lets a buyer or FPO agent edit a finalized assessment — `PATCH /api/lots/{id}/assessment/correct` is restricted to `ASSAYER` and `ADMIN` only (`test_buyer_cannot_edit_finalized_assessment`, `test_fpo_agent_cannot_silently_modify_assessment`). Even the assayer's own corrections aren't silent: every correction call writes an `AuditLog` entry recording the old value, the new value, and the stated reason (`test_assayer_correction_creates_an_audit_entry`).

## Tolerance-band pricing, not all-or-nothing rejection

A `PurchaseOrder` carries a `tolerance_rules` list — e.g.:

```json
[
  {"grade": "A", "price_multiplier": 1.0,  "note": "Full contracted price"},
  {"grade": "B", "price_multiplier": 0.92, "note": "Pre-agreed reduced price within tolerance"},
  {"grade": "C", "price_multiplier": 0.75, "note": "Secondary/negotiated step-down"}
]
```

At delivery, `services/tolerance.py::resolve_tolerance_pricing` takes the grade actually observed and returns one of four outcomes:

| Outcome | When | Price |
|---|---|---|
| `ACCEPTED_FULL` | Delivered grade matches contracted grade (multiplier 1.0) | Full contracted net price |
| `ACCEPTED_STEP_DOWN` | Delivered grade is lower but still within the configured tolerance rules | `contracted_net_price × multiplier` |
| `REJECTED_OUT_OF_RANGE` | Delivered grade falls below `reject_below_grade` | ₹0 — documented rejection/dispute |
| `REJECTED_HOLD` | `contamination_flagged=True` and `contamination_auto_reject=True` | ₹0 — mandatory hold regardless of grade |

This is deliberately **not** binary: `test_rejection_is_never_purely_all_or_nothing` asserts that grades A, B and C each resolve to a distinct, non-zero price under the default rules — a lower-but-usable grade produces a fair reduced price, not a full rejection.

## Where it's invoked

`POST /api/purchase-orders/{id}/confirm-delivery` (buyer-only) is the trigger point: it takes the delivered grade and a contamination flag, runs the tolerance engine, and updates the associated `Payment.amount_due` to the resolved price × quantity. The outcome and note are returned to the caller and shown in the UI.

## Rules are configurable per purchase order

`reject_below_grade` and `contamination_auto_reject` are both fields on `PurchaseOrder`, set at creation time (`POST /api/purchase-orders`) — not hardcoded constants — so different buyer/FPO agreements can set different tolerance thresholds.
