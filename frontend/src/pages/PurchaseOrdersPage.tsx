import { ArrowRight, FileText } from "lucide-react"
import { Link } from "react-router-dom"
import { Card } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
import { usePurchaseOrders } from "../hooks/api"

export function PurchaseOrdersPage() {
  const { t } = useI18n()
  const { data: pos, isLoading, isError } = usePurchaseOrders()

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("po.title")}</h1>
        <p className="text-sm text-ink-500">{t("po.subtitle")}</p>
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("po.couldNotLoad")} />}
        {pos && pos.length === 0 && <EmptyState icon={FileText} title={t("po.noOrders")} />}
        {pos && pos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("po.colNumber")}</th>
                  <th className="pb-2 pr-4">{t("po.colQuantity")}</th>
                  <th className="pb-2 pr-4">{t("po.colGrade")}</th>
                  <th className="pb-2 pr-4">{t("po.colNetPrice")}</th>
                  <th className="pb-2 pr-4">{t("po.colStatus")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink-800">{po.po_number}</td>
                    <td className="py-3 pr-4">{po.quantity_kg} {t("common.kg")}</td>
                    <td className="py-3 pr-4">{po.contracted_grade}</td>
                    <td className="py-3 pr-4">₹{po.net_price_per_kg}/kg</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="py-3 text-right">
                      <Link to={`/app/purchase-orders/${po.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
                        {t("common.view")} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
