import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Layers, MapPin, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { Badge, StatusBadge } from "../../components/ui/Badge"
import { Card, CardHeader, StatTile } from "../../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../../components/ui/States"
import { api } from "../../lib/api"
import { useSettlementsForFarmer } from "../../hooks/api"
import type { FarmerProfile, Lot } from "../../types"

export function FarmerDashboard() {
  const { user } = useAuth()
  const { t } = useI18n()

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
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("farmerDash.welcome", { name: user?.full_name ?? "" })}</h1>
        <p className="text-sm text-ink-500">{t("farmerDash.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Layers} label={t("farmerDash.totalLots")} value={lots?.length ?? "—"} tone="primary" />
        <StatTile
          icon={Wallet}
          label={t("farmerDash.totalSettlement")}
          value={`₹${totalSettled.toLocaleString("en-IN")}`}
          tone="success"
        />
        <StatTile icon={MapPin} label={t("farmerDash.village")} value={farmerProfile?.village ?? "—"} tone="accent" />
      </div>

      <Card>
        <CardHeader title={t("farmerDash.yourLots")} subtitle={t("farmerDash.yourLotsSubtitle")} />
        {lotsLoading && <SkeletonCard />}
        {lotsError && <ErrorState message={t("farmerDash.couldNotLoad")} />}
        {lots && lots.length === 0 && (
          <EmptyState title={t("farmerDash.noLots")} description={t("farmerDash.noLotsDesc")} />
        )}
        {lots && lots.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("farmerDash.colLot")}</th>
                  <th className="pb-2 pr-4">{t("farmerDash.colYourQty")}</th>
                  <th className="pb-2 pr-4">{t("common.grade")}</th>
                  <th className="pb-2 pr-4">{t("common.status")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const mine = lot.contributors.find((c) => c.farmer_id === farmerProfile?.id)
                  return (
                    <tr key={lot.id} className="border-b border-ink-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-ink-800">{lot.lot_code}</td>
                      <td className="py-3 pr-4">{mine?.quantity_kg ?? "—"} {t("common.kg")}</td>
                      <td className="py-3 pr-4">{lot.final_grade ? <Badge tone="info">{lot.final_grade}</Badge> : "—"}</td>
                      <td className="py-3 pr-4"><StatusBadge status={lot.status} /></td>
                      <td className="py-3 text-right">
                        <Link to={`/app/lots/${lot.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
                          {t("common.view")} <ArrowRight className="h-3.5 w-3.5" />
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
