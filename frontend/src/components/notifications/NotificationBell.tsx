import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "../../lib/api"
import type { NotificationItem } from "../../types"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

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
        className="focus-ring relative rounded-full p-2 text-ink-600 hover:bg-ink-100"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.66V5a2 2 0 1 0-4 0v.34A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg">
          <div className="border-b border-ink-100 px-4 py-2 text-sm font-semibold text-ink-800">Notifications</div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">No notifications yet</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`cursor-pointer px-4 py-3 text-sm hover:bg-ink-50 ${n.is_read ? "" : "bg-primary-50/60"}`}
                  onClick={() => markRead(n.id)}
                >
                  <p className="font-medium text-ink-800">{n.title}</p>
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
