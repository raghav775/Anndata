import { useMutation } from "@tanstack/react-query"
import { ArrowRight, Package, Plus, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { useFarmers, useFPOs, useInvalidate, useLots } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

interface ContributorRow {
  farmer_id: string
  quantity_kg: string
}

export function LotsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
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
      showToast(t("lots.createdToast", { code: lot.lot_code, qty: lot.total_quantity_kg }), "success")
      setShowForm(false)
      setContributors([{ farmer_id: "", quantity_kg: "" }])
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const canCreate = user?.role === "FPO_AGENT" || user?.role === "ADMIN"

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{t("lots.title")}</h1>
          <p className="text-sm text-ink-500">{t("lots.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? t("common.cancel") : t("lots.createButton")}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader title={t("lots.formTitle")} subtitle={t("lots.formSubtitle")} />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              createLot.mutate()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-ink-700">{t("farmers.fpo")} *</span>
                <select required value={fpoId} onChange={(e) => setFpoId(e.target.value)} className="input mt-1.5">
                  <option value="">{t("farmers.selectFpo")}</option>
                  {(fpos ?? []).map((fpo) => (
                    <option key={fpo.id} value={fpo.id}>
                      {fpo.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink-700">{t("lots.variety")}</span>
                <input value={variety} onChange={(e) => setVariety(e.target.value)} className="input mt-1.5" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink-700">{t("lots.villageOrigin")} *</span>
                <input required value={village} onChange={(e) => setVillage(e.target.value)} className="input mt-1.5" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink-700">{t("lots.collectionPoint")} *</span>
                <input required value={collectionPoint} onChange={(e) => setCollectionPoint(e.target.value)} className="input mt-1.5" />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">{t("lots.contributors")} *</p>
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
                      <option value="">{t("lots.selectFarmer")}</option>
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
                      placeholder={t("lots.quantityKg")}
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
                        {t("lots.remove")}
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
                {t("lots.addContributor")}
              </Button>
            </div>

            <Button type="submit" isLoading={createLot.isPending}>
              {t("lots.submitButton")}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("lots.couldNotLoad")} />}
        {lots && lots.length === 0 && <EmptyState icon={Package} title={t("lots.noLots")} description={t("lots.noLotsDesc")} />}
        {lots && lots.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("lots.colLot")}</th>
                  <th className="pb-2 pr-4">{t("lots.colOrigin")}</th>
                  <th className="pb-2 pr-4">{t("lots.colQuantity")}</th>
                  <th className="pb-2 pr-4">{t("lots.colGrade")}</th>
                  <th className="pb-2 pr-4">{t("lots.colStatus")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink-800">{lot.lot_code}</td>
                    <td className="py-3 pr-4">{lot.village_origin}</td>
                    <td className="py-3 pr-4">{lot.total_quantity_kg} {t("common.kg")}</td>
                    <td className="py-3 pr-4">
                      {lot.final_grade ?? lot.preliminary_grade ? <Badge tone="info">{lot.final_grade ?? lot.preliminary_grade}</Badge> : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={lot.status} />
                    </td>
                    <td className="py-3 text-right">
                      <Link to={`/app/lots/${lot.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
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
