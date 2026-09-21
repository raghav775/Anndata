import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { I18nProvider, useI18n } from "../../src/context/I18nContext"

function LanguageProbe() {
  const { language, setLanguage, t } = useI18n()
  return (
    <div>
      <p data-testid="current-lang">{language}</p>
      <p data-testid="translated">{t("dashboard")}</p>
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

  it("switches language and updates translated text for major labels", async () => {
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Switch to Marathi" }))
    expect(screen.getByTestId("current-lang")).toHaveTextContent("mr")
    expect(screen.getByTestId("translated")).toHaveTextContent("डॅशबोर्ड")

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
