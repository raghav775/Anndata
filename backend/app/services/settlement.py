"""Settlement calculation.

Splits the amount a buyer pays for a lot among the farmer contributors,
proportional to the quantity each farmer contributed, after subtracting
platform/FPO-level deductions disclosed on the settlement itself. Every
farmer receives an itemized line (SettlementItem) — never a lump total.
"""

from dataclasses import dataclass


@dataclass
class ContributorShare:
    farmer_id: int
    quantity_kg: float


@dataclass
class SettlementLine:
    farmer_id: int
    contributed_quantity_kg: float
    share_percentage: float
    gross_share_amount: float
    deduction_amount: float
    net_amount: float


def compute_settlement_items(
    *,
    contributors: list[ContributorShare],
    total_amount: float,
    platform_fee_amount: float = 0.0,
    other_deductions_total: float = 0.0,
) -> list[SettlementLine]:
    if not contributors:
        raise ValueError("a settlement requires at least one contributor")

    total_quantity = sum(c.quantity_kg for c in contributors)
    if total_quantity <= 0:
        raise ValueError("total contributed quantity must be positive")

    total_deductions = platform_fee_amount + other_deductions_total
    distributable_amount = max(total_amount - total_deductions, 0.0)

    lines: list[SettlementLine] = []
    allocated = 0.0
    for contributor in contributors:
        share_pct = round((contributor.quantity_kg / total_quantity) * 100, 4)
        gross_share = round(
            total_amount * (contributor.quantity_kg / total_quantity), 2
        )
        deduction_share = round(
            total_deductions * (contributor.quantity_kg / total_quantity), 2
        )
        net = round(gross_share - deduction_share, 2)
        allocated += net
        lines.append(
            SettlementLine(
                farmer_id=contributor.farmer_id,
                contributed_quantity_kg=contributor.quantity_kg,
                share_percentage=share_pct,
                gross_share_amount=gross_share,
                deduction_amount=deduction_share,
                net_amount=net,
            )
        )

    # Correct any floating point drift on the final line so items sum exactly
    # to (total_amount - total_deductions).
    expected_total = round(distributable_amount, 2)
    drift = round(expected_total - sum(line.net_amount for line in lines), 2)
    if drift != 0 and lines:
        lines[-1].net_amount = round(lines[-1].net_amount + drift, 2)

    return lines
