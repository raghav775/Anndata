import { ArrowRight, FileText, ShoppingBag, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { Card, CardHeader, StatTile } from "../../components/ui/Card"
import { StatusBadge } from "../../components/ui/Badge"
import { EmptyState } from "../../components/ui/States"
import { Button } from "../../components/ui/Button"
import { usePurchaseOrders, usePayments } from "../../hooks/api"

export function BuyerDashboard() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { data: pos } = usePurchaseOrders()
  const { data: payments } = usePayments()

  const pendingPayments = (payments ?? []).filter((p) => p.status !== "PAYMENT_COMPLETED")

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{t("buyerDash.welcome", { name: user?.full_name ?? "" })}</h1>
          <p className="text-sm text-ink-500">{t("buyerDash.subtitle")}</p>
        </div>
        <Link to="/app/marketplace">
          <Button>{t("buyerDash.browseButton")}</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={FileText} label={t("buyerDash.purchaseOrders")} value={pos?.length ?? "—"} tone="primary" />
        <StatTile icon={ShoppingBag} label={t("buyerDash.pendingPayments")} value={pendingPayments.length} tone={pendingPayments.length > 0 ? "warning" : "neutral"} />
        <StatTile
          icon={Wallet}
          label={t("buyerDash.totalPaid")}
          value={`₹${(payments ?? []).reduce((s, p) => s + p.amount_received, 0).toLocaleString("en-IN")}`}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader
          title={t("buyerDash.yourOrders")}
          action={
            <Link to="/app/purchase-orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
              {t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {(pos ?? []).length === 0 ? (
          <EmptyState title={t("buyerDash.noOrders")} description={t("buyerDash.noOrdersDesc")} />
        ) : (
          <div className="space-y-2">
            {pos!.slice(0, 6).map((po) => (
              <Link
                key={po.id}
                to={`/app/purchase-orders/${po.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm transition-colors hover:border-primary-200 hover:bg-primary-50"
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
