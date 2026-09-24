import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "../../src/context/AuthContext"

vi.mock("../../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/api")>("../../src/lib/api")
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  }
})

import { ACCESS_TOKEN_KEY, api, REFRESH_TOKEN_KEY } from "../../src/lib/api"

function Probe() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div>loading</div>
  return <div>user: {user?.full_name ?? "none"}</div>
}

describe("AuthContext.loadCurrentUser", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    localStorage.clear()
    localStorage.setItem(ACCESS_TOKEN_KEY, "some-access-token")
    localStorage.setItem(REFRESH_TOKEN_KEY, "some-refresh-token")
  })

  it("clears stored tokens when /auth/me genuinely rejects the token (401)", async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { error: { code: "UNAUTHORIZED", message: "Invalid token" } } },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument())
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
  })

  it("does NOT clear stored tokens when /auth/me fails for a network/cold-start reason", async () => {
    // No `response` at all - the connection-level failure a Render cold
    // start (or a dropped network) produces. A valid session must survive
    // this: wiping tokens here would silently log the user out even
    // though nothing about their session was actually invalid.
    vi.mocked(api.get).mockRejectedValueOnce({ isAxiosError: true, response: undefined })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument())
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("some-access-token")
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("some-refresh-token")
  })
})
