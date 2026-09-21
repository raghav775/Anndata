# Roles and permissions

Six roles, enforced server-side (`app/middleware/deps.py::require_roles`) on every sensitive endpoint — never only in the frontend.

## FARMER

- View own profile (`GET /api/farmers/me`), own lots (`GET /api/farmers/{id}/lots`), own settlement (`GET /api/settlements/lot/{id}` returns only their own item; `GET /api/settlements/farmer/{id}`).
- Cannot view another farmer's profile, lots, or settlement — enforced object-level, not just by role (`test_farmer_cannot_view_another_farmers_profile`).
- Cannot onboard farmers, create lots, or perform any FPO/assayer/buyer action.

## FPO_AGENT

- Onboard farmers, create and progress lots (collect → screen → open for offers), view the FPO dashboard scoped to their own FPO.
- Compare offers, accept an offer, create the purchase order, assign transport, book storage, initiate settlement.
- Raise and review disputes for lots belonging to their FPO.
- Cannot finalize or edit a quality assessment (assayer-only), cannot pay (buyer-only), cannot see another FPO's farmers/lots/settlements/disputes.

## BUYER

- Must be `VERIFIED` (by an admin) before submitting an offer.
- View lots `OPEN_FOR_OFFERS` or later, submit offers, view own purchase orders, confirm delivery, initiate/make payments.
- Raise a dispute on a lot/PO they're party to.
- Cannot view a `DRAFT` lot, cannot accept their own offer, cannot pay someone else's payment, cannot edit a finalized quality assessment.

## ASSAYER

- Perform the physical quality assessment (the only role, besides admin, that can finalize or correct one).
- View lots pending assessment.
- Cannot create lots, accept offers, or perform buyer/FPO/transporter actions.

## TRANSPORTER

- View assigned shipments, update pickup/delivery status.
- Cannot update a shipment assigned to a different transporter (object-level check, not just role).

## ADMIN

- Full access: manage users (activate/deactivate), buyer verification, view all audit logs, all analytics, and can act on behalf of any role for demo/support purposes on most endpoints (`require_roles(..., UserRole.ADMIN)` is added alongside the primary role almost everywhere).
- The **only** role that can view `GET /api/audit-logs`.

## Enforcement pattern

Every protected route has two layers:

1. **Role check** — a FastAPI dependency (`require_roles(UserRole.X, UserRole.Y)`) that 403s before the handler body runs.
2. **Object-level check** — inside the handler, comparing the resource's owning ID (farmer, FPO, buyer, transporter) against the current user, e.g.:
   ```python
   def _assert_can_view_farmer(user: User, farmer: FarmerProfile) -> None:
       if user.role == UserRole.ADMIN:
           return
       if user.role == UserRole.FARMER and farmer.user_id == user.id:
           return
       if user.role == UserRole.FPO_AGENT and farmer.fpo_id == user.fpo_agent_profile.fpo_id:
           return
       raise ForbiddenError(...)
   ```

Both layers are covered by tests (`test_rbac`-flavored tests are spread across each resource's test file rather than centralized, since RBAC is a property of every endpoint, not a separate module).
