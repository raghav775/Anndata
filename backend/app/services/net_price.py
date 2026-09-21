"""Net realizable price engine.

This is the core transparency mechanism of AnnData: buyer offers must never
be ranked by gross price alone. Every disclosed deduction (transport,
loading/unloading, grading/assaying, storage, platform/FPO fee, and any
other explicitly disclosed cost) is subtracted from the gross price to
produce the price a farmer can actually expect to realize.
"""

from dataclasses import dataclass, field


@dataclass
class DeductionBreakdown:
    transport_cost_per_kg: float = 0.0
    loading_unloading_per_kg: float = 0.0
    grading_fee_per_kg: float = 0.0
    storage_cost_per_kg: float = 0.0
    platform_fee_per_kg: float = 0.0
    other_deductions: list[dict] = field(default_factory=list)

    @property
    def other_total_per_kg(self) -> float:
        return sum(
            float(item.get("amount_per_kg", 0)) for item in self.other_deductions
        )

    @property
    def total_per_kg(self) -> float:
        return (
            self.transport_cost_per_kg
            + self.loading_unloading_per_kg
            + self.grading_fee_per_kg
            + self.storage_cost_per_kg
            + self.platform_fee_per_kg
            + self.other_total_per_kg
        )

    def as_dict(self) -> dict:
        return {
            "transport_cost_per_kg": self.transport_cost_per_kg,
            "loading_unloading_per_kg": self.loading_unloading_per_kg,
            "grading_fee_per_kg": self.grading_fee_per_kg,
            "storage_cost_per_kg": self.storage_cost_per_kg,
            "platform_fee_per_kg": self.platform_fee_per_kg,
            "other_deductions": self.other_deductions,
            "total_deductions_per_kg": round(self.total_per_kg, 4),
        }


def compute_net_price_per_kg(
    gross_price_per_kg: float, deductions: DeductionBreakdown
) -> float:
    """Gross price minus every disclosed deduction. Never negative in the UI
    (a genuinely negative net realization is surfaced as a warning by callers
    rather than silently clamped, so it stays visible)."""
    return round(gross_price_per_kg - deductions.total_per_kg, 4)


def compute_expected_net_realization(
    gross_price_per_kg: float, deductions: DeductionBreakdown, quantity_kg: float
) -> float:
    return round(
        compute_net_price_per_kg(gross_price_per_kg, deductions) * quantity_kg, 2
    )


def rank_offers_by_net_realization(offers: list[dict]) -> list[dict]:
    """Given a list of offer dicts each containing gross_price_per_kg and the
    deduction fields, return them annotated with net price and sorted
    descending by net price per kg (best farmer realization first).
    """
    annotated = []
    for offer in offers:
        breakdown = DeductionBreakdown(
            transport_cost_per_kg=offer.get("transport_cost_per_kg", 0),
            loading_unloading_per_kg=offer.get("loading_unloading_per_kg", 0),
            grading_fee_per_kg=offer.get("grading_fee_per_kg", 0),
            storage_cost_per_kg=offer.get("storage_cost_per_kg", 0),
            platform_fee_per_kg=offer.get("platform_fee_per_kg", 0),
            other_deductions=offer.get("other_deductions", []),
        )
        net_per_kg = compute_net_price_per_kg(offer["gross_price_per_kg"], breakdown)
        annotated.append(
            {
                **offer,
                "total_deductions_per_kg": breakdown.total_per_kg,
                "net_price_per_kg": net_per_kg,
                "expected_net_realization": round(
                    net_per_kg * offer.get("required_quantity_kg", 0), 2
                ),
            }
        )
    return sorted(annotated, key=lambda o: o["net_price_per_kg"], reverse=True)


def build_comparison_explanation(ranked_offers: list[dict]) -> str:
    if len(ranked_offers) < 2:
        return "Only one offer is available — no comparison possible yet."
    best, second = ranked_offers[0], ranked_offers[1]
    if best["gross_price_per_kg"] >= second["gross_price_per_kg"]:
        return (
            f"Offer at ₹{best['gross_price_per_kg']}/kg gross also yields the best net "
            f"realization at ₹{best['net_price_per_kg']}/kg after deductions."
        )
    return (
        f"Although this offer's gross price (₹{best['gross_price_per_kg']}/kg) is lower than "
        f"another offer (₹{second['gross_price_per_kg']}/kg), its lower deductions "
        f"(₹{best['total_deductions_per_kg']}/kg vs ₹{second['total_deductions_per_kg']}/kg) "
        f"produce a better expected farmer realization: ₹{best['net_price_per_kg']}/kg vs "
        f"₹{second['net_price_per_kg']}/kg. Gross price alone would have picked the worse offer."
    )
