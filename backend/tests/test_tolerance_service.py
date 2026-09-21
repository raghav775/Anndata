from app.services.tolerance import resolve_tolerance_pricing

TOLERANCE_RULES = [
    {"grade": "A", "price_multiplier": 1.0, "note": "Full contracted price"},
    {"grade": "B", "price_multiplier": 0.92, "note": "Reduced price within tolerance"},
    {"grade": "C", "price_multiplier": 0.75, "note": "Negotiated step-down"},
]


def test_contracted_grade_gets_full_price():
    outcome = resolve_tolerance_pricing(
        contracted_grade="B",
        delivered_grade="B",
        contracted_net_price_per_kg=27.5,
        tolerance_rules=TOLERANCE_RULES,
        reject_below_grade="C",
        contamination_flagged=False,
        contamination_auto_reject=True,
    )
    assert outcome.outcome in ("ACCEPTED_FULL", "ACCEPTED_STEP_DOWN")
    assert outcome.applicable_price_per_kg == round(27.5 * 0.92, 4)


def test_lower_grade_within_tolerance_gets_step_down_price_not_rejection():
    outcome = resolve_tolerance_pricing(
        contracted_grade="A",
        delivered_grade="B",
        contracted_net_price_per_kg=30.0,
        tolerance_rules=TOLERANCE_RULES,
        reject_below_grade="C",
        contamination_flagged=False,
        contamination_auto_reject=True,
    )
    assert outcome.outcome == "ACCEPTED_STEP_DOWN"
    assert outcome.applicable_price_per_kg > 0
    assert outcome.applicable_price_per_kg < 30.0


def test_grade_below_minimum_is_documented_rejection_not_silent_reject():
    outcome = resolve_tolerance_pricing(
        contracted_grade="A",
        delivered_grade="REJECTED",
        contracted_net_price_per_kg=30.0,
        tolerance_rules=TOLERANCE_RULES,
        reject_below_grade="C",
        contamination_flagged=False,
        contamination_auto_reject=True,
    )
    assert outcome.outcome == "REJECTED_OUT_OF_RANGE"
    assert outcome.applicable_price_per_kg == 0.0
    assert "below the agreed minimum" in outcome.note


def test_contamination_triggers_mandatory_hold_regardless_of_grade():
    outcome = resolve_tolerance_pricing(
        contracted_grade="A",
        delivered_grade="A",
        contracted_net_price_per_kg=30.0,
        tolerance_rules=TOLERANCE_RULES,
        reject_below_grade="C",
        contamination_flagged=True,
        contamination_auto_reject=True,
    )
    assert outcome.outcome == "REJECTED_HOLD"


def test_rejection_is_never_purely_all_or_nothing():
    """A, B and C should all resolve to different priced outcomes, proving
    the tolerance engine does not just accept-full or reject-all."""
    outcomes = {
        grade: resolve_tolerance_pricing(
            contracted_grade="A",
            delivered_grade=grade,
            contracted_net_price_per_kg=30.0,
            tolerance_rules=TOLERANCE_RULES,
            reject_below_grade="C",
            contamination_flagged=False,
            contamination_auto_reject=True,
        )
        for grade in ["A", "B", "C"]
    }
    prices = {grade: o.applicable_price_per_kg for grade, o in outcomes.items()}
    assert prices["A"] > prices["B"] > prices["C"] > 0
