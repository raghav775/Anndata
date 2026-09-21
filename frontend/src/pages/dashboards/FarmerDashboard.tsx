import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Badge, StatusBadge } from "../../components/ui/Badge"
import { Card, CardHeader } from "../../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../../components/ui/States"
import { api } from "../../lib/api"
import { useSettlementsForFarmer } from "../../hooks/api"
import type { FarmerProfile, Lot } from "../../types"

export function FarmerDashboard() {
  const { user } = useAuth()

  const { data: farmerProfile } = useQuery({
    queryKey: ["farmer-profile", user?.id],
    queryFn: async () => (await api.get<FarmerProfile>("/farmers/me")).data,
    enabled: user?.role === "FARMER",
  })

  const {
    data: lots,
    isLoading: lotsLoading,
    isError: lotsError,
  } = useQuery({
    queryKey: ["farmer-lots", farmerProfile?.id],
    queryFn: async () => (await api.get<Lot[]>(`/farmers/${farmerProfile!.id}/lots`)).data,
    enabled: !!farmerProfile,
  })

  const { data: settlements } = useSettlementsForFarmer(farmerProfile?.id)

  const totalSettled = (settlements ?? []).reduce(
    (sum, s) => sum + s.items.reduce((isum, item) => isum + item.net_amount, 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-ink-500">Your produce, lots and settlements at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-ink-500">Total lots contributed to</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{lots?.length ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-500">Total settlement received</p>
          <p className="mt-1 text-2xl font-semibold text-primary-700">₹{totalSettled.toLocaleString("en-IN")}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-500">Village</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{farmerProfile?.village ?? "—"}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Your lots" subtitle="Produce you've contributed, and where each lot stands" />
        {lotsLoading && <SkeletonCard />}
        {lotsError && <ErrorState message="Could not load your lots." />}
        {lots && lots.length === 0 && (
          <EmptyState title="No lots yet" description="Once your FPO aggregates your produce into a lot, it will appear here." />
        )}
        {lots && lots.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">Lot</th>
                  <th className="pb-2 pr-4">Your quantity</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const mine = lot.contributors.find((c) => c.farmer_id === farmerProfile?.id)
                  return (
                    <tr key={lot.id} className="border-b border-ink-50">
                      <td className="py-2.5 pr-4 font-medium text-ink-800">{lot.lot_code}</td>
                      <td className="py-2.5 pr-4">{mine?.quantity_kg ?? "—"} kg</td>
                      <td className="py-2.5 pr-4">{lot.final_grade ? <Badge tone="info">{lot.final_grade}</Badge> : "—"}</td>
                      <td className="py-2.5 pr-4"><StatusBadge status={lot.status} /></td>
                      <td className="py-2.5 text-right">
                        <Link to={`/app/lots/${lot.id}`} className="text-sm font-medium text-primary-700 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
