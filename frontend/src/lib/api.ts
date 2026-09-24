import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"

export const ACCESS_TOKEN_KEY = "annadata_access_token"
export const REFRESH_TOKEN_KEY = "annadata_refresh_token"

export const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  try {
    const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
    const { access_token, refresh_token } = resp.data
    localStorage.setItem(ACCESS_TOKEN_KEY, access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
    return access_token
  } catch {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    return null
  }
}

// --- Cold-start resilience ---------------------------------------------
//
// The backend runs on a free-tier host that spins down after 15 minutes
// idle. The keep-alive ping that's supposed to prevent that (a GitHub
// Actions scheduled workflow) turned out to be unreliable in practice -
// GitHub's `schedule` trigger is documented as best-effort and was
// observed firing hours apart instead of every 10 minutes - so cold
// starts are a real, recurring condition this client has to handle
// gracefully every time, not an edge case.
//
// A cold start can surface as either a connection-level failure (no
// `response` at all - the usual case) or, since the backend sits behind
// Cloudflare, a gateway-timeout status if Cloudflare gives up waiting on
// the still-booting origin (502/503/504/522/523/524).
const RETRIABLE_STATUS_CODES = new Set([502, 503, 504, 522, 523, 524])
const WAKE_RETRY_ATTEMPTS = 8
const WAKE_RETRY_DELAY_MS = 5000

function isLikelyColdStart(error: AxiosError): boolean {
  if (!error.response) return true
  return RETRIABLE_STATUS_CODES.has(error.response.status)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// GET requests are safe to retry blindly (idempotent). Login is too - it
// has no side effect beyond issuing a fresh token pair, so retrying it
// can't double-submit anything. Other mutations (POST/PUT/PATCH/DELETE)
// are deliberately NOT auto-retried here: if a request timed out after
// the server had already started processing it, blindly resubmitting
// could duplicate the action (e.g. a lot or an offer). Those surface a
// clear "server may be waking up" message instead so the user's own
// retry click is the one that runs.
function isSafeToAutoRetry(config: InternalAxiosRequestConfig): boolean {
  const method = (config.method ?? "get").toLowerCase()
  if (method === "get") return true
  return method === "post" && !!config.url?.includes("/auth/login")
}

let activeWakeEpisodes = 0

function beginWakeEpisode() {
  activeWakeEpisodes += 1
  if (activeWakeEpisodes === 1) {
    window.dispatchEvent(new CustomEvent("annadata:backend-waking"))
  }
}

function endWakeEpisode() {
  activeWakeEpisodes = Math.max(0, activeWakeEpisodes - 1)
  if (activeWakeEpisodes === 0) {
    window.dispatchEvent(new CustomEvent("annadata:backend-awake"))
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _wakeAttempt?: number })
      | undefined

    if (originalRequest && isLikelyColdStart(error) && isSafeToAutoRetry(originalRequest)) {
      const attempt = (originalRequest._wakeAttempt ?? 0) + 1
      if (attempt <= WAKE_RETRY_ATTEMPTS) {
        originalRequest._wakeAttempt = attempt
        if (attempt === 1) beginWakeEpisode()
        try {
          await sleep(WAKE_RETRY_DELAY_MS)
          const result = await api(originalRequest)
          endWakeEpisode()
          return result
        } catch (retryError) {
          if (attempt === WAKE_RETRY_ATTEMPTS) endWakeEpisode()
          throw retryError
        }
      }
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newToken = await refreshPromise
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }
      window.dispatchEvent(new CustomEvent("annadata:session-expired"))
    }
    return Promise.reject(error)
  },
)

/** True when an error is a cold-start-pattern failure that exhausted its
 * retries (as opposed to a real validation/permission error), so callers
 * can show "the server may still be waking up, try again" instead of a
 * generic error message. */
export function isColdStartFailure(error: unknown): boolean {
  return axios.isAxiosError(error) && isLikelyColdStart(error)
}

export interface ApiErrorShape {
  error: { code: string; message: string }
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined
    if (data?.error?.message) return data.error.message
    if (isColdStartFailure(error)) {
      return "The server may still be waking up from idle (free hosting) — please try again in a moment."
    }
    if (error.message) return error.message
  }
  return fallback
}
