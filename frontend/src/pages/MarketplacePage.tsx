import { ArrowRight, Store } from "lucide-react"
import { Link } from "react-router-dom"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
import { useLots } from "../hooks/api"

export function MarketplacePage() {
  const { t } = useI18n()
  const { data: lots, isLoading, isError } = useLots("OPEN_FOR_OFFERS")

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("marketplace.title")}</h1>
        <p className="text-sm text-ink-500">{t("marketplace.subtitle")}</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {isError && <ErrorState message={t("marketplace.couldNotLoad")} />}
      {lots && lots.length === 0 && (
        <EmptyState icon={Store} title={t("marketplace.noLots")} description={t("marketplace.noLotsDesc")} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(lots ?? []).map((lot) => (
          <Card key={lot.id} className="transition-shadow hover:shadow-[var(--shadow-lifted)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display font-semibold text-ink-900">{lot.lot_code}</p>
                <p className="text-sm text-ink-500">{lot.variety}</p>
              </div>
              {lot.final_grade && <Badge tone="success">{t("common.grade")} {lot.final_grade}</Badge>}
            </div>
            <div className="mt-3 space-y-1 text-sm text-ink-600">
              <p>{lot.total_quantity_kg} {t("marketplace.kgAvailable")}</p>
              <p>{t("marketplace.origin")}: {lot.village_origin}</p>
            </div>
            <Link
              to={`/app/lots/${lot.id}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
            >
              {t("marketplace.viewSubmit")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
