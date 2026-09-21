import { useMutation } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { MiniLineChart } from "../components/storage/MiniLineChart"
import { useToast } from "../context/ToastContext"
import { useInvalidate, useStorageEvents, useStorageFacilities } from "../hooks/api"
import { useStorageSocket } from "../hooks/useStorageSocket"
import { api, getApiErrorMessage } from "../lib/api"

export function StoragePage() {
  const { data: facilities, isLoading, isError } = useStorageFacilities()
  const [selectedIdOverride, setSelectedIdOverride] = useState<number | undefined>(undefined)
  const selectedId = selectedIdOverride ?? facilities?.[0]?.id

  if (isLoading) return <SkeletonCard />
  if (isError) return <ErrorState message="Could not load storage facilities." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Storage &amp; IoT Monitoring</h1>
        <p className="text-sm text-ink-500">
          Coordinated third-party storage facilities. Sensor readings are simulated for demonstration and do not
          certify shelf life or food safety.
        </p>
      </div>

      {facilities && facilities.length === 0 && <EmptyState title="No storage facilities configured" />}

      {facilities && facilities.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader title="Facilities" />
            <div className="space-y-2">
              {facilities.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedIdOverride(f.id)}
                  className={`focus-ring block w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedId === f.id ? "border-primary-400 bg-primary-50" : "border-ink-100 hover:bg-ink-50"
                  }`}
                >
                  <p className="font-medium text-ink-800">{f.name}</p>
                  <p className="text-xs text-ink-500">
                    {f.available_capacity_kg.toLocaleString("en-IN")} / {f.total_capacity_kg.toLocaleString("en-IN")} kg available
                  </p>
                  <p className="text-xs text-ink-400">Operated by {f.operator_name} (not AnnData)</p>
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
  const { data: history } = useStorageEvents(facilityId)
  const { latest, connected } = useStorageSocket(facilityId)
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const simulate = useMutation({
    mutationFn: async () => (await api.post(`/storage/${facilityId}/events/simulate`)).data,
    onSuccess: () => {
      invalidate([["storage-events", facilityId]])
      showToast("Simulated reading generated", "success")
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
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-ink-300"}`} />
            <span className="text-xs text-ink-500">{connected ? "Live stream connected" : "Live stream inactive — showing last known reading"}</span>
          </div>
          <Button size="sm" variant="secondary" isLoading={simulate.isPending} onClick={() => simulate.mutate()}>
            Simulate a reading
          </Button>
        </div>

        {current ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Temperature" value={`${current.temperature_celsius}°C`} />
            <Stat label="Humidity" value={`${current.humidity_percent}%`} />
            <Stat label="Occupancy" value={`${current.occupancy_percent}%`} />
            <div>
              <p className="text-xs text-ink-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={current.status} />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-400">No readings yet — click "Simulate a reading" to generate one.</p>
        )}
      </Card>

      {series.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniLineChart
            data={series.map((s) => ({ time: s.time, value: s.temperature }))}
            color="#2a78d6"
            unit="°C"
            label="Temperature"
          />
          <MiniLineChart
            data={series.map((s) => ({ time: s.time, value: s.humidity }))}
            color="#eb6834"
            unit="%"
            label="Humidity"
          />
        </div>
      )}

      <Badge tone="warning">Simulated demonstration data — not a shelf-life or safety certification.</Badge>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-lg font-semibold text-ink-900">{value}</p>
    </div>
  )
}
