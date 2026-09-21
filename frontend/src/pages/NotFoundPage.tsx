import { CompassIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { useI18n } from "../context/I18nContext"

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-50 px-4 text-center">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <CompassIcon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-primary-600">{t("notFound.code")}</p>
      <h1 className="font-display text-2xl font-bold text-ink-900">{t("notFound.title")}</h1>
      <p className="max-w-sm text-sm text-ink-500">{t("notFound.desc")}</p>
      <Link to="/">
        <Button className="mt-2">{t("notFound.backHome")}</Button>
      </Link>
    </div>
  )
}
