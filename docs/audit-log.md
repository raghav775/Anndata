# Audit log

## Append-only, by construction

`AuditLog` rows are written exclusively by `app/services/audit.py::record_audit`, always called inside the same database transaction as the mutation it describes (so an audit entry and its mutation commit or roll back together — never one without the other). **No endpoint anywhere in the API updates or deletes an `AuditLog` row.** There is no `PATCH`/`PUT`/`DELETE` route mounted for the entity at all — the only way to change the table's contents through the application is to add a new row.

## What's recorded

| Field | Meaning |
|---|---|
| `actor_user_id` / `actor_role` | Who did it (nullable for system actions) |
| `action` | A fixed string like `LOT_CREATED`, `QUALITY_ASSESSMENT_FINALIZED`, `OFFER_ACCEPTED`, `PURCHASE_ORDER_CREATED`, `PAYMENT_RECEIVED`, `DISPUTE_RESOLVED`, etc. |
| `entity_type` / `entity_id` | What it happened to |
| `old_value` / `new_value` | Before/after snapshot (JSON), where relevant — e.g. a status change, a corrected weight, a verification status |
| `created_at` | Timestamp |

## Coverage

Every important mutation in the workflow writes an entry: farmer onboarding, lot creation/state transitions, preliminary screening, quality assessment finalization **and correction**, offer submission/acceptance, purchase order creation, delivery confirmation, transport assignment/status updates, storage booking, payment initiation/receipt, settlement initiation, dispute open/status-change/resolution, buyer verification changes, and user activation/deactivation. This is exercised directly in `test_full_demo_transaction.py`, which asserts the expected action set exists for both the lot and a dispute raised against it.

## Access

`GET /api/audit-logs` is restricted to `ADMIN` only (filterable by `entity_type`, `entity_id`, `action`), rendered as a searchable table on the admin Audit Log page in the frontend. Other roles never see raw audit data — an FPO agent's "transaction timeline" view on their dashboard is instead built from the lots/status data they already have access to, not from the audit log, precisely to keep the audit log itself an admin-only surface as the spec requires.
