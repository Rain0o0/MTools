import secrets
import time
from dataclasses import dataclass

from mtools.contracts.models import AppError


@dataclass(frozen=True)
class Session:
    csrf_token: str
    expires_at: float


class SessionStore:
    """维护单进程短期会话，限制数量并在服务重启时失效。"""

    def __init__(self, ttl: int, maximum: int) -> None:
        self.ttl = ttl
        self.maximum = maximum
        self.items: dict[str, Session] = {}

    def get(self, session_id: str | None) -> Session | None:
        session = self.items.get(session_id or "")
        if session and session.expires_at > time.monotonic():
            return session
        return None

    def create(self) -> tuple[str, Session]:
        now = time.monotonic()
        self.items = {key: value for key, value in self.items.items() if value.expires_at > now}
        if len(self.items) >= self.maximum:
            raise AppError(429, "SESSION_LIMIT", "会话数量已达上限，请稍后重试")
        session_id = secrets.token_urlsafe(32)
        session = Session(secrets.token_urlsafe(32), now + self.ttl)
        self.items[session_id] = session
        return session_id, session
