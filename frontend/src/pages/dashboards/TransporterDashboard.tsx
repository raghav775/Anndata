import { useMutation } from "@tanstack/react-query"
import { Truck } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { Card, CardHeader } from "../../components/ui/Card"
import { StatusBadge } from "../../components/ui/Badge"
import { EmptyState } from "../../components/ui/States"
import { Button } from "../../components/ui/Button"
import { useShipments, useInvalidate } from "../../hooks/api"
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
  const { t, tStatus } = useI18n()
  const { data: shipments } = useShipments()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ShipmentStatus }) =>
      (await api.patch(`/shipments/${id}/status`, { status })).data,
    onSuccess: () => {
      invalidate([["shipments"], ["lots"]])
      showToast(t("shipments.updatedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const active = (shipments ?? []).filter((s) => s.status !== "DELIVERED")

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("transporterDash.welcome", { name: user?.full_name ?? "" })}</h1>
        <p className="text-sm text-ink-500">{t("transporterDash.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("transporterDash.activeShipments")} />
        {active.length === 0 ? (
          <EmptyState icon={Truck} title={t("transporterDash.noActive")} description={t("transporterDash.noActiveDesc")} />
        ) : (
          <div className="space-y-3">
            {active.map((shipment) => {
              const next = NEXT_STATUS[shipment.status]
              return (
                <div key={shipment.id} className="rounded-lg border border-ink-100 p-3.5">
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
                      {t("transporterDash.markAs", { status: tStatus(next) })}
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
