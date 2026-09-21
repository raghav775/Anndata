import { useMutation } from "@tanstack/react-query"
import { Radio, RadioReceiver, Warehouse } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { MiniLineChart } from "../components/storage/MiniLineChart"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { useInvalidate, useStorageEvents, useStorageFacilities } from "../hooks/api"
import { useStorageSocket } from "../hooks/useStorageSocket"
import { api, getApiErrorMessage } from "../lib/api"

export function StoragePage() {
  const { t } = useI18n()
  const { data: facilities, isLoading, isError } = useStorageFacilities()
  const [selectedIdOverride, setSelectedIdOverride] = useState<number | undefined>(undefined)
  const selectedId = selectedIdOverride ?? facilities?.[0]?.id

  if (isLoading) return <SkeletonCard />
  if (isError) return <ErrorState message={t("common.somethingWrong")} />

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("storage.title")}</h1>
        <p className="text-sm text-ink-500">{t("storage.subtitle")}</p>
      </div>

      {facilities && facilities.length === 0 && <EmptyState icon={Warehouse} title={t("storage.noFacilities")} />}

      {facilities && facilities.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader title={t("storage.facilities")} />
            <div className="space-y-2">
              {facilities.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedIdOverride(f.id)}
                  className={`focus-ring block w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedId === f.id ? "border-primary-300 bg-primary-50" : "border-ink-100 hover:bg-ink-50"
                  }`}
                >
                  <p className="font-medium text-ink-800">{f.name}</p>
                  <p className="text-xs text-ink-500">
                    {f.available_capacity_kg.toLocaleString("en-IN")} / {f.total_capacity_kg.toLocaleString("en-IN")} {t("common.kg")} {t("storage.available")}
                  </p>
                  <p className="text-xs text-ink-400">{t("storage.operatedBy", { name: f.operator_name })}</p>
                </button>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2">{selectedId && <FacilityMonitor facilityId={selectedId} />}</div>
        </div>
      )}
    </div>
  )
}

function FacilityMonitor({ facilityId }: { facilityId: number }) {
  const { t } = useI18n()
  const { data: history } = useStorageEvents(facilityId)
  const { latest, connected } = useStorageSocket(facilityId)
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const simulate = useMutation({
    mutationFn: async () => (await api.post(`/storage/${facilityId}/events/simulate`)).data,
    onSuccess: () => {
      invalidate([["storage-events", facilityId]])
      showToast(t("lotDetail.updatedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const current = latest ?? history?.[0]

  const series = useMemo(() => {
    const base = [...(history ?? [])].reverse()
    const combined = latest ? [...base, latest] : base
    return combined.slice(-20).map((e) => ({
      time: new Date(e.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temperature: e.temperature_celsius,
      humidity: e.humidity_percent,
    }))
  }, [history, latest])

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {connected ? <Radio className="h-4 w-4 text-emerald-500" /> : <RadioReceiver className="h-4 w-4 text-ink-300" />}
            <span className="text-xs text-ink-500">{connected ? t("storage.liveConnected") : t("storage.liveInactive")}</span>
          </div>
          <Button size="sm" variant="secondary" isLoading={simulate.isPending} onClick={() => simulate.mutate()}>
            {t("storage.simulateButton")}
          </Button>
        </div>

        {current ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label={t("storage.temperature")} value={`${current.temperature_celsius}°C`} />
            <Stat label={t("storage.humidity")} value={`${current.humidity_percent}%`} />
            <Stat label={t("storage.occupancy")} value={`${current.occupancy_percent}%`} />
            <div>
              <p className="text-xs text-ink-500">{t("common.status")}</p>
              <div className="mt-1">
                <StatusBadge status={current.status} />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-400">{t("storage.noReadings")}</p>
        )}
      </Card>

      {series.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniLineChart
            data={series.map((s) => ({ time: s.time, value: s.temperature }))}
            color="#2a78d6"
            unit="°C"
            label={t("storage.temperature")}
          />
          <MiniLineChart
            data={series.map((s) => ({ time: s.time, value: s.humidity }))}
            color="#eb6834"
            unit="%"
            label={t("storage.humidity")}
          />
        </div>
      )}

      <Badge tone="warning">{t("storage.simulatedBadge")}</Badge>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="font-display text-lg font-bold text-ink-900">{value}</p>
    </div>
  )
}
