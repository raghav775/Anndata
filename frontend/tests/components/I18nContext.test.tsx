import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { I18nProvider, useI18n } from "../../src/context/I18nContext"

function LanguageProbe() {
  const { language, setLanguage, t, tStatus } = useI18n()
  return (
    <div>
      <p data-testid="current-lang">{language}</p>
      <p data-testid="translated">{t("nav.dashboard")}</p>
      <p data-testid="interpolated">{t("farmerDash.welcome", { name: "Kavita" })}</p>
      <p data-testid="status">{tStatus("OPEN_FOR_OFFERS")}</p>
      <button onClick={() => setLanguage("mr")}>Switch to Marathi</button>
      <button onClick={() => setLanguage("hi")}>Switch to Hindi</button>
    </div>
  )
}

describe("I18nContext", () => {
  it("defaults to English and translates a known key", () => {
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    )
    expect(screen.getByTestId("current-lang")).toHaveTextContent("en")
    expect(screen.getByTestId("translated")).toHaveTextContent("Dashboard")
  })

  it("interpolates {placeholders} in a translated string", () => {
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    )
    expect(screen.getByTestId("interpolated")).toHaveTextContent("Welcome, Kavita")
  })

  it("translates a backend status enum via tStatus", () => {
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    )
    expect(screen.getByTestId("status")).toHaveTextContent("Open for Offers")
  })

  it("switches language and updates translated text for major labels, including interpolated and status strings", async () => {
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Switch to Marathi" }))
    expect(screen.getByTestId("current-lang")).toHaveTextContent("mr")
    expect(screen.getByTestId("translated")).toHaveTextContent("डॅशबोर्ड")
    expect(screen.getByTestId("interpolated")).toHaveTextContent("स्वागत आहे, Kavita")
    expect(screen.getByTestId("status")).toHaveTextContent("ऑफरसाठी खुले")

    await userEvent.click(screen.getByRole("button", { name: "Switch to Hindi" }))
    expect(screen.getByTestId("translated")).toHaveTextContent("डैशबोर्ड")
  })

  it("persists the selected language to localStorage", async () => {
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Switch to Marathi" }))
    expect(localStorage.getItem("annadata_language")).toBe("mr")
  })
})
