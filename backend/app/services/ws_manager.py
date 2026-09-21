"""Minimal in-process WebSocket connection manager.

Groups connections by a string channel (e.g. "notifications:42" or
"storage:3") and broadcasts JSON-serializable payloads to every connection
on that channel. In-process only — sufficient for a single-instance demo
deployment; a multi-instance production deployment would back this with a
pub/sub layer such as Redis.
"""

import asyncio
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._channels[channel].add(websocket)

    async def disconnect(self, channel: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._channels[channel].discard(websocket)
            if not self._channels[channel]:
                self._channels.pop(channel, None)

    async def broadcast(self, channel: str, payload: dict) -> None:
        for ws in list(self._channels.get(channel, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                await self.disconnect(channel, ws)


notification_manager = ConnectionManager()
storage_manager = ConnectionManager()
