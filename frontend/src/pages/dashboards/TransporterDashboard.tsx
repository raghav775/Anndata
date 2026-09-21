import { useAuth } from "../../context/AuthContext"
import { Card, CardHeader } from "../../components/ui/Card"
import { StatusBadge } from "../../components/ui/Badge"
import { EmptyState } from "../../components/ui/States"
import { Button } from "../../components/ui/Button"
import { useShipments, useInvalidate } from "../../hooks/api"
import { useMutation } from "@tanstack/react-query"
import { api, getApiErrorMessage } from "../../lib/api"
import { useToast } from "../../context/ToastContext"
import type { ShipmentStatus } from "../../types"

const NEXT_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  ASSIGNED: "PICKUP_SCHEDULED",
  PICKUP_SCHEDULED: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "DELIVERED",
}

export function TransporterDashboard() {
  const { user } = useAuth()
  const { data: shipments } = useShipments()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ShipmentStatus }) =>
      (await api.patch(`/shipments/${id}/status`, { status })).data,
    onSuccess: () => {
      invalidate([["shipments"], ["lots"]])
      showToast("Shipment status updated", "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const active = (shipments ?? []).filter((s) => s.status !== "DELIVERED")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-ink-500">Your assigned shipments.</p>
      </div>

      <Card>
        <CardHeader title="Active shipments" />
        {active.length === 0 ? (
          <EmptyState title="No active shipments" description="New assignments will appear here." />
        ) : (
          <div className="space-y-3">
            {active.map((shipment) => {
              const next = NEXT_STATUS[shipment.status]
              return (
                <div key={shipment.id} className="rounded-md border border-ink-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink-800">
                        {shipment.vehicle_number} · {shipment.vehicle_type}
                      </p>
                      <p className="text-xs text-ink-500">
                        {shipment.pickup_point} → {shipment.delivery_point}
                      </p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  {next && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      isLoading={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: shipment.id, status: next })}
                    >
                      Mark as {next.replace(/_/g, " ").toLowerCase()}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
