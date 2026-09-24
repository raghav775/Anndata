import { Gavel, Handshake, ShieldCheck, Sprout, Truck, Wallet } from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { getApiErrorMessage } from "../lib/api"
import { Button } from "../components/ui/Button"

const DEMO_ACCOUNTS = [
  { roleKey: "role.FARMER", email: "farmer@annadata.demo", icon: Sprout },
  { roleKey: "role.FPO_AGENT", email: "fpo@annadata.demo", icon: Handshake },
  { roleKey: "role.BUYER", email: "buyer@annadata.demo", icon: Wallet },
  { roleKey: "role.ASSAYER", email: "assayer@annadata.demo", icon: ShieldCheck },
  { roleKey: "role.TRANSPORTER", email: "transporter@annadata.demo", icon: Truck },
  { roleKey: "role.ADMIN", email: "admin@annadata.demo", icon: Gavel },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("Demo@123")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/app"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      // lib/api.ts's response interceptor retries this request
      // transparently through a cold start (up to ~40s), surfacing a
      // global "waking up" toast while it does - no special handling
      // needed here beyond a normal try/catch.
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      const message = getApiErrorMessage(err, t("auth.loginFailed"))
      setError(message)
      showToast(message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-mesh flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <div className="hidden flex-col justify-center rounded-3xl bg-gradient-to-br from-primary-950 to-primary-800 p-9 text-white shadow-[var(--shadow-panel)] md:flex">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-inner">
            <Sprout className="h-6 w-6 text-primary-950" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold">{t("common.appName")}</h1>
          <p className="mt-2.5 leading-relaxed text-primary-100">{t("auth.heroBody")}</p>
          <div className="mt-9 space-y-3 text-sm text-primary-100">
            {["auth.heroBullet1", "auth.heroBullet2", "auth.heroBullet3", "auth.heroBullet4"].map((key) => (
              <div key={key} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-400" />
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-8 shadow-[var(--shadow-panel)]">
          <h2 className="font-display text-xl font-bold text-ink-900">{t("auth.title")}</h2>
          <p className="mt-1 text-sm text-ink-500">{t("auth.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1.5"
                placeholder="you@annadata.demo"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700">
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1.5"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {t("auth.login")}
            </Button>
          </form>

          <div className="mt-7 border-t border-ink-100 pt-5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">{t("auth.demoAccountsLabel")}</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => {
                    setEmail(acct.email)
                    setPassword("Demo@123")
                  }}
                  className="focus-ring flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-2 text-left text-xs text-ink-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
                >
                  <acct.icon className="h-4 w-4 flex-shrink-0 text-primary-500" />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink-800">{t(acct.roleKey)}</span>
                    <span className="block truncate text-ink-400">{acct.email}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
