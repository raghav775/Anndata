import { clsx } from "clsx"
import type { ReactNode } from "react"

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary"

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  primary: "bg-primary-100 text-primary-800",
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  )
}

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  COLLECTED: "info",
  UNDER_ASSESSMENT: "warning",
  ASSESSED: "info",
  OPEN_FOR_OFFERS: "primary",
  OFFER_ACCEPTED: "primary",
  PURCHASE_ORDER_CREATED: "primary",
  DISPATCHED: "info",
  DELIVERED: "success",
  SETTLED: "success",
  DISPUTED: "danger",
  CLOSED: "neutral",
  ACTIVE: "primary",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "neutral",
  WITHDRAWN: "neutral",
  PAYMENT_PENDING: "warning",
  ADVANCE_RECEIVED: "info",
  PAYMENT_INITIATED: "info",
  PAYMENT_COMPLETED: "success",
  PARTIALLY_PAID: "warning",
  OVERDUE: "danger",
  PENDING: "warning",
  PARTIAL: "warning",
  COMPLETED: "success",
  OPEN: "warning",
  UNDER_REVIEW: "info",
  EVIDENCE_REQUESTED: "info",
  RESOLVED: "success",
  ESCALATED: "danger",
  NORMAL: "success",
  WARNING: "warning",
  ALERT: "danger",
  A: "success",
  B: "info",
  C: "warning",
  VERIFIED: "success",
  UNVERIFIED: "neutral",
  SUSPENDED: "danger",
  ASSIGNED: "neutral",
  PICKUP_SCHEDULED: "info",
  PICKED_UP: "info",
  IN_TRANSIT: "primary",
  DELAYED: "warning",
  INCIDENT: "danger",
  ISSUED: "info",
  ACKNOWLEDGED: "info",
  FULFILLED: "success",
  CANCELLED: "neutral",
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>
}
