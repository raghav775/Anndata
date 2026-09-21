import { Link } from "react-router-dom"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useLots } from "../hooks/api"

export function MarketplacePage() {
  const { data: lots, isLoading, isError } = useLots("OPEN_FOR_OFFERS")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Marketplace</h1>
        <p className="text-sm text-ink-500">Verified lots currently open for offers.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {isError && <ErrorState message="Could not load the marketplace." />}
      {lots && lots.length === 0 && (
        <EmptyState title="No lots open for offers right now" description="Check back once the FPO finishes assessing new lots." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(lots ?? []).map((lot) => (
          <Card key={lot.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink-900">{lot.lot_code}</p>
                <p className="text-sm text-ink-500">{lot.variety}</p>
              </div>
              {lot.final_grade && <Badge tone="success">Grade {lot.final_grade}</Badge>}
            </div>
            <div className="mt-3 space-y-1 text-sm text-ink-600">
              <p>{lot.total_quantity_kg} kg available</p>
              <p>Origin: {lot.village_origin}</p>
            </div>
            <Link
              to={`/app/lots/${lot.id}`}
              className="mt-4 inline-block rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              View &amp; submit offer
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
