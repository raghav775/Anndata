import { Link } from "react-router-dom"
import { Card } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { usePurchaseOrders } from "../hooks/api"

export function PurchaseOrdersPage() {
  const { data: pos, isLoading, isError } = usePurchaseOrders()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Purchase Orders</h1>
        <p className="text-sm text-ink-500">Contracts issued once an FPO accepts a buyer's offer.</p>
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load purchase orders." />}
        {pos && pos.length === 0 && <EmptyState title="No purchase orders yet" />}
        {pos && pos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">PO Number</th>
                  <th className="pb-2 pr-4">Quantity</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4">Net Price</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-ink-50">
                    <td className="py-2.5 pr-4 font-medium text-ink-800">{po.po_number}</td>
                    <td className="py-2.5 pr-4">{po.quantity_kg} kg</td>
                    <td className="py-2.5 pr-4">{po.contracted_grade}</td>
                    <td className="py-2.5 pr-4">₹{po.net_price_per_kg}/kg</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="py-2.5 text-right">
                      <Link to={`/app/purchase-orders/${po.id}`} className="text-sm font-medium text-primary-700 hover:underline">
                        View
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
