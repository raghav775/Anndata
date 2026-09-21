import {
  Banknote,
  Boxes,
  Gavel,
  Hourglass,
  Layers,
  Percent,
  ScrollText,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react"
import { Card, CardHeader, StatTile } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
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
  const { t, tStatus } = useI18n()
  const { data: analytics, isLoading, isError } = useAnalytics()
  const { data: lots } = useLots()

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: (lots ?? []).filter((l) => l.status === status).length,
  })).filter((row) => row.count > 0)
  const maxCount = Math.max(1, ...statusCounts.map((r) => r.count))

  if (isLoading) return <SkeletonCard />
  if (isError || !analytics) return <ErrorState message={t("analytics.couldNotLoad")} />

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("analytics.title")}</h1>
        <p className="text-sm text-ink-500">{t("analytics.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile icon={Users} label={t("analytics.metricFarmers")} value={analytics.total_farmers} tone="primary" />
        <StatTile icon={Layers} label={t("analytics.metricLots")} value={analytics.total_lots} tone="primary" />
        <StatTile icon={Boxes} label={t("analytics.metricQuantity")} value={`${analytics.total_quantity_kg.toLocaleString("en-IN")} kg`} tone="accent" />
        <StatTile icon={Banknote} label={t("analytics.metricTxnValue")} value={`₹${analytics.total_transaction_value.toLocaleString("en-IN")}`} tone="success" />
        <StatTile icon={TrendingUp} label={t("analytics.metricAvgNet")} value={`₹${analytics.average_net_realization_per_kg}/kg`} tone="primary" />
        <StatTile icon={ScrollText} label={t("analytics.metricPendingSettlements")} value={analytics.pending_settlements} tone="warning" />
        <StatTile icon={ScrollText} label={t("analytics.metricCompletedSettlements")} value={analytics.completed_settlements} tone="success" />
        <StatTile icon={Gavel} label={t("analytics.metricTotalDisputes")} value={analytics.total_disputes} tone="neutral" />
        <StatTile icon={Gavel} label={t("analytics.metricOpenDisputes")} value={analytics.open_disputes} tone={analytics.open_disputes > 0 ? "danger" : "neutral"} />
        <StatTile
          icon={Hourglass}
          label={t("analytics.metricAvgResolution")}
          value={analytics.average_dispute_resolution_hours != null ? `${analytics.average_dispute_resolution_hours} ${t("analytics.hrs")}` : "—"}
          tone="neutral"
        />
        <StatTile icon={Percent} label={t("analytics.metricFulfillment")} value={`${analytics.buyer_fulfillment_rate}%`} tone="primary" />
        <StatTile icon={Truck} label={t("analytics.metricActiveShipments")} value={analytics.active_shipments} tone="primary" />
      </div>

      <Card>
        <CardHeader title={t("analytics.lotsByStatus")} subtitle={t("analytics.lotsByStatusDesc")} />
        {statusCounts.length === 0 ? (
          <p className="text-sm text-ink-400">{t("analytics.noLotsYet")}</p>
        ) : (
          <div className="space-y-2.5">
            {statusCounts.map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-40 flex-shrink-0 truncate text-xs text-ink-500">{tStatus(row.status)}</span>
                <div className="h-3 flex-1 rounded-full bg-ink-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
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
