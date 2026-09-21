import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { LANGUAGES } from "../../i18n/translations"
import { NAV_ITEMS, ROLE_LABEL } from "../../lib/nav"
import { NotificationBell } from "../notifications/NotificationBell"
import { clsx } from "clsx"

export function AppShell() {
  const { user, logout } = useAuth()
  const { language, setLanguage, t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    // A full hard navigation, not client-side routing: this guarantees a
    // clean slate (no in-flight React state, no stale TanStack Query cache)
    // and avoids a race with ProtectedRoute's own reactive redirect, which
    // captures the current page as `from` — an imperative navigate() here
    // was observed to lose that race and land the *next* login back on the
    // page the previous session was viewing when it logged out.
    window.location.href = "/login"
  }

  if (!user) return null
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-ink-50">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 transform bg-primary-900 text-white transition-transform lg:static lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-400 text-sm font-bold text-primary-950">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">{t("appName")}</span>
        </div>
        <nav className="mt-2 flex flex-col gap-0.5 px-3" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/app"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "focus-ring rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary-700 text-white" : "text-primary-100 hover:bg-primary-800",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-primary-800 p-4">
          <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
          <p className="text-xs text-primary-200">{ROLE_LABEL[user.role]}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="focus-ring mt-3 w-full rounded-md bg-primary-800 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="focus-ring rounded-md p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <div className="hidden text-sm text-ink-500 lg:block">
            {ROLE_LABEL[user.role]} workspace — Niphad-Lasalgaon onion pilot
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="focus-ring rounded-md border border-ink-300 bg-white px-2 py-1.5 text-sm text-ink-700"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeLabel}
                </option>
              ))}
            </select>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
