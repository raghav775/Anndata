import {
  BarChart3,
  ClipboardCheck,
  Gavel,
  Handshake,
  Route,
  ScanSearch,
  Sprout,
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { useI18n } from "../context/I18nContext"
import { LANGUAGES } from "../i18n/translations"

const WORKFLOW_STEPS = [
  { key: 1, icon: Sprout, title: "landing.step1Title", body: "landing.step1Body" },
  { key: 2, icon: ScanSearch, title: "landing.step2Title", body: "landing.step2Body" },
  { key: 3, icon: BarChart3, title: "landing.step3Title", body: "landing.step3Body" },
  { key: 4, icon: Truck, title: "landing.step4Title", body: "landing.step4Body" },
  { key: 5, icon: Wallet, title: "landing.step5Title", body: "landing.step5Body" },
  { key: 6, icon: Route, title: "landing.step6Title", body: "landing.step6Body" },
]

const ROLES = [
  { icon: Sprout, title: "role.FARMER", desc: "landing.roleFarmerDesc" },
  { icon: Handshake, title: "role.FPO_AGENT", desc: "landing.roleFpoDesc" },
  { icon: Wallet, title: "role.BUYER", desc: "landing.roleBuyerDesc" },
  { icon: ClipboardCheck, title: "role.ASSAYER", desc: "landing.roleAssayerDesc" },
  { icon: Truck, title: "role.TRANSPORTER", desc: "landing.roleTransporterDesc" },
  { icon: Gavel, title: "role.ADMIN", desc: "landing.roleAdminDesc" },
]

const TECH = ["React", "TypeScript", "Tailwind CSS", "FastAPI", "SQLAlchemy", "SQLite", "JWT Auth", "WebSockets"]

export function LandingPage() {
  const { t, language, setLanguage } = useI18n()

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-sm">
              <Sprout className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">{t("common.appName")}</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-600 sm:flex">
            <a href="#how-it-works" className="transition-colors hover:text-primary-700">{t("landing.navHow")}</a>
            <a href="#transparency" className="transition-colors hover:text-primary-700">{t("landing.navTransparency")}</a>
            <a href="#roles" className="transition-colors hover:text-primary-700">{t("landing.navRoles")}</a>
            <a href="#demo" className="transition-colors hover:text-primary-700">{t("landing.navDemo")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="focus-ring hidden rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm text-ink-700 sm:block"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.nativeLabel}</option>
              ))}
            </select>
            <Link to="/login">
              <Button size="sm">{t("landing.login")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-mesh relative overflow-hidden border-b border-ink-100">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 ring-1 ring-inset ring-primary-200">
            {t("landing.eyebrow")}
          </span>
          <h1 className="text-balance mt-6 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">{t("landing.heroBody")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/login">
              <Button size="lg">{t("landing.getStarted")}</Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="secondary">{t("landing.seeDemo")}</Button>
            </a>
          </div>
          <p className="mt-8 max-w-2xl text-xs leading-relaxed text-ink-500">{t("landing.disclaimer")}</p>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-danger-500">{t("landing.problemLabel")}</h2>
            <p className="mt-3 leading-relaxed text-ink-700">{t("landing.problemBody")}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-primary-700">{t("landing.solutionLabel")}</h2>
            <p className="mt-3 leading-relaxed text-ink-700">{t("landing.solutionBody")}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-ink-100 bg-ink-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">{t("landing.howItWorks")}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step) => (
              <div key={step.key} className="card-surface p-6 transition-shadow hover:shadow-[var(--shadow-lifted)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-ink-900">{t(step.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{t(step.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency: net realizable price */}
      <section id="transparency" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-ink-900">{t("landing.transparencyTitle")}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{t("landing.transparencyBody")}</p>
        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink-200 p-6">
            <p className="text-sm font-semibold text-ink-500">{t("landing.buyerA")}</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink-900">
              ₹30.00<span className="text-sm font-medium text-ink-400"> {t("landing.grossLabel")}</span>
            </p>
            <p className="mt-2 text-sm font-medium text-danger-500">− ₹4.00/kg {t("landing.deductionsLabel")}</p>
            <p className="mt-4 border-t border-ink-100 pt-4 font-display text-xl font-bold text-ink-900">
              ₹26.00<span className="text-sm font-medium text-ink-400"> {t("landing.netLabel")}</span>
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary-400 bg-primary-50 p-6">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary-200/50" />
            <p className="relative text-sm font-semibold text-primary-700">{t("landing.buyerBBetter")}</p>
            <p className="relative mt-1 font-display text-3xl font-bold text-ink-900">
              ₹29.00<span className="text-sm font-medium text-ink-400"> {t("landing.grossLabel")}</span>
            </p>
            <p className="relative mt-2 text-sm font-medium text-danger-500">− ₹1.50/kg {t("landing.deductionsLabel")}</p>
            <p className="relative mt-4 border-t border-primary-200 pt-4 font-display text-2xl font-bold text-primary-800">
              ₹27.50<span className="text-sm font-medium text-primary-500"> {t("landing.netLabel")}</span>
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-ink-500">{t("landing.transparencyFooter")}</p>
      </section>

      {/* Roles */}
      <section id="roles" className="border-t border-ink-100 bg-ink-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">{t("landing.rolesTitle")}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.title} className="card-surface p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-ink-900">{t(r.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{t(r.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo transaction */}
      <section id="demo" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-ink-900">{t("landing.demoTitle")}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{t("landing.demoBody")}</p>
        <div className="mt-8 overflow-x-auto rounded-2xl bg-ink-900 p-6 font-mono text-xs text-ink-100 sm:text-sm">
          <p>Kavita Shinde · 420kg&nbsp;&nbsp;+&nbsp;&nbsp;Ganesh Patil · 680kg&nbsp;&nbsp;+&nbsp;&nbsp;Rajendra Jadhav · 900kg&nbsp;&nbsp;=&nbsp;&nbsp;2,000kg lot</p>
          <p className="mt-2 text-primary-300">→ preliminary screening → physical assessment (Grade B) → 2 buyer offers</p>
          <p className="mt-2 text-primary-300">→ net-price comparison → purchase order → transport → storage → delivery</p>
          <p className="mt-2 text-primary-300">→ payment → itemized settlement per farmer → dispute → resolution</p>
        </div>
        <p className="mt-4 text-xs text-ink-400">{t("landing.demoFooter")}</p>
      </section>

      {/* Metrics */}
      <section className="border-t border-ink-100 bg-gradient-to-br from-primary-950 to-primary-800 py-16 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
          <div>
            <p className="font-display text-2xl font-bold">Onion</p>
            <p className="mt-1 text-sm text-primary-200">{t("landing.metricCommodity")}</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold">Niphad-Lasalgaon</p>
            <p className="mt-1 text-sm text-primary-200">{t("landing.metricCluster")}</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold">FPO</p>
            <p className="mt-1 text-sm text-primary-200">{t("landing.metricAggregation")}</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold">{t("landing.metricSettlementValue")}</p>
            <p className="mt-1 text-sm text-primary-200">{t("landing.metricSettlement")}</p>
          </div>
        </div>
      </section>

      {/* Tech */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-ink-900">{t("landing.techTitle")}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{t("landing.techBody")}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {TECH.map((tech) => (
            <span key={tech} className="rounded-full bg-ink-100 px-3.5 py-1.5 text-sm font-medium text-ink-700">{tech}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-100 bg-ink-50/60 py-20 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-md">
            <Users className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="font-display text-3xl font-bold text-ink-900">{t("landing.ctaTitle")}</h2>
        <div className="mt-7">
          <Link to="/login">
            <Button size="lg">{t("landing.ctaButton")}</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-400">{t("landing.footer")}</footer>
    </div>
  )
}
