import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { StatusBadge } from "../../src/components/ui/Badge"
import { I18nProvider } from "../../src/context/I18nContext"

function withI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>)
}

describe("StatusBadge", () => {
  it("renders a known status translated via the shared status dictionary", () => {
    withI18n(<StatusBadge status="OPEN_FOR_OFFERS" />)
    expect(screen.getByText("Open for Offers")).toBeInTheDocument()
  })

  it("renders a disputed lot status distinctly from a settled one", () => {
    const { container: disputed } = withI18n(<StatusBadge status="DISPUTED" />)
    const { container: settled } = withI18n(<StatusBadge status="SETTLED" />)
    const disputedClass = disputed.querySelector("span")?.className
    const settledClass = settled.querySelector("span")?.className
    expect(disputedClass).not.toEqual(settledClass)
  })

  it("falls back to underscore-replaced text for an unrecognized status", () => {
    withI18n(<StatusBadge status="SOMETHING_UNKNOWN" />)
    expect(screen.getByText("SOMETHING UNKNOWN")).toBeInTheDocument()
  })
})
