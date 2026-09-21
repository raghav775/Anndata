import { useMutation } from "@tanstack/react-query"
import { FileCheck2, Gavel, XCircle } from "lucide-react"
import { useState } from "react"
import { useParams } from "react-router-dom"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { useDispute, useInvalidate } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"
import type { DisputeStatus } from "../types"

const NEXT_STATUSES: Partial<Record<DisputeStatus, DisputeStatus[]>> = {
  OPEN: ["UNDER_REVIEW", "EVIDENCE_REQUESTED", "ESCALATED", "REJECTED"],
  UNDER_REVIEW: ["EVIDENCE_REQUESTED", "RESOLVED", "REJECTED", "ESCALATED"],
  EVIDENCE_REQUESTED: ["UNDER_REVIEW"],
  ESCALATED: ["UNDER_REVIEW", "RESOLVED", "REJECTED"],
}

export function DisputeDetailPage() {
  const { disputeId } = useParams()
  const id = Number(disputeId)
  const { user } = useAuth()
  const { t, tStatus } = useI18n()
  const { showToast } = useToast()
  const invalidate = useInvalidate()
  const { data: dispute, isLoading, isError } = useDispute(id)

  const [description, setDescription] = useState("")
  const [decision, setDecision] = useState("")
  const [adjustment, setAdjustment] = useState("")

  const isReviewer = user?.role === "FPO_AGENT" || user?.role === "ADMIN"

  function invalidateAll() {
    invalidate([["disputes", id], ["disputes"], ["settlements"], ["lots"]])
  }

  const addEvidence = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.append("evidence_type", "NOTE")
      form.append("description", description)
      return (await api.post(`/disputes/${id}/evidence`, form, { headers: { "Content-Type": "multipart/form-data" } })).data
    },
    onSuccess: () => {
      invalidateAll()
      showToast(t("disputeDetail.evidenceAddedToast"), "success")
      setDescription("")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const setStatus = useMutation({
    mutationFn: async (status: DisputeStatus) => (await api.patch(`/disputes/${id}/status`, { status })).data,
    onSuccess: () => {
      invalidateAll()
      showToast(t("disputeDetail.statusUpdatedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const resolve = useMutation({
    mutationFn: async (status: "RESOLVED" | "REJECTED") =>
      (
        await api.post(`/disputes/${id}/resolve`, {
          final_decision: decision,
          financial_adjustment: adjustment ? Number(adjustment) : null,
          status,
        })
      ).data,
    onSuccess: () => {
      invalidateAll()
      showToast(t("disputeDetail.closedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  if (isLoading) return <SkeletonCard />
  if (isError || !dispute) return <ErrorState message={t("disputeDetail.couldNotLoad")} />

  const isClosed = dispute.status === "RESOLVED" || dispute.status === "REJECTED"
  const nextStatuses = NEXT_STATUSES[dispute.status] ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl font-bold text-ink-900">{dispute.dispute_code}</h1>
        <StatusBadge status={dispute.status} />
      </div>

      <Card>
        <CardHeader title={t("disputeDetail.reasonTitle")} />
        <p className="text-sm text-ink-700">{dispute.reason}</p>
        <p className="mt-2 text-xs text-ink-400">
          Lot #{dispute.lot_id}
          {dispute.purchase_order_id && ` · PO #${dispute.purchase_order_id}`}
        </p>
      </Card>

      <Card>
        <CardHeader title={t("disputeDetail.evidenceTitle")} subtitle={t("disputeDetail.evidenceSubtitle")} />
        {dispute.evidence.length === 0 ? (
          <p className="text-sm text-ink-400">{t("disputeDetail.noEvidence")}</p>
        ) : (
          <ul className="space-y-2">
            {dispute.evidence.map((e) => (
              <li key={e.id} className="rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
                <Badge tone="neutral">{e.evidence_type}</Badge>
                <p className="mt-1 text-ink-700">{e.description}</p>
                <p className="text-xs text-ink-400">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
        {!isClosed && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addEvidence.mutate()
            }}
          >
            <input
              required
              placeholder={t("disputeDetail.describeEvidence")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input flex-1"
            />
            <Button type="submit" size="sm" isLoading={addEvidence.isPending}>
              {t("disputeDetail.addButton")}
            </Button>
          </form>
        )}
      </Card>

      {isReviewer && !isClosed && nextStatuses.length > 0 && (
        <Card>
          <CardHeader title={t("disputeDetail.updateStatusTitle")} />
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <Button key={s} size="sm" variant="secondary" isLoading={setStatus.isPending} onClick={() => setStatus.mutate(s)}>
                {tStatus(s)}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {isReviewer && !isClosed && (
        <Card>
          <CardHeader title={t("disputeDetail.resolveTitle")} subtitle={t("disputeDetail.resolveSubtitle")} />
          <form className="space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-ink-700">{t("disputeDetail.finalDecision")} *</span>
              <textarea required rows={3} value={decision} onChange={(e) => setDecision(e.target.value)} className="input mt-1.5" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">{t("disputeDetail.financialAdjustment")}</span>
              <input type="number" step="0.01" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} className="input mt-1.5" />
            </label>
            <div className="flex gap-2">
              <Button type="button" isLoading={resolve.isPending} onClick={() => resolve.mutate("RESOLVED")} disabled={!decision}>
                <FileCheck2 className="h-4 w-4" />
                {t("disputeDetail.resolveButton")}
              </Button>
              <Button type="button" variant="danger" isLoading={resolve.isPending} onClick={() => resolve.mutate("REJECTED")} disabled={!decision}>
                <XCircle className="h-4 w-4" />
                {t("disputeDetail.rejectButton")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isClosed && (
        <Card>
          <CardHeader title={t("disputeDetail.resolutionTitle")} />
          <p className="text-sm text-ink-700">{dispute.final_decision}</p>
          {dispute.financial_adjustment !== null && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <Gavel className="h-4 w-4 text-ink-400" />
              {t("disputeDetail.financialAdjustmentLabel", { amount: dispute.financial_adjustment?.toLocaleString("en-IN") })}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
