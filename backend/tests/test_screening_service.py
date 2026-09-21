from app.services.screening import run_preliminary_screening


def test_screening_is_deterministic_for_same_lot():
    a = run_preliminary_screening("LOT-2026-0099", 2000.0)
    b = run_preliminary_screening("LOT-2026-0099", 2000.0)
    assert a.predicted_grade == b.predicted_grade
    assert a.confidence_score == b.confidence_score
    assert a.defect_flags == b.defect_flags


def test_screening_differs_for_different_lots():
    a = run_preliminary_screening("LOT-2026-0001", 2000.0)
    b = run_preliminary_screening("LOT-2026-9999", 500.0)
    assert (a.predicted_grade, a.confidence_score) != (
        b.predicted_grade,
        b.confidence_score,
    )


def test_screening_never_claims_certification():
    result = run_preliminary_screening("LOT-2026-0001", 2000.0)
    assert "certified" not in result.disclaimer.lower()
    assert "verification required" in result.disclaimer.lower()
    assert result.manual_verification_required is True


def test_screening_confidence_within_bounds():
    for i in range(20):
        result = run_preliminary_screening(f"LOT-TEST-{i}", 1000.0 + i)
        assert 0 <= result.confidence_score <= 100
        assert result.predicted_grade in ("A", "B", "C")
