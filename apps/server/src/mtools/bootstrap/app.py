import json
import socket
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, cast

from fastapi import FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles

from mtools import __version__
from mtools.adapters.logging import create_logger
from mtools.adapters.preferences import PreferenceStore
from mtools.bootstrap.config import Settings
from mtools.bootstrap.security import SecurityMiddleware, error_response
from mtools.bootstrap.tools import assemble_tools
from mtools.contracts.models import (
    AiConnection,
    AppError,
    Capabilities,
    Catalog,
    CatalogEntry,
    ErrorInfo,
    ErrorResponse,
    Health,
    Preferences,
    SessionInfo,
)
from mtools.platform.execution import ToolRuntime
from mtools.platform.session import SessionStore
from mtools.tools.tool_json_formatter.schemas import JsonExecuteRequest, JsonResult


def create_app(settings: Settings | None = None, desktop_token: str | None = None) -> FastAPI:
    """装配平台、受信任工具、错误边界与同源静态站点。"""
    config = settings or Settings()
    if config.mode == "desktop" and desktop_token is None:
        raise ValueError("桌面服务必须由受控窗口启动")
    sessions = SessionStore(config.session_ttl_seconds, config.max_sessions)
    capabilities = Capabilities(
        mode=config.mode,
        capabilities={"filesystem": False, "network": False, "clipboard": False},
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        logger = create_logger(
            config.data_dir / "logs", config.log_max_bytes, config.log_backup_count
        )
        app.state.logger = logger
        try:
            app.state.preferences = PreferenceStore(config.data_dir)
            app.state.registry = assemble_tools(config)
            app.state.runtime = ToolRuntime(app.state.registry, logger)
            app.state.ready = True
            yield
        finally:
            app.state.ready = False
            sessions.items.clear()
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)

    app = FastAPI(
        title="MTools API",
        version=__version__,
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        responses={
            code: {"model": ErrorResponse}
            for code in (400, 401, 403, 404, 413, 422, 429, 500, 503, 504)
        },
    )
    app.state.ready = False

    class RequestLogger:
        def info(self, message: str, *, extra: dict[str, object]) -> None:
            if hasattr(app.state, "logger"):
                app.state.logger.info(message, extra=extra)

    app.add_middleware(
        SecurityMiddleware,
        settings=config,
        sessions=sessions,
        logger=RequestLogger(),
        desktop_token=desktop_token,
    )

    @app.exception_handler(AppError)
    async def business_error(request: Request, exc: AppError) -> JSONResponse:
        return error_response(exc, request.state.request_id)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": ".".join(str(value) for value in item["loc"]), "type": item["type"]}
            for item in exc.errors()
        ]
        return JSONResponse(
            ErrorResponse(
                error=ErrorInfo(
                    code="VALIDATION_ERROR", message="输入参数不符合要求", details=details
                ),
                request_id=request.state.request_id,
            ).model_dump(),
            status_code=422,
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        return error_response(
            AppError(exc.status_code, "HTTP_ERROR", "请求地址或方法不可用"),
            request.state.request_id,
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        app.state.logger.error(
            "unhandled_error", exc_info=exc, extra={"request_id": request.state.request_id}
        )
        response = error_response(
            AppError(500, "INTERNAL_ERROR", "服务暂时异常，请凭诊断编号排查"),
            request.state.request_id,
        )
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    @app.get("/health/live", response_model=Health)
    def live() -> Health:
        return Health(status="ok", version=__version__)

    @app.get("/health/ready", response_model=Health)
    def ready() -> Health:
        if not app.state.ready:
            raise AppError(503, "NOT_READY", "服务初始化尚未完成")
        return Health(status="ready", version=__version__)

    @app.post("/api/v1/session", response_model=SessionInfo)
    async def session(request: Request, response: Response) -> SessionInfo:
        session_id = request.cookies.get("mtools_session")
        value = sessions.get(session_id)
        if value is None:
            session_id, value = sessions.create()
        response.set_cookie(
            "mtools_session",
            session_id or "",
            httponly=True,
            samesite="strict",
            secure=request.url.scheme == "https",
            max_age=config.session_ttl_seconds,
            path="/api/",
        )
        return SessionInfo(csrf_token=value.csrf_token, expires_in=config.session_ttl_seconds)

    @app.get("/api/v1/capabilities", response_model=Capabilities)
    def get_capabilities() -> Capabilities:
        return capabilities

    @app.get("/api/v1/preferences", response_model=Preferences)
    def get_preferences() -> Preferences:
        return cast(Preferences, app.state.preferences.value)

    @app.put("/api/v1/preferences", response_model=Preferences)
    async def save_preferences(body: Preferences) -> Preferences:
        app.state.preferences.save(body)
        return body

    @app.get("/api/v1/ai/connection", response_model=AiConnection)
    def ai_connection() -> AiConnection:
        if config.mode == "docker-web":
            return AiConnection(
                command="docker",
                args=["exec", "-i", socket.gethostname(), sys.executable, "-m", "mtools", "mcp"],
                env={},
            )
        frozen = getattr(sys, "frozen", False)
        executable = Path(sys.executable)
        return AiConnection(
            command=str(executable.with_name("MToolsAI.exe") if frozen else executable),
            args=["mcp"] if frozen else ["-m", "mtools", "mcp"],
            env={
                "MTOOLS_DATA_DIR": str(config.data_dir.resolve()),
                "MTOOLS_DISABLED_TOOLS": json.dumps(config.disabled_tools),
            },
        )

    @app.get("/api/v1/tools", response_model=Catalog)
    def catalog(
        cursor: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=100)] = 50,
    ) -> Catalog:
        entries = sorted(
            app.state.registry.entries.values(), key=lambda item: item.manifest.tool_id
        )
        end = cursor + limit
        return Catalog(
            items=entries[cursor:end],
            total=len(entries),
            next_cursor=end if end < len(entries) else None,
        )

    @app.get("/api/v1/tools/{tool_id}", response_model=CatalogEntry)
    def tool_detail(tool_id: str) -> CatalogEntry:
        entry = cast(CatalogEntry | None, app.state.registry.entries.get(tool_id))
        if entry is None:
            raise AppError(404, "TOOL_NOT_FOUND", "找不到此工具")
        return entry

    @app.post("/api/v1/tools/json-formatter/operations/format/execute", response_model=JsonResult)
    async def execute_json(body: JsonExecuteRequest, request: Request) -> JsonResult:
        result = await app.state.runtime.execute(
            "json-formatter", "format", body.parameters.model_dump(), "ui", request.state.request_id
        )
        return cast(JsonResult, result)

    @app.api_route(
        "/api/{path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        include_in_schema=False,
    )
    def unknown_api(path: str) -> None:
        raise AppError(404, "NOT_FOUND", "找不到此接口")

    if config.web_dir.is_dir() and (config.web_dir / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=config.web_dir / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path.startswith(("api/", "health/", "assets/")) or "." in path:
            raise AppError(404, "NOT_FOUND", "找不到此资源")
        index = config.web_dir / "index.html"
        if not index.is_file():
            raise AppError(503, "FRONTEND_NOT_BUILT", "前端尚未构建，请参阅源码运行指南")
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

    return app
