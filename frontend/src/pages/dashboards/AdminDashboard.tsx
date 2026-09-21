import { ArrowRight, Banknote, Boxes, Gavel, Layers, Percent, ScrollText, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { Card, CardHeader, StatTile } from "../../components/ui/Card"
import { SkeletonCard, ErrorState } from "../../components/ui/States"
import { useAnalytics, useAuditLogs } from "../../hooks/api"

export function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { data: analytics, isLoading, isError } = useAnalytics()
  const { data: recentAudit } = useAuditLogs({})

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("adminDash.welcome", { name: user?.full_name ?? "" })}</h1>
        <p className="text-sm text-ink-500">{t("adminDash.subtitle")}</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorState message={t("adminDash.couldNotLoad")} />}

      {analytics && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile icon={Users} label={t("adminDash.metricFarmers")} value={analytics.total_farmers} tone="primary" />
          <StatTile icon={Layers} label={t("adminDash.metricLots")} value={analytics.total_lots} tone="primary" />
          <StatTile icon={Boxes} label={t("adminDash.metricQuantity")} value={`${analytics.total_quantity_kg.toLocaleString("en-IN")} kg`} tone="accent" />
          <StatTile icon={Banknote} label={t("adminDash.metricTxnValue")} value={`₹${analytics.total_transaction_value.toLocaleString("en-IN")}`} tone="success" />
          <StatTile icon={TrendingUp} label={t("adminDash.metricAvgNet")} value={`₹${analytics.average_net_realization_per_kg}/kg`} tone="primary" />
          <StatTile icon={ScrollText} label={t("adminDash.metricCompletedSettlements")} value={analytics.completed_settlements} tone="success" />
          <StatTile icon={Gavel} label={t("adminDash.metricOpenDisputes")} value={analytics.open_disputes} tone={analytics.open_disputes > 0 ? "danger" : "neutral"} />
          <StatTile icon={Percent} label={t("adminDash.metricFulfillment")} value={`${analytics.buyer_fulfillment_rate}%`} tone="primary" />
        </div>
      )}

      <div className="flex flex-wrap gap-5 text-sm">
        <Link to="/app/analytics" className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline">
          {t("adminDash.fullAnalytics")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link to="/app/audit-log" className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline">
          {t("adminDash.auditLog")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link to="/app/users" className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline">
          {t("adminDash.manageUsers")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <Card>
        <CardHeader title={t("adminDash.recentActivity")} />
        <ul className="space-y-3">
          {(recentAudit ?? []).slice(0, 10).map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink-700">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-ink-300" />
                {entry.action.replace(/_/g, " ").toLowerCase()}
                <span className="text-ink-400"> · {entry.entity_type} #{entry.entity_id}</span>
              </span>
              <span className="whitespace-nowrap text-xs text-ink-400">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </li>
          ))}
          {(!recentAudit || recentAudit.length === 0) && (
            <p className="py-4 text-center text-sm text-ink-400">{t("adminDash.noActivity")}</p>
          )}
        </ul>
      </Card>
    </div>
  )
}
