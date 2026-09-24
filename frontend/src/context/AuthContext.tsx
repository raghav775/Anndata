import axios from "axios"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { ACCESS_TOKEN_KEY, api, REFRESH_TOKEN_KEY } from "../lib/api"
import type { User } from "../types"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      const resp = await api.get<User>("/auth/me")
      setUser(resp.data)
    } catch (err) {
      // Only a genuine auth failure (expired/invalid token, already
      // retried by the response interceptor) means the session is really
      // over. Anything else - the backend waking from idle, a dropped
      // connection - is transient: clearing tokens here would silently
      // log out a user with a perfectly valid session just because a
      // request failed once. Leave the stored tokens alone so the next
      // successful load (or a manual refresh) can recover.
      const isAuthFailure = axios.isAxiosError(err) && err.response?.status === 401
      if (isAuthFailure) {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCurrentUser()
    const onExpired = () => {
      setUser(null)
    }
    window.addEventListener("annadata:session-expired", onExpired)
    return () => window.removeEventListener("annadata:session-expired", onExpired)
  }, [loadCurrentUser])

  const login = useCallback(async (email: string, password: string) => {
    const resp = await api.post("/auth/login", { email, password })
    localStorage.setItem(ACCESS_TOKEN_KEY, resp.data.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, resp.data.refresh_token)
    const meResp = await api.get<User>("/auth/me")
    setUser(meResp.data)
    return meResp.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
