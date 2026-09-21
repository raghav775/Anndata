import { Printer } from "lucide-react"
import { useParams } from "react-router-dom"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
import { usePurchaseOrder } from "../hooks/api"

export function PurchaseOrderDetailPage() {
  const { poId } = useParams()
  const { t } = useI18n()
  const { data: po, isLoading, isError } = usePurchaseOrder(Number(poId))

  if (isLoading) return <SkeletonCard />
  if (isError || !po) return <ErrorState message={t("poDetail.couldNotLoad")} />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-display text-xl font-bold text-ink-900">{t("poDetail.heading")}</h1>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("poDetail.print")}
        </Button>
      </div>

      <Card className="print:shadow-none print:ring-0">
        <div className="flex items-start justify-between border-b border-ink-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-400">{t("poDetail.heading")}</p>
            <h2 className="font-display text-2xl font-bold text-ink-900">{po.po_number}</h2>
          </div>
          <StatusBadge status={po.status} />
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("poDetail.lot")} value={`#${po.lot_id}`} />
          <Field label={t("poDetail.buyer")} value={`Buyer #${po.buyer_id}`} />
          <Field label={t("poDetail.quantity")} value={`${po.quantity_kg} ${t("common.kg")}`} />
          <Field label={t("poDetail.contractedGrade")} value={po.contracted_grade} />
          <Field label={t("poDetail.grossPrice")} value={`₹${po.gross_price_per_kg}/kg`} />
          <Field label={t("poDetail.netPrice")} value={`₹${po.net_price_per_kg}/kg`} highlight />
          <Field label={t("poDetail.deliveryLocation")} value={po.delivery_location} />
          <Field label={t("poDetail.paymentDeadline")} value={t("poDetail.daysLabel", { n: po.payment_deadline_days })} />
          <Field label={t("poDetail.inspectionDeadline")} value={t("poDetail.daysLabel", { n: po.inspection_deadline_days })} />
          <Field label={t("poDetail.transportResponsibility")} value={po.transport_responsibility} />
          <Field label={t("poDetail.storageResponsibility")} value={po.storage_responsibility} />
          <Field label={t("poDetail.rejectBelowGrade")} value={po.reject_below_grade} />
        </dl>

        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-700">{t("poDetail.toleranceTitle")}</p>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <th className="pb-1 pr-4">{t("poDetail.colGrade")}</th>
                <th className="pb-1 pr-4">{t("poDetail.colMultiplier")}</th>
                <th className="pb-1">{t("poDetail.colNote")}</th>
              </tr>
            </thead>
            <tbody>
              {po.tolerance_rules.map((rule, i) => (
                <tr key={i} className="border-b border-ink-50 last:border-0">
                  <td className="py-1.5 pr-4"><Badge tone="info">{rule.grade}</Badge></td>
                  <td className="py-1.5 pr-4">{(rule.price_multiplier * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-ink-500">{rule.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-400">
            {t("poDetail.contaminationNote", { state: po.contamination_auto_reject ? t("poDetail.enabled") : t("poDetail.disabled") })}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-700">{t("poDetail.disputeTitle")}</p>
          <p className="mt-1 text-sm text-ink-600">{po.dispute_procedure}</p>
        </div>
      </Card>
    </div>
  )
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className={`mt-0.5 text-sm ${highlight ? "font-display text-lg font-bold text-primary-700" : "text-ink-800"}`}>{value}</dd>
    </div>
  )
}
