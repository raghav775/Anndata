# Payment and settlement

## Payment (mock)

No real payment gateway is used or required (`PAYMENTS_PROVIDER=mock`, hardcoded — no live integration exists). `Payment` states: `PAYMENT_PENDING → DISPATCHED → DELIVERED → PAYMENT_INITIATED → PAYMENT_COMPLETED | PARTIALLY_PAID`, with `OVERDUE`/`DISPUTED` reachable administratively. `DISPATCHED`/`DELIVERED` here mirror the shipment/delivery milestones (set automatically as the shipment progresses and as delivery is confirmed) rather than being separate manual steps.

- `POST /api/payments/{id}/initiate` — buyer only, generates a mock `transaction_reference`.
- `POST /api/payments/{id}/pay` — buyer only, `{amount}`. Guards:
  - Rejects if already `PAYMENT_COMPLETED` (no duplicate payment).
  - Rejects if `amount` exceeds the remaining balance (no over-payment).
  - Sets `PARTIALLY_PAID` if the payment doesn't cover the full amount due, `PAYMENT_COMPLETED` once it does.

## Settlement

`POST /api/settlements/{lot_id}/initiate` (FPO agent/admin) requires the payment to be `PAYMENT_COMPLETED` or `PARTIALLY_PAID`. `services/settlement.py::compute_settlement_items` splits the payment's `amount_received` proportionally by each farmer's contributed quantity:

```
farmer_share_pct = farmer_quantity_kg / total_lot_quantity_kg
farmer_gross     = total_amount × farmer_share_pct
farmer_net       = farmer_gross − farmer_deduction_share
```

The **last** line absorbs any floating-point rounding drift so the itemized lines always sum exactly to the distributable total (`test_settlement_produces_itemized_lines_for_every_farmer` asserts `sum(items.net_amount) == payment.amount_received`).

### Every farmer sees only their own line

`GET /api/settlements/lot/{lot_id}` returns the whole settlement to an FPO agent/admin, but filters to only the calling farmer's own `SettlementItem` when the caller is a `FARMER` (`test_farmer_sees_only_their_own_settlement_item`). There is no endpoint that lets a farmer see another farmer's payout.

### Interaction with disputes

If a dispute against a settled lot is resolved with a non-zero `financial_adjustment`, `POST /api/disputes/{id}/resolve`:

1. Adjusts `Settlement.total_amount` by the adjustment (negative = deduction).
2. Appends a labeled entry to `Settlement.other_deductions` (e.g. *"Dispute DSP-2026-0001 adjustment"*).
3. **Recomputes every farmer's itemized line** against the new total via the same `compute_settlement_items` function — the adjustment is never applied only to the settlement's headline total while leaving stale per-farmer numbers behind.
4. Sets `Settlement.status = DISPUTED` so it's visibly flagged as adjusted.

This recomputation step was added specifically because the first implementation only adjusted the total and left `SettlementItem` rows stale — caught by manually inspecting the seeded demo data during development, not by an initial test (a good example of why "the numbers look right at the top level" isn't enough — see `TESTING.md`).
