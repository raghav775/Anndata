from app.services.net_price import (
    DeductionBreakdown,
    build_comparison_explanation,
    compute_expected_net_realization,
    compute_net_price_per_kg,
    rank_offers_by_net_realization,
)


def test_gross_minus_deductions_equals_net():
    breakdown = DeductionBreakdown(
        transport_cost_per_kg=2.0, loading_unloading_per_kg=1.0
    )
    assert compute_net_price_per_kg(30.0, breakdown) == 27.0


def test_other_deductions_are_included():
    breakdown = DeductionBreakdown(
        other_deductions=[{"amount_per_kg": 1.5}, {"amount_per_kg": 0.5}]
    )
    assert breakdown.other_total_per_kg == 2.0
    assert compute_net_price_per_kg(10.0, breakdown) == 8.0


def test_expected_net_realization_multiplies_by_quantity():
    breakdown = DeductionBreakdown(transport_cost_per_kg=4.0)
    assert compute_expected_net_realization(30.0, breakdown, 1980.0) == round(
        26.0 * 1980.0, 2
    )


def test_spec_example_buyer_a_vs_buyer_b():
    """The exact worked example from the spec: gross price alone would pick
    the wrong offer."""
    buyer_a = {
        "gross_price_per_kg": 30.0,
        "transport_cost_per_kg": 4.0,
        "required_quantity_kg": 100,
    }
    buyer_b = {
        "gross_price_per_kg": 29.0,
        "transport_cost_per_kg": 1.5,
        "required_quantity_kg": 100,
    }
    ranked = rank_offers_by_net_realization([buyer_a, buyer_b])

    assert ranked[0]["gross_price_per_kg"] == 29.0
    assert ranked[0]["net_price_per_kg"] == 27.5
    assert ranked[1]["net_price_per_kg"] == 26.0
    # Ranking is by net, not gross: the higher-gross offer must NOT be first.
    assert ranked[0]["gross_price_per_kg"] < ranked[1]["gross_price_per_kg"]


def test_ranking_is_by_net_not_gross_when_gross_agrees_with_net():
    high_everything = {
        "gross_price_per_kg": 40.0,
        "transport_cost_per_kg": 1.0,
        "required_quantity_kg": 10,
    }
    low_everything = {
        "gross_price_per_kg": 20.0,
        "transport_cost_per_kg": 1.0,
        "required_quantity_kg": 10,
    }
    ranked = rank_offers_by_net_realization([low_everything, high_everything])
    assert ranked[0]["gross_price_per_kg"] == 40.0


def test_comparison_explanation_flags_gross_vs_net_mismatch():
    ranked = rank_offers_by_net_realization(
        [
            {
                "gross_price_per_kg": 30.0,
                "transport_cost_per_kg": 4.0,
                "required_quantity_kg": 100,
            },
            {
                "gross_price_per_kg": 29.0,
                "transport_cost_per_kg": 1.5,
                "required_quantity_kg": 100,
            },
        ]
    )
    explanation = build_comparison_explanation(ranked)
    assert "lower" in explanation.lower()
    assert "27.5" in explanation


def test_single_offer_has_no_comparison():
    ranked = rank_offers_by_net_realization(
        [{"gross_price_per_kg": 30.0, "required_quantity_kg": 10}]
    )
    assert "one offer" in build_comparison_explanation(ranked).lower()
