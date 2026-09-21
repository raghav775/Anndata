import { Card, CardHeader } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useAnalytics, useLots } from "../hooks/api"
import type { LotStatus } from "../types"

const STATUS_ORDER: LotStatus[] = [
  "DRAFT",
  "COLLECTED",
  "UNDER_ASSESSMENT",
  "ASSESSED",
  "OPEN_FOR_OFFERS",
  "OFFER_ACCEPTED",
  "PURCHASE_ORDER_CREATED",
  "DISPATCHED",
  "DELIVERED",
  "SETTLED",
  "DISPUTED",
  "CLOSED",
]

export function AnalyticsPage() {
  const { data: analytics, isLoading, isError } = useAnalytics()
  const { data: lots } = useLots()

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: (lots ?? []).filter((l) => l.status === status).length,
  })).filter((row) => row.count > 0)
  const maxCount = Math.max(1, ...statusCounts.map((r) => r.count))

  if (isLoading) return <SkeletonCard />
  if (isError || !analytics) return <ErrorState message="Could not load analytics." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Analytics</h1>
        <p className="text-sm text-ink-500">Platform-wide metrics computed from live transaction data.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Total farmers" value={analytics.total_farmers} />
        <Metric label="Total lots" value={analytics.total_lots} />
        <Metric label="Total quantity" value={`${analytics.total_quantity_kg.toLocaleString("en-IN")} kg`} />
        <Metric label="Total transaction value" value={`₹${analytics.total_transaction_value.toLocaleString("en-IN")}`} />
        <Metric label="Avg. net realization" value={`₹${analytics.average_net_realization_per_kg}/kg`} />
        <Metric label="Pending settlements" value={analytics.pending_settlements} />
        <Metric label="Completed settlements" value={analytics.completed_settlements} />
        <Metric label="Total disputes" value={analytics.total_disputes} />
        <Metric label="Open disputes" value={analytics.open_disputes} />
        <Metric
          label="Avg. dispute resolution"
          value={analytics.average_dispute_resolution_hours != null ? `${analytics.average_dispute_resolution_hours} hrs` : "—"}
        />
        <Metric label="Buyer fulfillment rate" value={`${analytics.buyer_fulfillment_rate}%`} />
        <Metric label="Active shipments" value={analytics.active_shipments} />
      </div>

      <Card>
        <CardHeader title="Lots by status" subtitle="Current distribution across the workflow" />
        {statusCounts.length === 0 ? (
          <p className="text-sm text-ink-400">No lots yet.</p>
        ) : (
          <div className="space-y-2">
            {statusCounts.map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-44 flex-shrink-0 text-xs text-ink-500">{row.status.replace(/_/g, " ")}</span>
                <div className="h-3 flex-1 rounded-full bg-ink-100">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: `${(row.count / maxCount) * 100}%`, backgroundColor: "#2a78d6" }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-medium text-ink-700">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink-900">{value}</p>
    </Card>
  )
}
