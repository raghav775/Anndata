import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useDisputes, useInvalidate } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

export function DisputesPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(!!searchParams.get("raise_for_lot"))
  const { data: disputes, isLoading, isError } = useDisputes()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const [lotId, setLotId] = useState(searchParams.get("raise_for_lot") ?? "")
  const [poId, setPoId] = useState(searchParams.get("po") ?? "")
  const [reason, setReason] = useState("")

  const canRaise = user?.role === "BUYER" || user?.role === "FPO_AGENT" || user?.role === "ADMIN"

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post("/disputes", {
          lot_id: Number(lotId),
          purchase_order_id: poId ? Number(poId) : null,
          reason,
        })
      ).data,
    onSuccess: (dispute) => {
      invalidate([["disputes"], ["lots"]])
      showToast(`Dispute ${dispute.dispute_code} raised`, "success")
      setShowForm(false)
      setReason("")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Disputes</h1>
          <p className="text-sm text-ink-500">Quality and delivery disputes, with evidence and resolution history.</p>
        </div>
        {canRaise && <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Raise Dispute"}</Button>}
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Raise a dispute" />
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium text-ink-700">Lot ID *</span>
                <input required type="number" value={lotId} onChange={(e) => setLotId(e.target.value)} className="input mt-1" />
              </label>
              <label className="text-sm">
                <span className="font-medium text-ink-700">Purchase order ID</span>
                <input type="number" value={poId} onChange={(e) => setPoId(e.target.value)} className="input mt-1" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Reason *</span>
              <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input mt-1" />
            </label>
            <Button type="submit" isLoading={create.isPending}>
              Submit dispute
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load disputes." />}
        {disputes && disputes.length === 0 && <EmptyState title="No disputes" description="Disputes raised on lots will appear here." />}
        {disputes && disputes.length > 0 && (
          <div className="space-y-2">
            {disputes.map((d) => (
              <Link
                key={d.id}
                to={`/app/disputes/${d.id}`}
                className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-3 text-sm hover:border-primary-200 hover:bg-primary-50"
              >
                <div>
                  <p className="font-medium text-ink-800">{d.dispute_code}</p>
                  <p className="text-xs text-ink-500 line-clamp-1">{d.reason}</p>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
