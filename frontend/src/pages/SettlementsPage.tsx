import { useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardHeader } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useI18n } from "../context/I18nContext"
import { useSettlements, useSettlementsForFarmer } from "../hooks/api"
import { api } from "../lib/api"
import type { FarmerProfile } from "../types"

export function SettlementsPage() {
  const { user } = useAuth()
  if (user?.role === "FARMER") return <FarmerSettlements />
  return <AllSettlements />
}

function FarmerSettlements() {
  const { t } = useI18n()
  const { data: farmerProfile } = useQuery({
    queryKey: ["farmer-profile"],
    queryFn: async () => (await api.get<FarmerProfile>("/farmers/me")).data,
  })
  const { data: settlements, isLoading, isError } = useSettlementsForFarmer(farmerProfile?.id)

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("settlements.myTitle")}</h1>
        <p className="text-sm text-ink-500">{t("settlements.mySubtitle")}</p>
      </div>

      {isLoading && <SkeletonCard />}
      {isError && <ErrorState message={t("settlements.couldNotLoad")} />}
      {settlements && settlements.length === 0 && (
        <EmptyState icon={ClipboardList} title={t("settlements.noSettlements")} description={t("settlements.noSettlementsDesc")} />
      )}

      <div className="space-y-4">
        {(settlements ?? []).map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-800">{t("settlements.lot", { id: s.lot_id })}</p>
                <p className="text-xs text-ink-400">{t("settlements.total", { amount: s.total_amount.toLocaleString("en-IN") })}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            {s.items.map((item) => (
              <div key={item.id} className="mt-3 rounded-xl bg-primary-50 p-4">
                <p className="font-display text-2xl font-bold text-primary-800">₹{item.net_amount.toLocaleString("en-IN")}</p>
                <dl className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-ink-600 sm:grid-cols-4">
                  <div><dt className="text-ink-400">{t("settlements.contributed")}</dt><dd>{item.contributed_quantity_kg} {t("common.kg")}</dd></div>
                  <div><dt className="text-ink-400">{t("settlements.share")}</dt><dd>{item.share_percentage}%</dd></div>
                  <div><dt className="text-ink-400">{t("settlements.gross")}</dt><dd>₹{item.gross_share_amount.toLocaleString("en-IN")}</dd></div>
                  <div><dt className="text-ink-400">{t("settlements.deductions")}</dt><dd>₹{item.deduction_amount.toLocaleString("en-IN")}</dd></div>
                </dl>
                <p className="mt-1 text-xs text-ink-400">
                  {item.payment_status === "PAID" ? t("settlements.paid") : t("settlements.pendingPayment")}
                  {item.transaction_reference && ` · ${t("settlements.ref", { ref: item.transaction_reference })}`}
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
  const { t } = useI18n()
  const { data: settlements, isLoading, isError } = useSettlements()

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("settlements.title")}</h1>
        <p className="text-sm text-ink-500">{t("settlements.subtitle")}</p>
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("settlements.couldNotLoad")} />}
        {settlements && settlements.length === 0 && <EmptyState icon={ClipboardList} title={t("settlements.noSettlements")} />}
        {(settlements ?? []).map((s) => (
          <div key={s.id} className="border-b border-ink-100 py-4 last:border-0">
            <div className="flex items-center justify-between">
              <CardHeader
                title={<Link to={`/app/lots/${s.lot_id}`} className="hover:underline">{t("settlements.lot", { id: s.lot_id })}</Link>}
                subtitle={t("settlements.total", { amount: s.total_amount.toLocaleString("en-IN") })}
              />
              <StatusBadge status={s.status} />
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-1 pr-4">{t("settlements.colFarmer")}</th>
                  <th className="pb-1 pr-4">{t("settlements.colShare")}</th>
                  <th className="pb-1">{t("settlements.colNet")}</th>
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
