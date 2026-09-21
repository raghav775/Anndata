import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Card, CardHeader } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useSettlements, useSettlementsForFarmer } from "../hooks/api"
import { api } from "../lib/api"
import type { FarmerProfile } from "../types"

export function SettlementsPage() {
  const { user } = useAuth()
  if (user?.role === "FARMER") return <FarmerSettlements />
  return <AllSettlements />
}

function FarmerSettlements() {
  const { data: farmerProfile } = useQuery({
    queryKey: ["farmer-profile"],
    queryFn: async () => (await api.get<FarmerProfile>("/farmers/me")).data,
  })
  const { data: settlements, isLoading, isError } = useSettlementsForFarmer(farmerProfile?.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">My Settlements</h1>
        <p className="text-sm text-ink-500">Your itemized share of every settled lot.</p>
      </div>

      {isLoading && <SkeletonCard />}
      {isError && <ErrorState message="Could not load your settlements." />}
      {settlements && settlements.length === 0 && (
        <EmptyState title="No settlements yet" description="Once a lot you contributed to is paid for, your settlement will appear here." />
      )}

      <div className="space-y-4">
        {(settlements ?? []).map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-800">Lot #{s.lot_id}</p>
                <p className="text-xs text-ink-400">Settlement total: ₹{s.total_amount.toLocaleString("en-IN")}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            {s.items.map((item) => (
              <div key={item.id} className="mt-3 rounded-md bg-primary-50 p-3">
                <p className="text-2xl font-bold text-primary-800">₹{item.net_amount.toLocaleString("en-IN")}</p>
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-ink-600 sm:grid-cols-4">
                  <div><dt className="text-ink-400">Contributed</dt><dd>{item.contributed_quantity_kg} kg</dd></div>
                  <div><dt className="text-ink-400">Share</dt><dd>{item.share_percentage}%</dd></div>
                  <div><dt className="text-ink-400">Gross</dt><dd>₹{item.gross_share_amount.toLocaleString("en-IN")}</dd></div>
                  <div><dt className="text-ink-400">Deductions</dt><dd>₹{item.deduction_amount.toLocaleString("en-IN")}</dd></div>
                </dl>
                <p className="mt-1 text-xs text-ink-400">
                  {item.payment_status === "PAID" ? "Paid" : "Pending"}
                  {item.transaction_reference && ` · Ref: ${item.transaction_reference}`}
                </p>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}

function AllSettlements() {
  const { data: settlements, isLoading, isError } = useSettlements()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settlements</h1>
        <p className="text-sm text-ink-500">Per-farmer itemized settlements across all lots.</p>
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load settlements." />}
        {settlements && settlements.length === 0 && <EmptyState title="No settlements yet" />}
        {(settlements ?? []).map((s) => (
          <div key={s.id} className="border-b border-ink-100 py-4 last:border-0">
            <div className="flex items-center justify-between">
              <CardHeader
                title={<Link to={`/app/lots/${s.lot_id}`} className="hover:underline">Lot #{s.lot_id}</Link>}
                subtitle={`Total: ₹${s.total_amount.toLocaleString("en-IN")}`}
              />
              <StatusBadge status={s.status} />
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-ink-400">
                  <th className="pb-1 pr-4">Farmer</th>
                  <th className="pb-1 pr-4">Share</th>
                  <th className="pb-1">Net amount</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1 pr-4">{item.farmer_name ?? `Farmer #${item.farmer_id}`}</td>
                    <td className="py-1 pr-4">{item.share_percentage}%</td>
                    <td className="py-1 font-medium text-ink-800">₹{item.net_amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Card>
    </div>
  )
}
