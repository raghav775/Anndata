import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Card, CardHeader } from "../../components/ui/Card"
import { StatusBadge } from "../../components/ui/Badge"
import { EmptyState } from "../../components/ui/States"
import { useLots } from "../../hooks/api"

export function AssayerDashboard() {
  const { user } = useAuth()
  const { data: lots } = useLots()

  const pending = (lots ?? []).filter((lot) => lot.status === "UNDER_ASSESSMENT")
  const completed = (lots ?? []).filter((lot) => lot.status !== "UNDER_ASSESSMENT" && lot.status !== "COLLECTED")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-ink-500">Physical quality assessment queue.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-ink-500">Pending assessment</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{pending.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-500">Assessed lots</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{completed.length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Lots awaiting physical assessment" subtitle="Preliminary screening has run; a physical assessment is required" />
        {pending.length === 0 ? (
          <EmptyState title="Nothing pending" description="All screened lots have a finalized assessment." />
        ) : (
          <div className="space-y-2">
            {pending.map((lot) => (
              <Link
                key={lot.id}
                to={`/app/lots/${lot.id}`}
                className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{lot.lot_code}</p>
                  <p className="text-xs text-ink-400">
                    {lot.total_quantity_kg} kg · Preliminary: {lot.preliminary_grade ?? "—"}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
