import asyncio
import json
import logging
import os
import sys
from pathlib import Path

import httpx
from fastapi.testclient import TestClient
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mtools.adapters.desktop import DesktopService
from mtools.adapters.mcp_server import McpGateway
from mtools.bootstrap.app import create_app
from mtools.bootstrap.config import Settings
from mtools.bootstrap.tools import assemble_tools
from mtools.platform.execution import ToolRuntime


def test_desktop_credentials_and_shutdown(tmp_path: Path) -> None:
    service = DesktopService(Settings(data_dir=tmp_path))
    try:
        service.start()
        with httpx.Client(base_url=service.origin) as client:
            assert client.get("/health/ready").status_code == 200
            assert client.get("/").status_code == 403
            assert (
                client.post("/api/v1/session", headers={"Origin": service.origin}).status_code
                == 403
            )
            client.headers.update({"X-MTools-Desktop": service.token, "Origin": service.origin})
            session = client.post("/api/v1/session")
            assert session.status_code == 200
            client.headers["X-CSRF-Token"] = session.json()["csrf_token"]
            assert client.get("/api/v1/capabilities").json()["mode"] == "desktop"
            assert client.put("/api/v1/preferences", json={"theme": "dark"}).status_code == 200
    finally:
        service.close()
    assert not service.thread.is_alive()
    assert json.loads((tmp_path / "preferences.json").read_text("utf-8"))["theme"] == "dark"
    with TestClient(
        create_app(Settings(data_dir=tmp_path)), base_url="http://127.0.0.1:8000"
    ) as restarted:
        restarted.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"})
        assert restarted.get("/api/v1/preferences").json()["theme"] == "dark"


def test_mcp_stdio_real_client(tmp_path: Path) -> None:
    async def exercise() -> None:
        env = {**os.environ, "MTOOLS_DATA_DIR": str(tmp_path)}
        parameters = StdioServerParameters(
            command=sys.executable, args=["-m", "mtools", "mcp"], env=env
        )
        async with stdio_client(parameters) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                tools = (await session.list_tools()).tools
                assert len(tools) == 1
                tool = tools[0]
                assert tool.name == "mtools_json_formatter__format_v1"
                assert tool.inputSchema["additionalProperties"] is False
                assert tool.outputSchema is not None
                assert tool.annotations is not None and tool.annotations.readOnlyHint
                result = await session.call_tool(
                    tool.name, {"text": '{"b":2,"中文":1}', "compact": True}
                )
                assert not result.isError
                assert result.structuredContent is not None
                assert result.structuredContent["text"] == '{"b":2,"中文":1}'
                invalid = await session.call_tool(tool.name, {"text": "private-input", "indent": 3})
                assert invalid.isError
                assert "private-input" not in str(invalid)
                assert "VALIDATION_ERROR" in str(invalid)
                assert (await session.call_tool("unknown", {})).isError

    asyncio.run(exercise())
    assert "private-input" not in (tmp_path / "logs/server.log").read_text("utf-8")


def test_mcp_disabled_and_write_policy(tmp_path: Path) -> None:
    registry = assemble_tools(Settings(data_dir=tmp_path, disabled_tools=["json-formatter"]))
    gateway = McpGateway(ToolRuntime(registry, logging.getLogger("test")))
    assert gateway.list_tools() == []
    assert asyncio.run(gateway.call("mtools_json_formatter__format_v1", {"text": "{}"})).isError
    registry = assemble_tools(Settings(data_dir=tmp_path))
    registry.tools["json-formatter"].manifest.operations[0].effects = "write"
    gateway = McpGateway(ToolRuntime(registry, logging.getLogger("test")))
    result = asyncio.run(
        gateway.call("mtools_json_formatter__format_v1", {"text": "{}", "confirmed": True})
    )
    assert result.isError and "AI_APPROVAL_REQUIRED" in str(result)


def test_declared_input_budget_applies_to_ai(tmp_path: Path) -> None:
    registry = assemble_tools(Settings(data_dir=tmp_path))
    registry.tools["json-formatter"].manifest.operations[0].max_input_bytes = 16
    gateway = McpGateway(ToolRuntime(registry, logging.getLogger("test")))
    result = asyncio.run(
        gateway.call("mtools_json_formatter__format_v1", {"text": "private-sentinel"})
    )
    assert result.isError and "REQUEST_TOO_LARGE" in str(result)
    assert "private-sentinel" not in str(result)
