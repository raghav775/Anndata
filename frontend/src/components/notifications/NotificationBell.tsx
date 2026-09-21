import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { useState } from "react"
import { useI18n } from "../../context/I18nContext"
import { api } from "../../lib/api"
import type { NotificationItem } from "../../types"

/** Notification `type` -> translated title. The backend always writes the
 * same fixed title per type (see app/services/notifications.py callers), so
 * this re-maps that known, closed set of types to a localized title. The
 * message body still comes from the backend as stored English text with
 * embedded specifics (lot codes, amounts, org names) that aren't cleanly
 * separable for client-side translation without a template+params API —
 * documented as a known limitation in README.md. */
const NOTIF_TITLE_KEY: Record<string, string> = {
  OFFER_RECEIVED: "notif.type.offerReceived",
  OFFER_ACCEPTED: "notif.type.offerAccepted",
  PURCHASE_ORDER_CREATED: "notif.type.poCreated",
  SHIPMENT_ASSIGNED: "notif.type.shipmentAssigned",
  DELIVERY_COMPLETED: "notif.type.deliveryCompleted",
  PAYMENT_COMPLETED: "notif.type.paymentCompleted",
  SETTLEMENT_AVAILABLE: "notif.type.settlementAvailable",
  DISPUTE_RESOLVED: "notif.type.disputeResolved",
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get<NotificationItem[]>("/notifications")).data,
    refetchInterval: 15000,
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function markRead(id: number) {
    await api.patch(`/notifications/${id}/read`)
    void queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring relative rounded-lg p-2 text-ink-600 hover:bg-ink-100"
        aria-label={`${t("notif.title")}${unreadCount > 0 ? `, ${unreadCount} ${t("notif.unread")}` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-ink-100 bg-white shadow-[var(--shadow-panel)]">
          <div className="border-b border-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-800">{t("notif.title")}</div>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-400">{t("notif.empty")}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`cursor-pointer px-4 py-3 text-sm hover:bg-ink-50 ${n.is_read ? "" : "bg-primary-50/60"}`}
                  onClick={() => markRead(n.id)}
                >
                  <p className="font-medium text-ink-800">{NOTIF_TITLE_KEY[n.type] ? t(NOTIF_TITLE_KEY[n.type]) : n.title}</p>
                  <p className="mt-0.5 text-ink-500">{n.message}</p>
                  <p className="mt-1 text-xs text-ink-400">{new Date(n.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
