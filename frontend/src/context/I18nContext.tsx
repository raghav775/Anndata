import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { dict, type LanguageCode } from "../i18n/translations"

type Vars = Record<string, string | number>

interface I18nContextValue {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  /** Translates a dictionary key, optionally interpolating {placeholders}. */
  t: (key: string, vars?: Vars) => string
  /** Translates a backend enum value (lot/offer/payment/dispute/shipment
   * status, grade, buyer type, ...) using the shared "status.*"/"grade.*"/
   * "buyerType.*" namespace, so every status pill on screen is localized
   * from the same source as the rest of the UI. */
  tStatus: (value: string) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)
const STORAGE_KEY = "annadata_language"

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored as LanguageCode) || "en"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-lang", language)
    document.documentElement.setAttribute("lang", language)
  }, [language])

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }, [])

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const entry = dict[key]
      const template = entry ? (entry[language] ?? entry.en) : key
      return interpolate(template, vars)
    },
    [language],
  )

  const tStatus = useCallback(
    (value: string) => {
      for (const prefix of ["status", "grade", "buyerType", "role"]) {
        const entry = dict[`${prefix}.${value}`]
        if (entry) return entry[language] ?? entry.en
      }
      return value.replace(/_/g, " ")
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t, tStatus }), [language, setLanguage, t, tStatus])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
