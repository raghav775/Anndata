import { useEffect, useRef, useState } from "react"
import type { StorageEvent } from "../types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"

function toWebSocketUrl(facilityId: number): string {
  const wsBase = API_BASE_URL.replace(/^http/, "ws")
  return `${wsBase}/storage/ws/${facilityId}`
}

/** Connects to the live simulated IoT stream for a facility. Falls back
 * silently to whatever history/polling the caller already has if the socket
 * can't connect — the demo remains usable either way. */
export function useStorageSocket(facilityId: number | undefined) {
  const [latest, setLatest] = useState<StorageEvent | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!facilityId) return
    let cancelled = false
    const ws = new WebSocket(toWebSocketUrl(facilityId))
    wsRef.current = ws

    ws.onopen = () => !cancelled && setConnected(true)
    ws.onclose = () => !cancelled && setConnected(false)
    ws.onerror = () => !cancelled && setConnected(false)
    ws.onmessage = (event) => {
      if (cancelled) return
      try {
        const payload = JSON.parse(event.data) as StorageEvent
        setLatest(payload)
      } catch {
        // ignore malformed frames
      }
    }

    return () => {
      cancelled = true
      ws.close()
    }
  }, [facilityId])

  return { latest, connected }
}
