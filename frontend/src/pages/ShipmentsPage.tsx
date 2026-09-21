import { useMutation } from "@tanstack/react-query"
import { Card } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useInvalidate, useShipments } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"
import type { ShipmentStatus } from "../types"

const NEXT_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  ASSIGNED: "PICKUP_SCHEDULED",
  PICKUP_SCHEDULED: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "DELIVERED",
}

export function ShipmentsPage() {
  const { user } = useAuth()
  const { data: shipments, isLoading, isError } = useShipments()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ShipmentStatus }) =>
      (await api.patch(`/shipments/${id}/status`, { status })).data,
    onSuccess: () => {
      invalidate([["shipments"], ["lots"]])
      showToast("Shipment updated", "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Shipments</h1>
        <p className="text-sm text-ink-500">Transporter assignments and delivery tracking.</p>
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load shipments." />}
        {shipments && shipments.length === 0 && <EmptyState title="No shipments yet" />}
        {shipments && shipments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">Vehicle</th>
                  <th className="pb-2 pr-4">Route</th>
                  <th className="pb-2 pr-4">Status</th>
                  {user?.role === "TRANSPORTER" && <th className="pb-2" />}
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => {
                  const next = NEXT_STATUS[s.status]
                  return (
                    <tr key={s.id} className="border-b border-ink-50">
                      <td className="py-2.5 pr-4 font-medium text-ink-800">{s.vehicle_number}</td>
                      <td className="py-2.5 pr-4 text-ink-600">{s.pickup_point} → {s.delivery_point}</td>
                      <td className="py-2.5 pr-4"><StatusBadge status={s.status} /></td>
                      {user?.role === "TRANSPORTER" && (
                        <td className="py-2.5 text-right">
                          {next && (
                            <Button size="sm" variant="secondary" isLoading={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: s.id, status: next })}>
                              Mark {next.replace(/_/g, " ").toLowerCase()}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
