import { useParams } from "react-router-dom"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { usePurchaseOrder } from "../hooks/api"

export function PurchaseOrderDetailPage() {
  const { poId } = useParams()
  const { data: po, isLoading, isError } = usePurchaseOrder(Number(poId))

  if (isLoading) return <SkeletonCard />
  if (isError || !po) return <ErrorState message="Could not load this purchase order." />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold text-ink-900">Purchase Order</h1>
        <Button variant="secondary" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <Card className="print:shadow-none print:ring-0">
        <div className="flex items-start justify-between border-b border-ink-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-400">Purchase Order</p>
            <h2 className="text-2xl font-bold text-ink-900">{po.po_number}</h2>
          </div>
          <StatusBadge status={po.status} />
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Lot" value={`#${po.lot_id}`} />
          <Field label="Buyer" value={`Buyer #${po.buyer_id}`} />
          <Field label="Quantity" value={`${po.quantity_kg} kg`} />
          <Field label="Contracted grade" value={po.contracted_grade} />
          <Field label="Gross price" value={`₹${po.gross_price_per_kg}/kg`} />
          <Field label="Net realizable price" value={`₹${po.net_price_per_kg}/kg`} highlight />
          <Field label="Delivery location" value={po.delivery_location} />
          <Field label="Payment deadline" value={`${po.payment_deadline_days} days`} />
          <Field label="Inspection deadline" value={`${po.inspection_deadline_days} days`} />
          <Field label="Transport responsibility" value={po.transport_responsibility} />
          <Field label="Storage responsibility" value={po.storage_responsibility} />
          <Field label="Reject below grade" value={po.reject_below_grade} />
        </dl>

        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-700">Quality tolerance / step-down pricing</p>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                <th className="pb-1 pr-4">Grade</th>
                <th className="pb-1 pr-4">Price multiplier</th>
                <th className="pb-1">Note</th>
              </tr>
            </thead>
            <tbody>
              {po.tolerance_rules.map((rule, i) => (
                <tr key={i} className="border-b border-ink-50">
                  <td className="py-1.5 pr-4"><Badge tone="info">{rule.grade}</Badge></td>
                  <td className="py-1.5 pr-4">{(rule.price_multiplier * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-ink-500">{rule.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-400">
            Contamination/safety issues trigger a mandatory hold: {po.contamination_auto_reject ? "enabled" : "disabled"}.
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-700">Dispute procedure</p>
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
      <dd className={`mt-0.5 text-sm ${highlight ? "text-lg font-semibold text-primary-700" : "text-ink-800"}`}>{value}</dd>
    </div>
  )
}
