import { useMutation } from "@tanstack/react-query"
import { Wallet } from "lucide-react"
import { useState } from "react"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { StatusBadge } from "../components/ui/Badge"
import { EmptyState, ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import { useInvalidate, usePayments } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"
import type { Payment } from "../types"

export function PaymentsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { data: payments, isLoading, isError } = usePayments()
  const invalidate = useInvalidate()
  const { showToast } = useToast()
  const [payAmount, setPayAmount] = useState<Record<number, string>>({})

  const initiate = useMutation({
    mutationFn: async (id: number) => (await api.post(`/payments/${id}/initiate`)).data,
    onSuccess: () => {
      invalidate([["payments"]])
      showToast(t("payments.initiatedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const pay = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => (await api.post(`/payments/${id}/pay`, { amount })).data,
    onSuccess: () => {
      invalidate([["payments"], ["lots"], ["settlements"]])
      showToast(t("payments.paidToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{t("payments.title")}</h1>
        <p className="text-sm text-ink-500">{t("payments.subtitle")}</p>
      </div>

      <Card>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message={t("payments.couldNotLoad")} />}
        {payments && payments.length === 0 && <EmptyState icon={Wallet} title={t("payments.noPayments")} />}
        {payments && payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("payments.colPo")}</th>
                  <th className="pb-2 pr-4">{t("payments.colDue")}</th>
                  <th className="pb-2 pr-4">{t("payments.colReceived")}</th>
                  <th className="pb-2 pr-4">{t("payments.colStatus")}</th>
                  {user?.role === "BUYER" && <th className="pb-2">{t("payments.colAction")}</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((p: Payment) => (
                  <tr key={p.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink-800">PO #{p.purchase_order_id}</td>
                    <td className="py-3 pr-4">₹{p.amount_due.toLocaleString("en-IN")}</td>
                    <td className="py-3 pr-4">₹{p.amount_received.toLocaleString("en-IN")}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={p.status} />
                    </td>
                    {user?.role === "BUYER" && (
                      <td className="py-3">
                        {p.status === "PAYMENT_PENDING" || p.status === "DISPATCHED" || p.status === "DELIVERED" ? (
                          <Button size="sm" variant="secondary" isLoading={initiate.isPending} onClick={() => initiate.mutate(p.id)}>
                            {t("payments.initiate")}
                          </Button>
                        ) : p.status === "PAYMENT_INITIATED" || p.status === "PARTIALLY_PAID" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={t("payments.amountPlaceholder")}
                              value={payAmount[p.id] ?? ""}
                              onChange={(e) => setPayAmount({ ...payAmount, [p.id]: e.target.value })}
                              className="input w-28"
                            />
                            <Button
                              size="sm"
                              isLoading={pay.isPending}
                              onClick={() => pay.mutate({ id: p.id, amount: Number(payAmount[p.id] ?? p.amount_due - p.amount_received) })}
                            >
                              {t("payments.pay")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">{t("payments.completed")}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
