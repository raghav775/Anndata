# Net realizable price

This is the platform's central transparency mechanism, and the one piece of business logic the spec is most insistent about getting right: **buyer offers are never ranked or presented by gross price alone.**

## The calculation

```
net_price_per_kg = gross_price_per_kg
                  - transport_cost_per_kg
                  - loading_unloading_per_kg
                  - grading_fee_per_kg
                  - storage_cost_per_kg
                  - platform_fee_per_kg
                  - sum(other_deductions[].amount_per_kg)
```

Implemented in `backend/app/services/net_price.py`, a pure function with no database dependency — `compute_net_price_per_kg`, `compute_expected_net_realization` (multiplies by quantity), and `rank_offers_by_net_realization` (sorts descending by net price, annotating each offer with its total deductions and expected net realization).

## The worked example from the spec

| | Buyer A | Buyer B |
|---|---|---|
| Gross price | ₹30.00/kg | ₹29.00/kg |
| Deductions | ₹4.00/kg | ₹1.50/kg |
| **Net price** | **₹26.00/kg** | **₹27.50/kg** |

Buyer B's lower gross price still nets the farmer ₹1.50/kg *more*. This exact scenario is a regression test (`test_net_price_service.py::test_spec_example_buyer_a_vs_buyer_b`) and is reproduced in the seeded demo lot (`LOT-2026-0001`) and the E2E golden-path test.

## Where this shows up

- `GET /api/offers/lot/{lot_id}` returns offers sorted by net price, `best_offer_id`, and a generated `explanation` string that spells out *why* — e.g. *"Although this offer's gross price (₹29.0/kg) is lower than another offer (₹30.0/kg), its lower deductions ... produce a better expected farmer realization ... Gross price alone would have picked the worse offer."*
- The frontend's lot detail page (`LotDetailPage.tsx` → `OffersSection`) shows every offer with its full deduction breakdown before an FPO agent can accept one, and visually marks the best-net offer — never the highest-gross one.
- When a purchase order is created, the accepted offer's full deduction breakdown is copied verbatim into the `PurchaseOrder.deductions` JSON column, so the contract stays auditable even if the original `Offer` row is later modified.

## What counts as a deduction

Five named fields (transport, loading/unloading, grading/assaying, storage, platform/FPO fee) plus an open-ended `other_deductions` list of `{label, amount_per_kg}` pairs for anything not covered by the named fields — every deduction, named or ad hoc, is disclosed before an offer can be accepted. There is no hidden fee path anywhere in the offer or purchase order schema.
