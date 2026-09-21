import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"

const WORKFLOW_STEPS = [
  { title: "Aggregate", desc: "FPO/collection centre combines produce from multiple farmers into one traceable lot." },
  { title: "Verify", desc: "Preliminary AI screening flags likely grade and defects; a human assayer performs the authoritative physical assessment." },
  { title: "Compare", desc: "Buyer offers are ranked by net realizable price — gross price minus every disclosed deduction — not gross price alone." },
  { title: "Transport", desc: "A coordinated transporter moves the lot; pickup and delivery are tracked end to end." },
  { title: "Settle", desc: "The buyer pays against the purchase order; the FPO distributes an itemized settlement to every contributing farmer." },
  { title: "Trace", desc: "Every important action — from screening to payment to dispute resolution — is recorded in an append-only audit log." },
]

const ROLES = [
  { role: "Farmer", desc: "Views their own produce, lots, offers, settlement and dispute status." },
  { role: "FPO Agent", desc: "Onboards farmers, aggregates lots, compares offers, issues purchase orders, coordinates logistics." },
  { role: "Buyer", desc: "Browses verified lots, submits offers, confirms delivery, pays against purchase orders." },
  { role: "Assayer", desc: "Performs the authoritative physical quality assessment and records evidence." },
  { role: "Transporter", desc: "Tracks assigned shipments from pickup to delivery." },
  { role: "Admin", desc: "Manages verification, users, audit trail and platform-wide analytics." },
]

const METRICS = [
  { label: "Pilot commodity", value: "Onion" },
  { label: "Pilot cluster", value: "Niphad-Lasalgaon, Nashik" },
  { label: "Aggregation model", value: "FPO / Collection Centre" },
  { label: "Settlement", value: "Itemized, per farmer" },
]

