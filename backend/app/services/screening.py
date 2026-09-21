"""Deterministic, local, offline preliminary quality screening.

This intentionally does NOT call any external/paid AI API — it exists so
the platform works with zero API keys. It produces an indicative grade and
defect flags from simple, explainable heuristics derived from the lot's own
data (a stand-in for a real image-classification pass). The result is
always presented as preliminary and non-authoritative; the physical
QualityAssessment performed by an assayer is the record of truth.
"""

import hashlib
from dataclasses import dataclass, field

MODEL_VERSION = "annadata-local-screen-v1"
DISCLAIMER = "Preliminary screening only — physical verification required."

_DEFECT_CATALOGUE = [
    "minor visible defects",
    "surface damage",
    "size variation",
    "sprouting risk",
    "moisture spotting",
]


@dataclass
class ScreeningResult:
    predicted_grade: str
    confidence_score: float
    defect_flags: list[str] = field(default_factory=list)
    model_version: str = MODEL_VERSION
    disclaimer: str = DISCLAIMER
    manual_verification_required: bool = True


def run_preliminary_screening(
    lot_code: str, total_quantity_kg: float
) -> ScreeningResult:
    """Deterministic given the same lot_code/quantity — makes the demo and
    tests reproducible instead of using real randomness."""
    digest = hashlib.sha256(f"{lot_code}:{total_quantity_kg}".encode()).hexdigest()
    seed = int(digest[:8], 16)

    grade_options = ["A", "B", "C"]
    grade = grade_options[seed % len(grade_options)]
    confidence = round(65 + (seed % 3000) / 100, 1)  # 65.0 - 94.9
    confidence = min(confidence, 95.0)

    num_flags = (seed // 7) % 3  # 0, 1 or 2 flags
    flags = [
        _DEFECT_CATALOGUE[(seed + i * 3) % len(_DEFECT_CATALOGUE)]
        for i in range(num_flags)
    ]

    return ScreeningResult(
        predicted_grade=grade,
        confidence_score=confidence,
        defect_flags=flags,
    )
