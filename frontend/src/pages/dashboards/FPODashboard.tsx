import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Card, CardHeader } from "../../components/ui/Card"
import { SkeletonCard, ErrorState, EmptyState } from "../../components/ui/States"
import { StatusBadge } from "../../components/ui/Badge"
import { api } from "../../lib/api"
import { useFPODashboard, useLots } from "../../hooks/api"

const ACTION_NEEDED_STATUSES = new Set([
  "COLLECTED",
  "UNDER_ASSESSMENT",
  "ASSESSED",
  "OFFER_ACCEPTED",
  "PURCHASE_ORDER_CREATED",
  "DISPUTED",
])

export function FPODashboard() {
  const { user } = useAuth()

  const { data: fpos } = useQuery({
    queryKey: ["fpos"],
    queryFn: async () => (await api.get("/fpos")).data as { id: number }[],
  })
  const fpoId = fpos?.[0]?.id

  const { data: dashboard, isLoading, isError } = useFPODashboard(fpoId)
  const { data: lots } = useLots()

  const needsAttention = (lots ?? []).filter((lot) => ACTION_NEEDED_STATUSES.has(lot.status))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">FPO Operations Dashboard</h1>
        <p className="text-sm text-ink-500">Welcome, {user?.full_name}. Niphad Onion FPO overview.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorState message="Could not load the FPO dashboard." />}

      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Total farmers" value={dashboard.total_farmers} />
          <Metric label="Total produce" value={`${dashboard.total_produce_kg.toLocaleString("en-IN")} kg`} />
          <Metric label="Active lots" value={dashboard.active_lots} />
          <Metric
            label="Pending assessment"
            value={dashboard.pending_assessment}
            tone={dashboard.pending_assessment > 0 ? "warning" : undefined}
          />
          <Metric label="Active offers" value={dashboard.active_offers} />
          <Metric label="Accepted orders" value={dashboard.accepted_orders} />
          <Metric label="Active shipments" value={dashboard.active_shipments} />
          <Metric
            label="Pending payments"
            value={dashboard.pending_payments}
            tone={dashboard.pending_payments > 0 ? "warning" : undefined}
          />
          <Metric
            label="Open disputes"
            value={dashboard.open_disputes}
            tone={dashboard.open_disputes > 0 ? "danger" : undefined}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Lots needing your action"
            subtitle="Awaiting screening, assessment, offer decisions, or dispatch"
          />
          <div className="space-y-2">
            {needsAttention.slice(0, 8).map((lot) => (
              <Link
                key={lot.id}
                to={`/app/lots/${lot.id}`}
                className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{lot.lot_code}</p>
                  <p className="text-xs text-ink-400">
                    {lot.total_quantity_kg} kg · {lot.village_origin}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </Link>
            ))}
            {needsAttention.length === 0 && (
              <EmptyState title="Nothing needs action" description="All lots are progressing normally." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="All lots"
            action={
              <Link to="/app/lots" className="text-sm font-medium text-primary-700 hover:underline">
                View all
              </Link>
            }
          />
          <div className="space-y-2">
            {(lots ?? []).slice(0, 8).map((lot) => (
              <Link
                key={lot.id}
                to={`/app/lots/${lot.id}`}
                className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{lot.lot_code}</p>
                  <p className="text-xs text-ink-400">
                    {lot.total_quantity_kg} kg · {lot.village_origin}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </Link>
            ))}
            {lots?.length === 0 && <EmptyState title="No lots yet" description="Create your first lot to get started." />}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "warning" | "danger" }) {
  const toneClass = tone === "warning" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "text-ink-900"
  return (
    <Card>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </Card>
  )
}
