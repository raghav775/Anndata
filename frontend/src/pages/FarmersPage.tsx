import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useToast } from "../context/ToastContext"
import { useFarmers, useFPOs, useInvalidate } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

const MAHARASHTRA_DISTRICTS = ["Nashik", "Pune", "Ahmednagar", "Aurangabad", "Dhule"]

export function FarmersPage() {
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
      showToast(
        `Farmer onboarded. Demo login: ${data.demo_login_email} / ${data.demo_login_password}`,
        "success",
      )
      setShowForm(false)
      setForm({ full_name: "", phone: "", village: "", taluka: "", district: "Nashik", state: "Maharashtra", land_area_acres: "", fpo_id: "" })
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Farmers</h1>
          <p className="text-sm text-ink-500">Onboard and manage farmers in your FPO.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Onboard Farmer"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Onboard a new farmer" subtitle="Creates a demo login for the farmer automatically" />
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              onboard.mutate()
            }}
          >
            <Field label="Full name" required>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" />
            </Field>
            <Field label="Phone number" required>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </Field>
            <Field label="FPO" required>
              <select required value={form.fpo_id} onChange={(e) => setForm({ ...form, fpo_id: e.target.value })} className="input">
                <option value="">Select FPO</option>
                {(fpos ?? []).map((fpo) => (
                  <option key={fpo.id} value={fpo.id}>
                    {fpo.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Land area (acres)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.land_area_acres}
                onChange={(e) => setForm({ ...form, land_area_acres: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Village" required>
              <input required value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className="input" />
            </Field>
            <Field label="Taluka" required>
              <input required value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} className="input" />
            </Field>
            <Field label="District" required>
              <select required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="input">
                {MAHARASHTRA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State" required>
              <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" isLoading={onboard.isPending}>
                Onboard farmer
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load farmers." />}
        {farmers && farmers.length === 0 && (
          <EmptyState title="No farmers onboarded yet" description="Use the Onboard Farmer button to add your first farmer." />
        )}
        {farmers && farmers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Village</th>
                  <th className="pb-2 pr-4">Taluka</th>
                  <th className="pb-2 pr-4">Land (acres)</th>
                  <th className="pb-2 pr-4">Phone</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer) => (
                  <tr key={farmer.id} className="border-b border-ink-50">
                    <td className="py-2.5 pr-4 font-medium text-ink-800">{farmer.full_name}</td>
                    <td className="py-2.5 pr-4">{farmer.village}</td>
                    <td className="py-2.5 pr-4">{farmer.taluka}</td>
                    <td className="py-2.5 pr-4">{farmer.land_area_acres ?? "—"}</td>
                    <td className="py-2.5 pr-4">{farmer.phone}</td>
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
      <div className="mt-1">{children}</div>
    </label>
  )
}
