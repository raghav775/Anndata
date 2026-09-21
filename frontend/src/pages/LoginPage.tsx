import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { getApiErrorMessage } from "../lib/api"
import { Button } from "../components/ui/Button"

const DEMO_ACCOUNTS = [
  { role: "Farmer", email: "farmer@annadata.demo" },
  { role: "FPO Agent", email: "fpo@annadata.demo" },
  { role: "Buyer", email: "buyer@annadata.demo" },
  { role: "Assayer", email: "assayer@annadata.demo" },
  { role: "Transporter", email: "transporter@annadata.demo" },
  { role: "Admin", email: "admin@annadata.demo" },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
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
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      const message = getApiErrorMessage(err, "Login failed. Check your email and password.")
      setError(message)
      showToast(message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <div className="hidden flex-col justify-center rounded-xl bg-primary-900 p-8 text-white md:flex">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-400 font-bold text-primary-950">
            A
          </div>
          <h1 className="text-2xl font-semibold">AnnData</h1>
          <p className="mt-2 text-primary-100">
            FPO-assisted transparent agricultural market and settlement platform. Pilot: onion, Niphad-Lasalgaon,
            Nashik.
          </p>
          <div className="mt-8 space-y-2 text-sm text-primary-100">
            <p>· Compare net realizable price, not just gross price</p>
            <p>· Physical quality assessment is authoritative</p>
            <p>· Every farmer sees an itemized settlement</p>
            <p>· Every important change is audit-logged</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-ink-200">
          <h2 className="text-xl font-semibold text-ink-900">Log in</h2>
          <p className="mt-1 text-sm text-ink-500">Use a demo account below, or your own credentials.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
                placeholder="you@annadata.demo"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Log in
            </Button>
          </form>

          <div className="mt-6 border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
              Demo accounts (password: Demo@123)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => {
                    setEmail(acct.email)
                    setPassword("Demo@123")
                  }}
                  className="focus-ring rounded-md border border-ink-200 px-2 py-1.5 text-left text-xs text-ink-600 hover:border-primary-300 hover:bg-primary-50"
                >
                  <span className="block font-medium text-ink-800">{acct.role}</span>
                  <span className="block truncate text-ink-400">{acct.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