export function LandingPage() {
  return (
    <div className="bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-700 text-sm font-bold text-white">
              A
            </div>
            <span className="text-lg font-semibold text-ink-900">AnnData</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-ink-600 sm:flex">
            <a href="#how-it-works" className="hover:text-ink-900">How it works</a>
            <a href="#transparency" className="hover:text-ink-900">Transparency</a>
            <a href="#roles" className="hover:text-ink-900">Roles</a>
            <a href="#demo" className="hover:text-ink-900">Demo transaction</a>
          </nav>
          <Link to="/login">
            <Button size="sm">Log in</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-primary-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-wide text-primary-700">
            Smart India Hackathon 2026 · Problem Statement 26132
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Transparent farm-to-buyer transactions.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            AnnData helps small onion farmers in the Niphad-Lasalgaon cluster aggregate produce through their FPO,
            connect verified lots with verified buyers, compare <strong>net realizable price</strong> instead of gross
            price, and trace every step from collection to settlement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login">
              <Button size="lg">Get started</Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="secondary">See the demo transaction</Button>
            </a>
          </div>
          <p className="mt-6 max-w-2xl text-xs text-ink-400">
            AnnData does not guarantee prices, eliminate every intermediary, provide AI-certified grading, certify
            shelf life, or guarantee buyer payment. It provides transparency, traceability and accountability around a
            transaction that people — FPO agents, assayers, buyers — still carry out.
          </p>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-danger-500">The problem</h2>
            <p className="mt-3 text-ink-700">
              Small onion farmers around Niphad-Lasalgaon often sell through layers of intermediaries with little
              visibility into how the final price they receive was calculated, whether a rejected lot was fairly
              assessed, or when payment will actually arrive.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-700">The AnnData approach</h2>
            <p className="mt-3 text-ink-700">
              Aggregate produce through a trusted FPO, screen and physically assess quality, let verified buyers
              compete on the price a farmer can actually realize after costs, and keep an auditable, itemized record
              of every transaction from lot to settlement.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink-900">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.title} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-ink-200">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency: net realizable price */}
      <section id="transparency" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-ink-900">Net realizable price, not gross price</h2>
        <p className="mt-3 max-w-2xl text-ink-600">
          A higher gross price does not always mean a better outcome for the farmer once transport, loading,
          grading, storage and platform costs are counted. AnnData always shows the breakdown.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border border-ink-200 p-5">
            <p className="text-sm font-medium text-ink-500">Buyer A</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">₹30.00<span className="text-sm font-normal text-ink-400">/kg gross</span></p>
            <p className="mt-2 text-sm text-danger-600">− ₹4.00/kg deductions</p>
            <p className="mt-3 border-t border-ink-100 pt-3 text-lg font-semibold text-ink-900">
              ₹26.00<span className="text-sm font-normal text-ink-400">/kg net</span>
            </p>
          </div>
          <div className="rounded-lg border-2 border-primary-400 bg-primary-50 p-5">
            <p className="text-sm font-medium text-primary-700">Buyer B — better for the farmer</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">₹29.00<span className="text-sm font-normal text-ink-400">/kg gross</span></p>
            <p className="mt-2 text-sm text-danger-600">− ₹1.50/kg deductions</p>
            <p className="mt-3 border-t border-primary-200 pt-3 text-lg font-semibold text-primary-800">
              ₹27.50<span className="text-sm font-normal text-primary-500">/kg net</span>
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-500">
          Buyer B's lower gross price still produces a <strong>₹1.50/kg better</strong> outcome for the farmer because
          its transport, loading and platform costs are lower. AnnData ranks offers by net realization, and shows
          every deduction before an offer is accepted.
        </p>
      </section>

      {/* Roles */}
      <section id="roles" className="border-t border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink-900">Built for every participant</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-ink-200">
                <h3 className="font-semibold text-ink-900">{r.role}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo transaction */}
      <section id="demo" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-ink-900">A complete demo transaction</h2>
        <p className="mt-3 max-w-2xl text-ink-600">
          The platform ships with a full, synthetic 2,000kg onion lot aggregated from three demo farmers, carried all
          the way through screening, assessment, buyer offers, a purchase order, transport, storage, delivery,
          payment, itemized settlement and a resolved dispute — so you can see the whole workflow immediately after
          logging in.
        </p>
        <div className="mt-6 rounded-lg bg-ink-900 p-5 font-mono text-xs text-ink-100 sm:text-sm">
          <p>Kavita Shinde · 420kg  +  Ganesh Patil · 680kg  +  Rajendra Jadhav · 900kg  =  2,000kg lot</p>
          <p className="mt-2 text-primary-300">→ preliminary screening → physical assessment (Grade B) → 2 buyer offers</p>
          <p className="mt-2 text-primary-300">→ net-price comparison → purchase order → transport → storage → delivery</p>
          <p className="mt-2 text-primary-300">→ payment → itemized settlement per farmer → dispute → resolution</p>
        </div>
        <p className="mt-4 text-xs text-ink-400">
          All names, quantities and organizations in the demo are synthetic and used only to illustrate the workflow.
        </p>
      </section>

      {/* Metrics */}
      <section className="border-t border-ink-100 bg-primary-900 py-14 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {METRICS.map((m) => (
            <div key={m.label}>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="mt-1 text-sm text-primary-200">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-ink-900">Built on a fully local, zero-cost stack</h2>
        <p className="mt-3 max-w-2xl text-ink-600">
          React, FastAPI, SQLite and a deterministic local preliminary-screening service — no paid AI API, payment
          gateway or map provider is required to run the complete demo.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm text-ink-600">
          {["React", "TypeScript", "Tailwind CSS", "FastAPI", "SQLAlchemy", "SQLite", "JWT Auth", "WebSockets"].map((tech) => (
            <span key={tech} className="rounded-full bg-ink-100 px-3 py-1">{tech}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-100 bg-ink-50 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink-900">See the whole transaction, start to finish.</h2>
        <div className="mt-6">
          <Link to="/login">
            <Button size="lg">Log in with a demo account</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-400">
        AnnData — built for Smart India Hackathon 2026, Problem Statement 26132. All demo data is synthetic.
      </footer>
    </div>
  )
}
