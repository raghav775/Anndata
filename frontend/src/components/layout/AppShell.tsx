import { Languages, LogOut, Menu, Sprout } from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useI18n } from "../../context/I18nContext"
import { LANGUAGES } from "../../i18n/translations"
import { NAV_ITEMS, ROLE_LABEL_KEY } from "../../lib/nav"
import { NotificationBell } from "../notifications/NotificationBell"
import { clsx } from "clsx"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

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
          "fixed inset-y-0 left-0 z-30 flex w-72 transform flex-col bg-gradient-to-b from-primary-950 to-primary-900 text-white transition-transform duration-200 lg:static lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-2.5 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-inner">
            <Sprout className="h-5 w-5 text-primary-950" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">{t("common.appName")}</span>
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Primary">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/app"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "focus-ring group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-primary-200 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-accent-400" />}
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-400 text-xs font-bold text-primary-950">
              {initials(user.full_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
              <p className="truncate text-xs text-primary-300">{t(ROLE_LABEL_KEY[user.role])}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-200 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-ink-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="focus-ring rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t("nav.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-sm text-ink-500 lg:block">
            {t(ROLE_LABEL_KEY[user.role])} {t("nav.workspace")}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Languages className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="focus-ring appearance-none rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-7 text-sm text-ink-700 hover:border-ink-300"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
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
