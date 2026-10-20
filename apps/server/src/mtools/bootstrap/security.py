import secrets
import time
from typing import Protocol
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from mtools.bootstrap.config import Settings
from mtools.contracts.models import AppError, ErrorInfo, ErrorResponse
from mtools.platform.session import SessionStore


class RequestLog(Protocol):
    def info(self, message: str, *, extra: dict[str, object]) -> None: ...


def error_response(error: AppError, request_id: str) -> JSONResponse:
    return JSONResponse(
        ErrorResponse(
            error=ErrorInfo(code=error.code, message=error.message), request_id=request_id
        ).model_dump(),
        status_code=error.status,
    )


class SecurityMiddleware:
    """限制 Host、来源、会话、CSRF 与请求体，附加请求关联和安全响应头。"""

    def __init__(
        self,
        app: ASGIApp,
        settings: Settings,
        sessions: SessionStore,
        logger: RequestLog,
        desktop_token: str | None = None,
    ) -> None:
        self.app, self.settings, self.sessions, self.logger = app, settings, sessions, logger
        self.desktop_token = desktop_token

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        headers = Headers(scope=scope)
        started = time.monotonic()
        status = 500

        async def secure_send(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                response_headers = MutableHeaders(scope=message)
                response_headers["X-Request-ID"] = request_id
                response_headers["X-Content-Type-Options"] = "nosniff"
                response_headers["Referrer-Policy"] = "no-referrer"
                response_headers["Content-Security-Policy"] = (
                    "default-src 'self'; script-src 'self'; style-src 'self'; "
                    "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; "
                    "base-uri 'none'; form-action 'self'"
                )
                if scope["path"].startswith("/api/"):
                    response_headers["Cache-Control"] = "no-store"
            await send(message)

        try:
            host = headers.get("host", "").split(":")[0]
            if headers.get("host", "").startswith("["):
                host = headers["host"].split("]")[0] + "]"
            if host not in self.settings.allowed_hosts:
                raise AppError(400, "INVALID_HOST", "请求主机不受信任")
            path, method = scope["path"], scope["method"]
            if self.desktop_token and not path.startswith("/health/"):
                if not secrets.compare_digest(
                    headers.get("x-mtools-desktop", ""), self.desktop_token
                ):
                    raise AppError(403, "DESKTOP_ONLY", "请在 MTools 软件窗口中使用此功能")
            if path.startswith("/api/"):
                origin = headers.get("origin")
                if origin and origin not in self.settings.allowed_origins:
                    raise AppError(403, "INVALID_ORIGIN", "请求来源不受信任")
                if headers.get("sec-fetch-site") in ("cross-site", "same-site"):
                    raise AppError(403, "INVALID_ORIGIN", "请从工具箱页面发起请求")
                if path == "/api/v1/session" and method == "POST":
                    if origin not in self.settings.allowed_origins:
                        raise AppError(403, "BOOTSTRAP_DENIED", "请从允许的页面建立会话")
                else:
                    request = Request(scope)
                    session = self.sessions.get(request.cookies.get("mtools_session"))
                    if session is None:
                        raise AppError(401, "SESSION_REQUIRED", "会话已失效，请重新连接")
                    if method not in ("GET", "HEAD", "OPTIONS") and not secrets.compare_digest(
                        headers.get("x-csrf-token", ""), session.csrf_token
                    ):
                        raise AppError(403, "CSRF_FAILED", "安全校验失败，请重新连接")
            if method not in ("GET", "HEAD", "OPTIONS"):
                if path == "/api/v1/artifacts/upload" and method == "POST":
                    received = 0

                    async def bounded_receive() -> Message:
                        nonlocal received
                        message = await receive()
                        received += len(message.get("body", b""))
                        if received > 268_435_456:
                            raise AppError(413, "REQUEST_TOO_LARGE", "单文件不能超过 256 MiB")
                        return message

                    await self.app(scope, bounded_receive, secure_send)
                    return
                body = bytearray()
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    body.extend(message.get("body", b""))
                    if len(body) > self.settings.max_request_bytes:
                        raise AppError(413, "REQUEST_TOO_LARGE", "请求体超过允许大小")
                    if not message.get("more_body", False):
                        break
                sent = False

                async def replay() -> Message:
                    nonlocal sent
                    if not sent:
                        sent = True
                        return {"type": "http.request", "body": bytes(body), "more_body": False}
                    return await receive()

                await self.app(scope, replay, secure_send)
            else:
                await self.app(scope, receive, secure_send)
        except AppError as exc:
            await error_response(exc, request_id)(scope, receive, secure_send)
        finally:
            self.logger.info(
                "http_request",
                extra={
                    "request_id": request_id,
                    "status": status,
                    "duration_ms": round((time.monotonic() - started) * 1000, 2),
                },
            )
