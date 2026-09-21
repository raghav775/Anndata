"""Tolerance-band rejection / step-down pricing.

Rejection is never purely all-or-nothing: a purchase order carries a list of
per-grade tolerance rules (contracted grade = full price, a lower-but-usable
grade = a pre-agreed reduced price, and an even lower grade may still be
usable at a further negotiated step-down). Only grades below
`reject_below_grade`, or a contamination flag, produce a hold/rejection.
"""

from dataclasses import dataclass

GRADE_ORDER = ["REJECTED", "C", "B", "A"]


@dataclass
class ToleranceOutcome:
    outcome: str  # "ACCEPTED_FULL" | "ACCEPTED_STEP_DOWN" | "REJECTED_HOLD" | "REJECTED_OUT_OF_RANGE"
    applicable_price_per_kg: float
    price_multiplier: float
    note: str


def _grade_rank(grade: str) -> int:
    return GRADE_ORDER.index(grade) if grade in GRADE_ORDER else -1


def resolve_tolerance_pricing(
    *,
    contracted_grade: str,
    delivered_grade: str,
    contracted_net_price_per_kg: float,
    tolerance_rules: list[dict],
    reject_below_grade: str,
    contamination_flagged: bool,
    contamination_auto_reject: bool,
) -> ToleranceOutcome:
    if contamination_flagged and contamination_auto_reject:
        return ToleranceOutcome(
            outcome="REJECTED_HOLD",
            applicable_price_per_kg=0.0,
            price_multiplier=0.0,
            note="Safety/contamination flag triggered a mandatory hold under configured rules.",
        )

    if _grade_rank(delivered_grade) < _grade_rank(reject_below_grade):
        return ToleranceOutcome(
            outcome="REJECTED_OUT_OF_RANGE",
            applicable_price_per_kg=0.0,
            price_multiplier=0.0,
            note=(
                f"Delivered grade {delivered_grade} is below the agreed minimum "
                f"{reject_below_grade}. Documented rejection/dispute required."
            ),
        )

    rule_by_grade = {r["grade"]: r for r in tolerance_rules}
    rule = rule_by_grade.get(delivered_grade)
    if rule is None:
        return ToleranceOutcome(
            outcome="REJECTED_OUT_OF_RANGE",
            applicable_price_per_kg=0.0,
            price_multiplier=0.0,
            note=f"No tolerance rule configured for delivered grade {delivered_grade}.",
        )

    multiplier = float(rule["price_multiplier"])
    price = round(contracted_net_price_per_kg * multiplier, 4)
    if delivered_grade == contracted_grade or multiplier >= 1.0:
        outcome = "ACCEPTED_FULL"
    else:
        outcome = "ACCEPTED_STEP_DOWN"
    return ToleranceOutcome(
        outcome=outcome,
        applicable_price_per_kg=price,
        price_multiplier=multiplier,
        note=rule.get("note") or "",
    )
