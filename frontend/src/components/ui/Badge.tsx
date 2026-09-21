import { clsx } from "clsx"
import type { ReactNode } from "react"
import { useI18n } from "../../context/I18nContext"

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary"

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  primary: "bg-primary-50 text-primary-700 ring-primary-200",
}

const dotClasses: Record<Tone, string> = {
  neutral: "bg-ink-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  primary: "bg-primary-500",
}

export function Badge({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: Tone
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
      )}
    >
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full", dotClasses[tone])} aria-hidden="true" />}
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
  const { tStatus } = useI18n()
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot>
      {tStatus(status)}
    </Badge>
  )
}
