import { CheckCircle2, ClipboardCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { Card, CardHeader, StatTile } from "../../components/ui/Card"
import { StatusBadge } from "../../components/ui/Badge"
import { EmptyState } from "../../components/ui/States"
import { useLots } from "../../hooks/api"

export function AssayerDashboard() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { data: lots } = useLots()

  const pending = (lots ?? []).filter((lot) => lot.status === "UNDER_ASSESSMENT")
  const completed = (lots ?? []).filter((lot) => lot.status !== "UNDER_ASSESSMENT" && lot.status !== "COLLECTED")

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("assayerDash.welcome", { name: user?.full_name ?? "" })}</h1>
        <p className="text-sm text-ink-500">{t("assayerDash.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile icon={ClipboardCheck} label={t("assayerDash.pending")} value={pending.length} tone={pending.length > 0 ? "warning" : "neutral"} />
        <StatTile icon={CheckCircle2} label={t("assayerDash.assessedLots")} value={completed.length} tone="success" />
      </div>

      <Card>
        <CardHeader title={t("assayerDash.awaiting")} subtitle={t("assayerDash.awaitingDesc")} />
        {pending.length === 0 ? (
          <EmptyState title={t("assayerDash.nothingPending")} description={t("assayerDash.nothingPendingDesc")} />
        ) : (
          <div className="space-y-2">
            {pending.map((lot) => (
              <Link
                key={lot.id}
                to={`/app/lots/${lot.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{lot.lot_code}</p>
                  <p className="text-xs text-ink-400">
                    {lot.total_quantity_kg} {t("common.kg")} · {t("assayerDash.preliminary")}: {lot.preliminary_grade ?? "—"}
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
