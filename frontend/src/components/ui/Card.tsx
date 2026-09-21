import { clsx } from "clsx"
import type { HTMLAttributes, ReactNode } from "react"

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card-surface p-5", className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type StatTone = "primary" | "accent" | "success" | "warning" | "danger" | "neutral"

const statIconTone: Record<StatTone, string> = {
  primary: "bg-primary-50 text-primary-600",
  accent: "bg-accent-50 text-accent-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  neutral: "bg-ink-100 text-ink-600",
}

const statValueTone: Record<StatTone, string> = {
  primary: "text-ink-900",
  accent: "text-ink-900",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  neutral: "text-ink-900",
}

/** A compact metric tile: icon, label, big value, optional caption. Used
 * throughout the dashboards in place of a plain number-in-a-box. */
export function StatTile({
  icon: Icon,
  label,
  value,
  caption,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: ReactNode
  value: ReactNode
  caption?: ReactNode
  tone?: StatTone
}) {
  return (
    <div className="card-surface flex items-start gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-lifted)]">
      <div className={clsx("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", statIconTone[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-500">{label}</p>
        <p className={clsx("mt-0.5 text-xl font-bold tracking-tight", statValueTone[tone])}>{value}</p>
        {caption && <p className="mt-0.5 truncate text-xs text-ink-400">{caption}</p>}
      </div>
    </div>
  )
}
