import { useState } from "react"
import { Card } from "../components/ui/Card"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuditLogs } from "../hooks/api"

export function AuditLogPage() {
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const { data: logs, isLoading, isError } = useAuditLogs({
    entity_type: entityType || undefined,
    action: action || undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Audit Log</h1>
        <p className="text-sm text-ink-500">Append-only record of every important platform action.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="input w-48">
          <option value="">All entity types</option>
          {["Lot", "Offer", "PurchaseOrder", "Shipment", "Payment", "Settlement", "Dispute", "QualityAssessment", "User", "BuyerProfile", "StorageBooking"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input placeholder="Filter by action (e.g. LOT_CREATED)" value={action} onChange={(e) => setAction(e.target.value)} className="input w-64" />
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load the audit log." />}
        {logs && logs.length === 0 && <EmptyState title="No matching audit entries" />}
        {logs && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">Timestamp</th>
                  <th className="pb-2 pr-4">Actor role</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Entity</th>
                  <th className="pb-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-ink-50 align-top">
                    <td className="py-2 pr-4 whitespace-nowrap text-xs text-ink-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-xs">{log.actor_role ?? "SYSTEM"}</td>
                    <td className="py-2 pr-4 font-medium text-ink-800">{log.action}</td>
                    <td className="py-2 pr-4 text-xs">{log.entity_type} #{log.entity_id}</td>
                    <td className="py-2 max-w-sm truncate text-xs text-ink-500">
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
