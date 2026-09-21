import pytest

from app.services.settlement import ContributorShare, compute_settlement_items


def test_settlement_splits_proportionally_by_quantity():
    contributors = [
        ContributorShare(farmer_id=1, quantity_kg=420),
        ContributorShare(farmer_id=2, quantity_kg=680),
        ContributorShare(farmer_id=3, quantity_kg=900),
    ]
    lines = compute_settlement_items(contributors=contributors, total_amount=54450.0)

    assert len(lines) == 3
    assert lines[0].share_percentage == pytest.approx(21.0, abs=0.01)
    assert lines[1].share_percentage == pytest.approx(34.0, abs=0.01)
    assert lines[2].share_percentage == pytest.approx(45.0, abs=0.01)

    total_distributed = sum(line.net_amount for line in lines)
    assert total_distributed == pytest.approx(54450.0, abs=0.02)


def test_settlement_applies_platform_fee_and_other_deductions():
    contributors = [
        ContributorShare(farmer_id=1, quantity_kg=100),
        ContributorShare(farmer_id=2, quantity_kg=100),
    ]
    lines = compute_settlement_items(
        contributors=contributors,
        total_amount=1000.0,
        platform_fee_amount=50.0,
        other_deductions_total=50.0,
    )
    total_distributed = sum(line.net_amount for line in lines)
    assert total_distributed == pytest.approx(900.0, abs=0.02)


def test_settlement_rejects_empty_contributor_list():
    with pytest.raises(ValueError):
        compute_settlement_items(contributors=[], total_amount=1000.0)


def test_settlement_rejects_zero_total_quantity():
    with pytest.raises(ValueError):
        compute_settlement_items(
            contributors=[ContributorShare(farmer_id=1, quantity_kg=0)],
            total_amount=1000.0,
        )


def test_every_farmer_gets_an_itemized_line_not_a_lump_sum():
    contributors = [ContributorShare(farmer_id=i, quantity_kg=100) for i in range(5)]
    lines = compute_settlement_items(contributors=contributors, total_amount=5000.0)
    assert len(lines) == 5
    assert len({line.farmer_id for line in lines}) == 5
