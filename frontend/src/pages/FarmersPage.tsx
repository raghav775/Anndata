import { useMutation } from "@tanstack/react-query"
import { Plus, UserRound, X } from "lucide-react"
import { useState } from "react"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { useFarmers, useFPOs, useInvalidate } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

const MAHARASHTRA_DISTRICTS = ["Nashik", "Pune", "Ahmednagar", "Aurangabad", "Dhule"]

export function FarmersPage() {
  const { t } = useI18n()
  const [showForm, setShowForm] = useState(false)
  const { data: farmers, isLoading, isError } = useFarmers()
  const { data: fpos } = useFPOs()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    village: "",
    taluka: "",
    district: "Nashik",
    state: "Maharashtra",
    land_area_acres: "",
    fpo_id: "",
  })

  const onboard = useMutation({
    mutationFn: async () =>
      (
        await api.post("/farmers", {
          ...form,
          fpo_id: Number(form.fpo_id),
          land_area_acres: form.land_area_acres ? Number(form.land_area_acres) : null,
        })
      ).data,
    onSuccess: (data) => {
      invalidate([["farmers"]])
      showToast(t("farmers.onboardedToast", { email: data.demo_login_email, password: data.demo_login_password }), "success")
      setShowForm(false)
      setForm({ full_name: "", phone: "", village: "", taluka: "", district: "Nashik", state: "Maharashtra", land_area_acres: "", fpo_id: "" })
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{t("farmers.title")}</h1>
          <p className="text-sm text-ink-500">{t("farmers.subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? t("common.cancel") : t("farmers.onboardButton")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title={t("farmers.formTitle")} subtitle={t("farmers.formSubtitle")} />
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              onboard.mutate()
            }}
          >
            <Field label={t("farmers.fullName")} required>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" />
            </Field>
            <Field label={t("farmers.phone")} required>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </Field>
            <Field label={t("farmers.fpo")} required>
              <select required value={form.fpo_id} onChange={(e) => setForm({ ...form, fpo_id: e.target.value })} className="input">
                <option value="">{t("farmers.selectFpo")}</option>
                {(fpos ?? []).map((fpo) => (
                  <option key={fpo.id} value={fpo.id}>
                    {fpo.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("farmers.landArea")}>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.land_area_acres}
                onChange={(e) => setForm({ ...form, land_area_acres: e.target.value })}
                className="input"
              />
            </Field>
            <Field label={t("farmers.village")} required>
              <input required value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className="input" />
            </Field>
            <Field label={t("farmers.taluka")} required>
              <input required value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} className="input" />
            </Field>
            <Field label={t("farmers.district")} required>
              <select required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="input">
                {MAHARASHTRA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("farmers.state")} required>
              <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" isLoading={onboard.isPending}>
                {t("farmers.submitButton")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("farmers.couldNotLoad")} />}
        {farmers && farmers.length === 0 && (
          <EmptyState icon={UserRound} title={t("farmers.noFarmers")} description={t("farmers.noFarmersDesc")} />
        )}
        {farmers && farmers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("farmers.colName")}</th>
                  <th className="pb-2 pr-4">{t("farmers.colVillage")}</th>
                  <th className="pb-2 pr-4">{t("farmers.colTaluka")}</th>
                  <th className="pb-2 pr-4">{t("farmers.colLand")}</th>
                  <th className="pb-2 pr-4">{t("farmers.colPhone")}</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer) => (
                  <tr key={farmer.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink-800">{farmer.full_name}</td>
                    <td className="py-3 pr-4">{farmer.village}</td>
                    <td className="py-3 pr-4">{farmer.taluka}</td>
                    <td className="py-3 pr-4">{farmer.land_area_acres ?? "—"}</td>
                    <td className="py-3 pr-4">{farmer.phone}</td>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink-700">
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
