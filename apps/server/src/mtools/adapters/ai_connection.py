import json
import os
import shutil
import socket
import subprocess
import sys
from datetime import timedelta
from pathlib import Path
from typing import Any

import anyio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from mtools.bootstrap.config import Settings
from mtools.contracts.models import AiConnection, AppError, CodexStatus, ConnectionTest
from mtools.platform.registry import ToolRegistry, operation_name


def connection_for(settings: Settings, *, local: bool = False) -> AiConnection:
    """生成受控启动配置；容器对外通过宿主 Docker CLI 接入。"""
    if settings.mode == "docker-web" and not local:
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
            "MTOOLS_DATA_DIR": str(settings.data_dir.resolve()),
            "MTOOLS_DISABLED_TOOLS": json.dumps(settings.disabled_tools),
        },
    )


class CodexConnector:
    """仅操作固定名称 mtools，不接受来自 HTTP 的程序、路径或命令参数。"""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.connection = connection_for(settings)

    def executable(self) -> str | None:
        if self.settings.mode == "docker-web":
            return None
        found = shutil.which("codex.exe" if sys.platform == "win32" else "codex")
        if found:
            return found
        if sys.platform == "win32":
            folder = Path(os.environ.get("LOCALAPPDATA", "")) / "OpenAI/Codex/bin"
            candidates = sorted(
                folder.glob("*/codex.exe"), key=lambda path: path.stat().st_mtime, reverse=True
            )
            if candidates:
                return str(candidates[0])
        return None

    def configuration(self) -> str:
        connection = self.connection
        lines = [
            "[mcp_servers.mtools]",
            "command = " + json.dumps(connection.command),
            "args = " + json.dumps(connection.args),
            "enabled = true",
        ]
        if connection.env:
            lines.extend(["", "[mcp_servers.mtools.env]"])
            lines.extend(key + " = " + json.dumps(value) for key, value in connection.env.items())
        return "\n".join(lines) + "\n"

    def run_cli(self, arguments: list[str]) -> subprocess.CompletedProcess[str]:
        executable = self.executable()
        if executable is None:
            raise AppError(503, "CODEX_NOT_FOUND", "未找到 Codex 命令，可复制下方专用配置手动接入")
        try:
            return subprocess.run(
                [executable, "mcp", *arguments],
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=4,
                cwd=self.settings.data_dir,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise AppError(
                503, "CODEX_UNAVAILABLE", "Codex 命令未能完成，请检查安装或稍后重试"
            ) from exc

    def registration(self) -> dict[str, Any] | None:
        result = self.run_cli(["get", "mtools", "--json"])
        if result.returncode:
            if "No MCP server named" in result.stderr:
                return None
            raise AppError(
                503,
                "CODEX_CONFIG_UNAVAILABLE",
                "无法读取 Codex 的 MTools 配置，请检查 Codex 配置是否有效",
            )
        try:
            value: object = json.loads(result.stdout)
        except ValueError as exc:
            raise AppError(503, "CODEX_INVALID_RESPONSE", "Codex 返回的配置无法识别") from exc
        if not isinstance(value, dict):
            raise AppError(503, "CODEX_INVALID_RESPONSE", "Codex 返回的配置无法识别")
        return value

    def matches(self, value: dict[str, Any]) -> bool:
        transport = value.get("transport", {})
        return bool(
            isinstance(transport, dict)
            and value.get("enabled", True)
            and transport.get("command") == self.connection.command
            and transport.get("args") == self.connection.args
            and (transport.get("env") or {}) == self.connection.env
            and not value.get("disabled_tools")
            and value.get("enabled_tools") is None
        )

    def status(self) -> CodexStatus:
        available = self.executable() is not None
        value = self.registration() if available else None
        matching = value is not None and self.matches(value)
        message = (
            "已添加到 Codex；重新打开 Codex 会话后可使用"
            if matching
            else (
                "Codex 已有其他 MTools 配置，请先在 Codex 中移除旧连接"
                if value is not None
                else (
                    "已找到 Codex，可以快捷添加 MTools"
                    if available
                    else "未找到本机 Codex；可复制专用配置手动接入"
                )
            )
        )
        if self.settings.mode == "docker-web":
            message = "请在运行容器的电脑上配置 Codex；容器不能修改宿主配置"
        return CodexStatus(
            available=available,
            configured=value is not None,
            matching=matching,
            message=message,
            configuration=self.configuration(),
        )

    def connect(self) -> CodexStatus:
        if self.settings.mode != "desktop":
            raise AppError(
                403, "DESKTOP_REQUIRED", "快捷添加 Codex 请使用桌面软件；此处可复制专用配置"
            )
        existing = self.registration()
        if existing is not None:
            if not self.matches(existing):
                raise AppError(
                    409,
                    "CODEX_CONFIG_CONFLICT",
                    "Codex 已有不同的 MTools 配置，请先在 Codex 中移除旧连接",
                )
            return self.status()
        arguments = ["add", "mtools"]
        for key, value in self.connection.env.items():
            arguments.extend(["--env", key + "=" + value])
        arguments.extend(["--", self.connection.command, *self.connection.args])
        if self.run_cli(arguments).returncode:
            raise AppError(
                503, "CODEX_CONFIG_FAILED", "添加未成功，请检查 Codex 配置权限，或复制专用配置"
            )
        return self.status()


async def test_connection(settings: Settings, registry: ToolRegistry) -> ConnectionTest:
    """用真实 stdio 会话验证发现与无副作用示例调用，不连接模型或消耗 token。"""
    connection = connection_for(settings, local=True)
    parameters = StdioServerParameters(
        command=connection.command,
        args=connection.args,
        env={**os.environ, **connection.env, "PYINSTALLER_RESET_ENVIRONMENT": "1"},
        cwd=str(settings.data_dir),
    )
    expected = {
        operation_name(entry.manifest.tool_id, operation.operation_id, operation.contract_version)
        for entry in registry.entries.values()
        if entry.status == "available"
        for operation in entry.manifest.operations
    }
    samples: dict[str, tuple[dict[str, object], str]] = {
        "mtools_json_formatter__format_v1": (
            {"text": '{"测试":true}', "compact": True},
            '{"测试":true}',
        ),
        "mtools_text_diff__compare_v1": ({"old_text": "MTools\n", "new_text": "MTools\n"}, ""),
        "mtools_json_lines__convert_v1": ({"text": '[{"测试":true}]'}, '{"测试":true}\n'),
        "mtools_text_codec__transform_v1": (
            {"text": "MTools", "action": "base64-encode"},
            "TVRvb2xz",
        ),
    }
    tested = []
    try:
        with anyio.fail_after(10), open(os.devnull, "w", encoding="utf-8") as stderr:
            async with stdio_client(parameters, errlog=stderr) as (reader, writer):
                async with ClientSession(
                    reader, writer, read_timeout_seconds=timedelta(seconds=5)
                ) as session:
                    await session.initialize()
                    found = {tool.name for tool in (await session.list_tools()).tools}
                    if found != expected or not found:
                        raise ValueError("目录不一致或为空")
                    for name in sorted(found):
                        if name not in samples:
                            continue
                        arguments, text = samples[name]
                        result = await session.call_tool(name, arguments)
                        if (
                            result.isError
                            or result.structuredContent is None
                            or result.structuredContent.get("text") != text
                        ):
                            raise ValueError("示例结果不符")
                        tested.append(name)
    except Exception as exc:
        raise AppError(
            503, "MCP_CONNECTION_FAILED", "连接测试未通过，请确认软件文件完整且未被拦截；可重新测试"
        ) from exc
    return ConnectionTest(
        tool_count=len(expected),
        tested_operations=tested,
        message=(
            f"工具连接正常，已发现 {len(expected)} 个操作并完成 {len(tested)} 项示例调用。"
            "此测试验证工具连接，不代表 Codex 会话已刷新。"
        ),
    )
