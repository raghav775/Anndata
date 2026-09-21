import { AlertTriangle, Inbox } from "lucide-react"
import type { ReactNode } from "react"
import { useI18n } from "../../context/I18nContext"
import { Button } from "./Button"

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />
}

export function SkeletonCard() {
  return (
    <div className="card-surface p-5">
      <Skeleton className="mb-3 h-5 w-1/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: { title: string; description?: string; action?: ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-ink-200">
        <Icon className="h-5 w-5 text-ink-400" />
      </div>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/70 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 h-5 w-5 text-red-500" />
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      )}
    </div>
  )
}
