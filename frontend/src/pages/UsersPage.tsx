import { useMutation } from "@tanstack/react-query"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useToast } from "../context/ToastContext"
import { useBuyers, useInvalidate, useUsers } from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"

export function UsersPage() {
  const { data: users, isLoading, isError } = useUsers()
  const { data: buyers } = useBuyers()
  const invalidate = useInvalidate()
  const { showToast } = useToast()

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/users/${id}/status`, null, { params: { is_active: isActive } })).data,
    onSuccess: () => {
      invalidate([["users"]])
      showToast("User status updated", "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  const verifyBuyer = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.patch(`/buyers/${id}/verification`, null, { params: { status } })).data,
    onSuccess: () => {
      invalidate([["buyers"]])
      showToast("Buyer verification updated", "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Users</h1>
        <p className="text-sm text-ink-500">Manage accounts and buyer verification status.</p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink-700">All users</h2>
        {isLoading && <SkeletonCard />}
        {isError && <ErrorState message="Could not load users." />}
        {users && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-ink-50">
                    <td className="py-2 pr-4 font-medium text-ink-800">{u.full_name}</td>
                    <td className="py-2 pr-4 text-ink-500">{u.email}</td>
                    <td className="py-2 pr-4"><Badge tone="neutral">{u.role.replace(/_/g, " ")}</Badge></td>
                    <td className="py-2 pr-4">
                      <Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.is_active })}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
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
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Buyer verification</h2>
        <div className="space-y-2">
          {(buyers ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-ink-800">{b.organization_name}</p>
                <p className="text-xs text-ink-400">{b.buyer_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={b.verification_status === "VERIFIED" ? "success" : "neutral"}>{b.verification_status}</Badge>
                {b.verification_status !== "VERIFIED" && (
                  <Button size="sm" isLoading={verifyBuyer.isPending} onClick={() => verifyBuyer.mutate({ id: b.id, status: "VERIFIED" })}>
                    Verify
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
