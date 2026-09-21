import pytest

from app.core.errors import InvalidStateTransitionError
from app.models.enums import LotStatus
from app.services.lot_state import assert_transition_allowed


def test_valid_forward_transition_is_allowed():
    assert_transition_allowed(LotStatus.DRAFT, LotStatus.COLLECTED)
    assert_transition_allowed(LotStatus.COLLECTED, LotStatus.UNDER_ASSESSMENT)
    assert_transition_allowed(LotStatus.ASSESSED, LotStatus.OPEN_FOR_OFFERS)


def test_skipping_a_state_is_rejected():
    with pytest.raises(InvalidStateTransitionError):
        assert_transition_allowed(LotStatus.DRAFT, LotStatus.ASSESSED)


def test_moving_backwards_is_rejected():
    with pytest.raises(InvalidStateTransitionError):
        assert_transition_allowed(LotStatus.OPEN_FOR_OFFERS, LotStatus.COLLECTED)


def test_closed_is_terminal():
    with pytest.raises(InvalidStateTransitionError):
        assert_transition_allowed(LotStatus.CLOSED, LotStatus.DISPUTED)


def test_disputed_can_return_to_several_prior_states():
    assert_transition_allowed(LotStatus.DISPUTED, LotStatus.DELIVERED)
    assert_transition_allowed(LotStatus.DISPUTED, LotStatus.SETTLED)
