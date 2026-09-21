import { ScrollText } from "lucide-react"
import { useState } from "react"
import { Card } from "../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
import { useAuditLogs } from "../hooks/api"

export function AuditLogPage() {
  const { t } = useI18n()
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const { data: logs, isLoading, isError } = useAuditLogs({
    entity_type: entityType || undefined,
    action: action || undefined,
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("audit.title")}</h1>
        <p className="text-sm text-ink-500">{t("audit.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="input w-48">
          <option value="">{t("audit.allEntityTypes")}</option>
          {["Lot", "Offer", "PurchaseOrder", "Shipment", "Payment", "Settlement", "Dispute", "QualityAssessment", "User", "BuyerProfile", "StorageBooking"].map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
        <input placeholder={t("audit.filterAction")} value={action} onChange={(e) => setAction(e.target.value)} className="input w-64" />
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("audit.couldNotLoad")} />}
        {logs && logs.length === 0 && <EmptyState icon={ScrollText} title={t("audit.noEntries")} />}
        {logs && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("audit.colTimestamp")}</th>
                  <th className="pb-2 pr-4">{t("audit.colActorRole")}</th>
                  <th className="pb-2 pr-4">{t("audit.colAction")}</th>
                  <th className="pb-2 pr-4">{t("audit.colEntity")}</th>
                  <th className="pb-2">{t("audit.colDetails")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-ink-50 align-top last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-xs text-ink-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-xs">{log.actor_role ?? "SYSTEM"}</td>
                    <td className="py-2.5 pr-4 font-medium text-ink-800">{log.action}</td>
                    <td className="py-2.5 pr-4 text-xs">{log.entity_type} #{log.entity_id}</td>
                    <td className="py-2.5 max-w-sm truncate text-xs text-ink-500">
                      {log.new_value ? JSON.stringify(log.new_value) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
