import json
import logging
import sys
from io import TextIOWrapper
from typing import Any
from uuid import uuid4

from anyio import wrap_file
from mcp import types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server

from mtools import __version__
from mtools.contracts.models import AppError, ErrorInfo, ErrorResponse
from mtools.platform.execution import ToolRuntime
from mtools.platform.registry import operation_name


class McpGateway:
    """从受信任注册器自动投影 MCP；路径仅通过明示对话授权的媒体契约处理。"""

    def __init__(self, runtime: ToolRuntime) -> None:
        self.runtime = runtime
        self.routes: dict[str, tuple[str, str]] = {}
        for tool_id, tool in runtime.registry.tools.items():
            for operation in tool.manifest.operations:
                name = operation_name(tool_id, operation.operation_id, operation.contract_version)
                if len(name) > 64 or name in self.routes:
                    raise ValueError("MCP 操作名重复或超过 64 字符")
                self.routes[name] = (tool_id, operation.operation_id)

    def list_tools(self) -> list[types.Tool]:
        result = []
        for name, (tool_id, operation_id) in self.routes.items():
            entry = self.runtime.registry.entries[tool_id]
            if operation_id not in entry.available_operations:
                continue
            handler = self.runtime.registry.require(tool_id, operation_id)
            operation = next(
                op for op in entry.manifest.operations if op.operation_id == operation_id
            )
            result.append(
                types.Tool(
                    name=name,
                    title=f"{entry.manifest.name} · {operation.title}",
                    description=operation.description,
                    inputSchema=handler.input_model.model_json_schema(),
                    outputSchema=handler.output_model.model_json_schema(),
                    annotations=types.ToolAnnotations(
                        readOnlyHint=operation.effects == "read-only",
                        destructiveHint=operation.effects == "destructive",
                        idempotentHint=operation.idempotent,
                        openWorldHint=operation.effects == "external",
                    ),
                )
            )
        return result

    async def call(self, name: str, arguments: object) -> types.CallToolResult:
        request_id = uuid4().hex
        try:
            if name not in self.routes:
                raise AppError(404, "OPERATION_NOT_FOUND", "找不到此 AI 操作")
            tool_id, operation_id = self.routes[name]
            result = await self.runtime.execute(tool_id, operation_id, arguments, "ai", request_id)
            data = result.model_dump(mode="json")
            return types.CallToolResult(
                content=[types.TextContent(type="text", text=json.dumps(data, ensure_ascii=False))],
                structuredContent=data,
            )
        except AppError as exc:
            error = ErrorResponse(
                error=ErrorInfo(code=exc.code, message=exc.message), request_id=request_id
            )
            return types.CallToolResult(
                content=[types.TextContent(type="text", text=error.model_dump_json())], isError=True
            )


async def serve_stdio(runtime: ToolRuntime) -> None:
    gateway = McpGateway(runtime)
    server: Server[Any, Any] = Server("MTools", version=__version__)

    async def list_tools() -> list[types.Tool]:
        return gateway.list_tools()

    async def call_tool(name: str, arguments: dict[str, Any]) -> types.CallToolResult:
        return await gateway.call(name, arguments)

    register_list: Any = server.list_tools
    register_list()(list_tools)
    server.call_tool(validate_input=False)(call_tool)
    logging.getLogger("mcp").setLevel(logging.CRITICAL)
    if sys.stdin is None or sys.stdout is None:
        raise RuntimeError("AI 连接需要使用 MToolsAI 控制台程序")
    reader_stream = TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
    writer_stream = TextIOWrapper(sys.stdout.buffer, encoding="utf-8", newline="\n")
    try:
        async with stdio_server(wrap_file(reader_stream), wrap_file(writer_stream)) as (
            reader,
            writer,
        ):
            await server.run(reader, writer, server.create_initialization_options())
    finally:
        reader_stream.detach()
        writer_stream.detach()
