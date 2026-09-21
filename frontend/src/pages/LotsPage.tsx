import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useFarmers, useFPOs, useInvalidate, useLots } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

interface ContributorRow {
  farmer_id: string
  quantity_kg: string
}

export function LotsPage() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const { data: lots, isLoading, isError } = useLots()
  const { data: farmers } = useFarmers()
  const { data: fpos } = useFPOs()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const [fpoId, setFpoId] = useState("")
  const [village, setVillage] = useState("Niphad")
  const [collectionPoint, setCollectionPoint] = useState("Niphad Collection Centre")
  const [variety, setVariety] = useState("Red Onion - Nashik")
  const [contributors, setContributors] = useState<ContributorRow[]>([{ farmer_id: "", quantity_kg: "" }])

  const createLot = useMutation({
    mutationFn: async () =>
      (
        await api.post("/lots", {
          commodity_id: 1,
          variety,
          fpo_id: Number(fpoId),
          village_origin: village,
          collection_point: collectionPoint,
          contributors: contributors
            .filter((c) => c.farmer_id && c.quantity_kg)
            .map((c) => ({ farmer_id: Number(c.farmer_id), quantity_kg: Number(c.quantity_kg) })),
        })
      ).data,
    onSuccess: (lot) => {
      invalidate([["lots"]])
      showToast(`Lot ${lot.lot_code} created (${lot.total_quantity_kg} kg)`, "success")
      setShowForm(false)
      setContributors([{ farmer_id: "", quantity_kg: "" }])
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const canCreate = user?.role === "FPO_AGENT" || user?.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Lots</h1>
          <p className="text-sm text-ink-500">Onion lots aggregated from farmer contributions.</p>
        </div>
        {canCreate && <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Create Lot"}</Button>}
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Aggregate a new lot" subtitle="Combine produce from one or more farmers into a single traceable lot" />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              createLot.mutate()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-ink-700">FPO *</span>
                <select required value={fpoId} onChange={(e) => setFpoId(e.target.value)} className="input mt-1">
                  <option value="">Select FPO</option>
                  {(fpos ?? []).map((fpo) => (
                    <option key={fpo.id} value={fpo.id}>
                      {fpo.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink-700">Variety</span>
                <input value={variety} onChange={(e) => setVariety(e.target.value)} className="input mt-1" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink-700">Village of origin *</span>
                <input required value={village} onChange={(e) => setVillage(e.target.value)} className="input mt-1" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink-700">Collection point *</span>
                <input required value={collectionPoint} onChange={(e) => setCollectionPoint(e.target.value)} className="input mt-1" />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Farmer contributors *</p>
              <div className="space-y-2">
                {contributors.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={row.farmer_id}
                      onChange={(e) => {
                        const next = [...contributors]
                        next[i] = { ...next[i], farmer_id: e.target.value }
                        setContributors(next)
                      }}
                      className="input"
                    >
                      <option value="">Select farmer</option>
                      {(farmers ?? []).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.full_name} ({f.village})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="Quantity (kg)"
                      value={row.quantity_kg}
                      onChange={(e) => {
                        const next = [...contributors]
                        next[i] = { ...next[i], quantity_kg: e.target.value }
                        setContributors(next)
                      }}
                      className="input w-40"
                    />
                    {contributors.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setContributors(contributors.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => setContributors([...contributors, { farmer_id: "", quantity_kg: "" }])}
              >
                + Add contributor
              </Button>
            </div>

            <Button type="submit" isLoading={createLot.isPending}>
              Create lot
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load lots." />}
        {lots && lots.length === 0 && <EmptyState title="No lots yet" description="Create your first lot to begin the workflow." />}
        {lots && lots.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">Lot</th>
                  <th className="pb-2 pr-4">Origin</th>
                  <th className="pb-2 pr-4">Quantity</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-ink-50">
                    <td className="py-2.5 pr-4 font-medium text-ink-800">{lot.lot_code}</td>
                    <td className="py-2.5 pr-4">{lot.village_origin}</td>
                    <td className="py-2.5 pr-4">{lot.total_quantity_kg} kg</td>
                    <td className="py-2.5 pr-4">{lot.final_grade ?? lot.preliminary_grade ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={lot.status} />
                    </td>
                    <td className="py-2.5 text-right">
                      <Link to={`/app/lots/${lot.id}`} className="text-sm font-medium text-primary-700 hover:underline">
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
