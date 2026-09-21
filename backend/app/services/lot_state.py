"""Lot status state machine.

Centralizes which transitions are legal so no endpoint can push a lot into
an invalid state. Disputes can be opened from most post-assessment states
and, on resolution, return the lot to the state it was in before the
dispute (tracked by the caller, not by this module).
"""

from app.core.errors import InvalidStateTransitionError
from app.models.enums import LotStatus

ALLOWED_TRANSITIONS: dict[LotStatus, set[LotStatus]] = {
    LotStatus.DRAFT: {LotStatus.COLLECTED},
    LotStatus.COLLECTED: {LotStatus.UNDER_ASSESSMENT},
    LotStatus.UNDER_ASSESSMENT: {LotStatus.ASSESSED},
    LotStatus.ASSESSED: {LotStatus.OPEN_FOR_OFFERS},
    LotStatus.OPEN_FOR_OFFERS: {LotStatus.OFFER_ACCEPTED},
    LotStatus.OFFER_ACCEPTED: {LotStatus.PURCHASE_ORDER_CREATED},
    LotStatus.PURCHASE_ORDER_CREATED: {LotStatus.DISPATCHED, LotStatus.DISPUTED},
    LotStatus.DISPATCHED: {LotStatus.DELIVERED, LotStatus.DISPUTED},
    LotStatus.DELIVERED: {LotStatus.SETTLED, LotStatus.DISPUTED},
    LotStatus.SETTLED: {LotStatus.CLOSED, LotStatus.DISPUTED},
    LotStatus.DISPUTED: {
        LotStatus.PURCHASE_ORDER_CREATED,
        LotStatus.DISPATCHED,
        LotStatus.DELIVERED,
        LotStatus.SETTLED,
        LotStatus.CLOSED,
    },
    LotStatus.CLOSED: set(),
}


def assert_transition_allowed(current: LotStatus, target: LotStatus) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidStateTransitionError(
            f"Lot cannot move from {current.value} to {target.value}. "
            f"Allowed next states: {sorted(s.value for s in allowed) or 'none'}."
        )


def transition(current: LotStatus, target: LotStatus) -> LotStatus:
    assert_transition_allowed(current, target)
    return target
