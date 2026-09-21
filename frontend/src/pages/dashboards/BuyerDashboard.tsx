import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Card, CardHeader } from "../../components/ui/Card"
import { StatusBadge } from "../../components/ui/Badge"
import { EmptyState } from "../../components/ui/States"
import { Button } from "../../components/ui/Button"
import { usePurchaseOrders, usePayments } from "../../hooks/api"

export function BuyerDashboard() {
  const { user } = useAuth()
  const { data: pos } = usePurchaseOrders()
  const { data: payments } = usePayments()

  const pendingPayments = (payments ?? []).filter((p) => p.status !== "PAYMENT_COMPLETED")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Welcome, {user?.full_name}</h1>
          <p className="text-sm text-ink-500">Your purchase orders and pending payments.</p>
        </div>
        <Link to="/app/marketplace">
          <Button>Browse lots &amp; submit offers</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-ink-500">Purchase orders</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{pos?.length ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-500">Pending payments</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{pendingPayments.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-500">Total paid</p>
          <p className="mt-1 text-2xl font-semibold text-primary-700">
            ₹{(payments ?? []).reduce((s, p) => s + p.amount_received, 0).toLocaleString("en-IN")}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Your purchase orders"
          action={
            <Link to="/app/purchase-orders" className="text-sm font-medium text-primary-700 hover:underline">
              View all
            </Link>
          }
        />
        {(pos ?? []).length === 0 ? (
          <EmptyState title="No purchase orders yet" description="Submit an offer on a lot in the marketplace to get started." />
        ) : (
          <div className="space-y-2">
            {pos!.slice(0, 6).map((po) => (
              <Link
                key={po.id}
                to={`/app/purchase-orders/${po.id}`}
                className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{po.po_number}</p>
                  <p className="text-xs text-ink-400">₹{po.net_price_per_kg}/kg net · {po.quantity_kg} kg</p>
                </div>
                <StatusBadge status={po.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
