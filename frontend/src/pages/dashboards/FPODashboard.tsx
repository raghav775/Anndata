import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  ClipboardCheck,
  Gavel,
  Handshake,
  Layers,
  ScrollText,
  Truck,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { Card, CardHeader, StatTile } from "../../components/ui/Card"
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
  const { t } = useI18n()

  const { data: fpos } = useQuery({
    queryKey: ["fpos"],
    queryFn: async () => (await api.get("/fpos")).data as { id: number; name: string }[],
  })
  const fpo = fpos?.[0]

  const { data: dashboard, isLoading, isError } = useFPODashboard(fpo?.id)
  const { data: lots } = useLots()

  const needsAttention = (lots ?? []).filter((lot) => ACTION_NEEDED_STATUSES.has(lot.status))

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("fpoDash.title")}</h1>
        <p className="text-sm text-ink-500">{t("fpoDash.welcome", { name: user?.full_name ?? "", fpo: fpo?.name ?? "" })}</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorState message={t("fpoDash.couldNotLoad")} />}

      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile icon={Users} label={t("fpoDash.metricFarmers")} value={dashboard.total_farmers} tone="primary" />
          <StatTile icon={Boxes} label={t("fpoDash.metricProduce")} value={`${dashboard.total_produce_kg.toLocaleString("en-IN")} kg`} tone="accent" />
          <StatTile icon={Layers} label={t("fpoDash.metricActiveLots")} value={dashboard.active_lots} tone="primary" />
          <StatTile
            icon={ClipboardCheck}
            label={t("fpoDash.metricPendingAssessment")}
            value={dashboard.pending_assessment}
            tone={dashboard.pending_assessment > 0 ? "warning" : "neutral"}
          />
          <StatTile icon={Handshake} label={t("fpoDash.metricActiveOffers")} value={dashboard.active_offers} tone="primary" />
          <StatTile icon={ScrollText} label={t("fpoDash.metricAcceptedOrders")} value={dashboard.accepted_orders} tone="primary" />
          <StatTile icon={Truck} label={t("fpoDash.metricActiveShipments")} value={dashboard.active_shipments} tone="primary" />
          <StatTile
            icon={Banknote}
            label={t("fpoDash.metricPendingPayments")}
            value={dashboard.pending_payments}
            tone={dashboard.pending_payments > 0 ? "warning" : "neutral"}
          />
          <StatTile
            icon={Gavel}
            label={t("fpoDash.metricOpenDisputes")}
            value={dashboard.open_disputes}
            tone={dashboard.open_disputes > 0 ? "danger" : "neutral"}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("fpoDash.needsAction")} subtitle={t("fpoDash.needsActionDesc")} />
          <div className="space-y-2">
            {needsAttention.slice(0, 8).map((lot) => (
              <Link
                key={lot.id}
                to={`/app/lots/${lot.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{lot.lot_code}</p>
                  <p className="text-xs text-ink-400">
                    {lot.total_quantity_kg} {t("common.kg")} · {lot.village_origin}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </Link>
            ))}
            {needsAttention.length === 0 && (
              <EmptyState icon={AlertTriangle} title={t("fpoDash.nothingNeeded")} description={t("fpoDash.nothingNeededDesc")} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("fpoDash.allLots")}
            action={
              <Link to="/app/lots" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
                {t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="space-y-2">
            {(lots ?? []).slice(0, 8).map((lot) => (
              <Link
                key={lot.id}
                to={`/app/lots/${lot.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{lot.lot_code}</p>
                  <p className="text-xs text-ink-400">
                    {lot.total_quantity_kg} {t("common.kg")} · {lot.village_origin}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </Link>
            ))}
            {lots?.length === 0 && <EmptyState title={t("fpoDash.noLotsYet")} description={t("fpoDash.noLotsYetDesc")} />}
          </div>
        </Card>
      </div>
    </div>
  )
}
