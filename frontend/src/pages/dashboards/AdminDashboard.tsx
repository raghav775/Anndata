import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Card, CardHeader } from "../../components/ui/Card"
import { SkeletonCard, ErrorState } from "../../components/ui/States"
import { useAnalytics, useAuditLogs } from "../../hooks/api"

export function AdminDashboard() {
  const { user } = useAuth()
  const { data: analytics, isLoading, isError } = useAnalytics()
  const { data: recentAudit } = useAuditLogs({})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-ink-500">Platform-wide overview.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorState message="Could not load analytics." />}

      {analytics && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Total farmers" value={analytics.total_farmers} />
          <Metric label="Total lots" value={analytics.total_lots} />
          <Metric label="Total quantity" value={`${analytics.total_quantity_kg.toLocaleString("en-IN")} kg`} />
          <Metric label="Total transaction value" value={`₹${analytics.total_transaction_value.toLocaleString("en-IN")}`} />
          <Metric label="Avg. net realization" value={`₹${analytics.average_net_realization_per_kg}/kg`} />
          <Metric label="Completed settlements" value={analytics.completed_settlements} />
          <Metric label="Open disputes" value={analytics.open_disputes} tone={analytics.open_disputes > 0 ? "danger" : undefined} />
          <Metric label="Buyer fulfillment rate" value={`${analytics.buyer_fulfillment_rate}%`} />
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/app/analytics" className="font-medium text-primary-700 hover:underline">
          Full analytics →
        </Link>
        <Link to="/app/audit-log" className="font-medium text-primary-700 hover:underline">
          Audit log →
        </Link>
        <Link to="/app/users" className="font-medium text-primary-700 hover:underline">
          Manage users →
        </Link>
      </div>

      <Card>
        <CardHeader title="Recent audit activity" />
        <ul className="space-y-3">
          {(recentAudit ?? []).slice(0, 10).map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 text-sm">
              <span className="text-ink-700">
                {entry.action.replace(/_/g, " ").toLowerCase()}
                <span className="text-ink-400"> · {entry.entity_type} #{entry.entity_id}</span>
              </span>
              <span className="whitespace-nowrap text-xs text-ink-400">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </li>
          ))}
          {(!recentAudit || recentAudit.length === 0) && (
            <p className="py-4 text-center text-sm text-ink-400">No activity recorded yet.</p>
          )}
        </ul>
      </Card>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "danger" }) {
  return (
    <Card>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "danger" ? "text-red-700" : "text-ink-900"}`}>{value}</p>
    </Card>
  )
}
