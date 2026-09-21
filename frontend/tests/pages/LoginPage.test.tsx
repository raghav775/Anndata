import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider } from "../../src/context/AuthContext"
import { ToastProvider } from "../../src/context/ToastContext"
import { LoginPage } from "../../src/pages/LoginPage"

vi.mock("../../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/api")>("../../src/lib/api")
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  }
})

import { api } from "../../src/lib/api"

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<div>Dashboard landed</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    localStorage.clear()
  })

  it("logs in successfully and navigates to the app", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: null }) // initial /auth/me on mount (no token)
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: "access-token", refresh_token: "refresh-token", token_type: "bearer" },
    })
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { id: 1, email: "farmer@annadata.demo", full_name: "Kavita Shinde", role: "FARMER", phone: null, preferred_language: "en", is_active: true },
    })

    renderLoginPage()

    await userEvent.type(screen.getByLabelText("Email"), "farmer@annadata.demo")
    await userEvent.clear(screen.getByLabelText("Password"))
    await userEvent.type(screen.getByLabelText("Password"), "Demo@123")
    await userEvent.click(screen.getByRole("button", { name: "Log in" }))

    await waitFor(() => expect(screen.getByText("Dashboard landed")).toBeInTheDocument())
    expect(localStorage.getItem("annadata_access_token")).toBe("access-token")
  })

  it("shows an error message when login fails and does not navigate", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: null })
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: { code: "UNAUTHORIZED", message: "Invalid email or password" } } },
    })

    renderLoginPage()

    await userEvent.type(screen.getByLabelText("Email"), "farmer@annadata.demo")
    await userEvent.clear(screen.getByLabelText("Password"))
    await userEvent.type(screen.getByLabelText("Password"), "wrong")
    await userEvent.click(screen.getByRole("button", { name: "Log in" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password")
    expect(screen.queryByText("Dashboard landed")).not.toBeInTheDocument()
  })

  it("fills the email field when a demo account button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: null })
    renderLoginPage()

    await userEvent.click(screen.getByText("admin@annadata.demo"))
    expect(screen.getByLabelText("Email")).toHaveValue("admin@annadata.demo")
  })
})
