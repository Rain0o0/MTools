from pathlib import Path

from platformdirs import user_data_path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from mtools.contracts.models import RunMode


class Settings(BaseSettings):
    """集中校验环境配置，不在导入阶段创建目录或读取运行资源。"""

    model_config = SettingsConfigDict(env_prefix="MTOOLS_", extra="forbid")
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    mode: RunMode = "source-web"
    data_dir: Path = Field(default_factory=lambda: user_data_path("MTools", appauthor=False))
    web_dir: Path = Path(__file__).resolve().parents[4] / "web" / "dist"
    allowed_hosts: list[str] = ["127.0.0.1", "localhost", "[::1]"]
    allowed_origins: list[str] = ["http://127.0.0.1:8000", "http://localhost:8000"]
    disabled_tools: list[str] = []
    session_ttl_seconds: int = Field(default=28_800, ge=60, le=86_400)
    max_sessions: int = Field(default=128, ge=1, le=1024)
    max_request_bytes: int = Field(default=1_048_576, ge=1024, le=4_194_304)
    media_retention_hours: int = Field(default=24, ge=1, le=168)
    log_max_bytes: int = Field(default=2_000_000, ge=1024)
    log_backup_count: int = Field(default=3, ge=1, le=10)

    @field_validator("allowed_origins")
    @classmethod
    def explicit_origins(cls, values: list[str]) -> list[str]:
        if not values or any(
            "*" in value or not value.startswith(("http://", "https://")) or value.endswith("/")
            for value in values
        ):
            raise ValueError("来源必须是无尾随斜杠的明确 HTTP(S) 来源")
        return values

    @field_validator("allowed_hosts")
    @classmethod
    def explicit_hosts(cls, values: list[str]) -> list[str]:
        if not values or any("*" in value for value in values):
            raise ValueError("Host 不允许使用通配符")
        return values
