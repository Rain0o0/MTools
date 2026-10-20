from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

ToolId = Annotated[str, Field(pattern=r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")]
RunMode = Literal["source-web", "docker-web", "desktop"]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorInfo(Contract):
    code: str
    message: str
    details: list[dict[str, str | int]] = Field(default_factory=list)


class ErrorResponse(Contract):
    error: ErrorInfo
    request_id: str


class Operation(Contract):
    operation_id: ToolId
    title: str
    description: str
    effects: Literal["read-only", "write", "destructive", "external"]
    ai_authorization: Literal["software-approval", "conversation"] = "software-approval"
    ai_callable: Literal[True]
    contract_version: Literal[1] = 1
    input_schema: str
    output_schema: str
    execution: Literal["sync", "job"] = "sync"
    cancellable: bool = False
    idempotent: bool
    timeout_seconds: int = Field(ge=1, le=30)
    max_input_bytes: int = Field(ge=1)


class Dependency(Contract):
    tool_id: ToolId
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    optional: bool = False


class ToolUI(Contract):
    route: str = Field(pattern=r"^/tools/[a-z0-9-]+$")


class ToolDocs(Contract):
    overview: str
    usage: str


class Manifest(Contract):
    manifest_version: Literal[1]
    tool_id: ToolId
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    name: str
    description: str
    category: str
    tags: list[str]
    execution_target: Literal["backend"]
    supported_modes: list[RunMode]
    required_capabilities: list[str]
    dependencies: list[Dependency]
    operations: list[Operation]
    ui: ToolUI
    docs: ToolDocs


class CatalogEntry(Contract):
    manifest: Manifest
    status: Literal["available", "disabled", "unavailable", "incompatible"]
    reason: str | None = None
    available_operations: list[str]


class Catalog(Contract):
    items: list[CatalogEntry]
    total: int
    next_cursor: int | None = None


class Capabilities(Contract):
    mode: RunMode
    capabilities: dict[str, bool]
    jobs_supported: bool = True
    artifacts_supported: bool = True
    artifact_retention_hours: int = Field(default=24, ge=1, le=168)


class SessionInfo(Contract):
    csrf_token: str
    expires_in: int


class Health(Contract):
    status: Literal["ok", "ready"]
    version: str


class Preferences(Contract):
    version: Literal[1] = 1
    theme: Literal["light", "dark"] = "light"
    favorite_tools: list[ToolId] = Field(
        default_factory=lambda: ["json-formatter", "text-diff", "json-lines", "text-codec"],
        max_length=12,
    )


class PreferenceUpdate(Contract):
    theme: Literal["light", "dark"] | None = None
    favorite_tools: list[ToolId] | None = Field(default=None, max_length=12)


class AiConnection(Contract):
    command: str
    args: list[str]
    env: dict[str, str]


class CodexStatus(Contract):
    available: bool
    configured: bool
    matching: bool
    message: str
    configuration: str


class ConnectionTest(Contract):
    connected: Literal[True] = True
    tool_count: int
    tested_operations: list[str]
    message: str


class AppError(Exception):
    """携带可安全展示的业务错误。"""

    def __init__(self, status: int, code: str, message: str) -> None:
        self.status = status
        self.code = code
        self.message = message
        super().__init__(message)
