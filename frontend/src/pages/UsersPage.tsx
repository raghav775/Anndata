import { useMutation } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { useBuyers, useInvalidate, useUsers } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

export function UsersPage() {
  const { t } = useI18n()
  const { data: users, isLoading, isError } = useUsers()
  const { data: buyers } = useBuyers()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/users/${id}/status`, null, { params: { is_active: isActive } })).data,
    onSuccess: () => {
      invalidate([["users"]])
      showToast(t("users.statusUpdatedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const verifyBuyer = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.patch(`/buyers/${id}/verification`, null, { params: { status } })).data,
    onSuccess: () => {
      invalidate([["buyers"]])
      showToast(t("users.verificationUpdatedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("users.title")}</h1>
        <p className="text-sm text-ink-500">{t("users.subtitle")}</p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink-700">{t("users.allUsers")}</h2>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("users.couldNotLoad")} />}
        {users && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("users.colName")}</th>
                  <th className="pb-2 pr-4">{t("users.colEmail")}</th>
                  <th className="pb-2 pr-4">{t("users.colRole")}</th>
                  <th className="pb-2 pr-4">{t("users.colStatus")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-ink-800">{u.full_name}</td>
                    <td className="py-2.5 pr-4 text-ink-500">{u.email}</td>
                    <td className="py-2.5 pr-4"><Badge tone="neutral">{t(`role.${u.role}`)}</Badge></td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? t("users.active") : t("users.inactive")}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.is_active })}
                      >
                        {u.is_active ? t("users.deactivate") : t("users.activate")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700">
          <ShieldCheck className="h-4 w-4 text-primary-500" />
          {t("users.buyerVerification")}
        </h2>
        <div className="space-y-2">
          {(buyers ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-ink-800">{b.organization_name}</p>
                <p className="text-xs text-ink-400">{t(`buyerType.${b.buyer_type}`)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={b.verification_status === "VERIFIED" ? "success" : "neutral"}>{t(`status.${b.verification_status}`)}</Badge>
                {b.verification_status !== "VERIFIED" && (
                  <Button size="sm" isLoading={verifyBuyer.isPending} onClick={() => verifyBuyer.mutate({ id: b.id, status: "VERIFIED" })}>
                    {t("users.verify")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
