import asyncio
import os
import sys
from datetime import timedelta
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify() -> None:
    """使用官方客户端验证指定源码、打包程序或容器的 stdio MCP。"""
    command = sys.argv[1:] or [sys.executable, "-m", "mtools", "mcp"]
    env = {**os.environ, "MTOOLS_DATA_DIR": str(Path(".runtime/mcp-smoke").resolve())}
    async with stdio_client(
        StdioServerParameters(command=command[0], args=command[1:], env=env)
    ) as (reader, writer):
        async with ClientSession(
            reader, writer, read_timeout_seconds=timedelta(seconds=10)
        ) as session:
            await session.initialize()
            tools = (await session.list_tools()).tools
            required = {
                "mtools_json_formatter__format_v1",
                "mtools_text_diff__compare_v1",
                "mtools_json_lines__convert_v1",
                "mtools_text_codec__transform_v1",
            }
            assert required <= {tool.name for tool in tools}
            assert all(tool.name.startswith("mtools_") for tool in tools)
            for name, arguments, expected in [
                ("mtools_text_diff__compare_v1", {"old_text": "a\n", "new_text": "a\n"}, ""),
                ("mtools_json_lines__convert_v1", {"text": '[{"中文":true}]'}, '{"中文":true}\n'),
                (
                    "mtools_text_codec__transform_v1",
                    {"text": "中文", "action": "base64-encode"},
                    "5Lit5paH",
                ),
            ]:
                called = await session.call_tool(name, arguments)
                assert not called.isError and called.structuredContent is not None
                assert called.structuredContent["text"] == expected
            result = await session.call_tool(
                tools[0].name, {"text": '{"中文":true}', "compact": True}
            )
            assert not result.isError and result.structuredContent is not None
            assert result.structuredContent["text"] == '{"中文":true}'
            invalid = await session.call_tool(
                tools[0].name, {"text": "private-sentinel", "indent": 3}
            )
            assert invalid.isError and "private-sentinel" not in str(invalid)
            print(
                "MCP: initialize, discover, Chinese result, structured schema and safe error passed"
            )


if __name__ == "__main__":
    asyncio.run(verify())
