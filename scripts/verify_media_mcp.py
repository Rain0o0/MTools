import argparse
import asyncio
import base64
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify(url: str, fixtures: Path, command: list[str]) -> None:
    """通过真实 HTTP 用户批准和 SDK 调用，验收三个媒体工具及文件操作。"""
    origin = f"{urlsplit(url).scheme}://{urlsplit(url).netloc}"
    async with httpx.AsyncClient(base_url=origin, timeout=30) as client:
        bootstrap = await client.post("/api/v1/session", headers={"Origin": origin})
        bootstrap.raise_for_status()
        client.headers["X-CSRF-Token"] = bootstrap.json()["csrf_token"]
        parameters = StdioServerParameters(
            command=command[0], args=command[1:], env=dict(os.environ)
        )
        async with stdio_client(parameters) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                names = {item.name for item in (await session.list_tools()).tools}
                assert {
                    f"mtools_{kind}_editor__edit_v1" for kind in ("image", "video", "audio")
                } <= names
                connection_actor: str | None = None

                async def approved(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
                    nonlocal connection_actor
                    pending = await session.call_tool(name, arguments)
                    assert pending.isError and "AI_APPROVAL_REQUIRED" in str(pending)
                    approvals = (await client.get("/api/v1/ai/approvals")).json()["items"]
                    matching = []
                    tool, operation = name.removeprefix("mtools_").removesuffix("_v1").split("__")
                    expected_operation = f"{tool.replace('_', '-')}/{operation}"
                    for ticket in approvals:
                        if (
                            ticket["operation"] != expected_operation
                            or ticket["status"] != "pending"
                        ):
                            continue
                        if connection_actor and ticket["actor"] != connection_actor:
                            continue
                        summary = json.loads(ticket["parameters_summary"])
                        if all(
                            summary.get(key) == value
                            for key, value in arguments.items()
                            if key != "content_base64"
                        ):
                            matching.append(ticket)
                    assert len(matching) == 1, "只允许批准本验收生成的精确请求"
                    connection_actor = matching[0]["actor"]
                    response = await client.post(
                        f"/api/v1/ai/approvals/{matching[0]['approval_id']}", json={"approve": True}
                    )
                    response.raise_for_status()
                    called = await session.call_tool(name, arguments)
                    assert not called.isError and called.structuredContent is not None, str(called)
                    return called.structuredContent

                imported = await approved(
                    "mtools_media_library__import_v1",
                    {
                        "name": f"smoke-{uuid4().hex}.png",
                        "content_base64": base64.b64encode(
                            (fixtures / "source.png").read_bytes()
                        ).decode(),
                    },
                )
                for kind, filename in (
                    ("image", "source.png"),
                    ("video", "source.mp4"),
                    ("audio", "source.wav"),
                ):
                    if kind == "image":
                        artifact_id = imported["artifact_id"]
                    else:
                        upload = await client.post(
                            "/api/v1/artifacts/upload",
                            params={"name": filename},
                            content=(fixtures / filename).read_bytes(),
                        )
                        upload.raise_for_status()
                        artifact_id = upload.json()["artifact_id"]
                        shared = await client.patch(
                            f"/api/v1/artifacts/{artifact_id}/share", json={"shared_with_ai": True}
                        )
                        shared.raise_for_status()
                    arguments: dict[str, Any] = {"artifact_id": artifact_id}
                    if kind == "image":
                        arguments["crop"] = {"x": 0, "y": 0, "width": 160, "height": 120}
                    else:
                        arguments.update(start_seconds=0.5, end_seconds=1.5)
                    job = await approved(f"mtools_{kind}_editor__edit_v1", arguments)
                    for _ in range(100):
                        status = await session.call_tool(
                            "mtools_media_library__status_v1", {"resource_id": job["job_id"]}
                        )
                        assert status.structuredContent is not None
                        job = status.structuredContent
                        if job["status"] in ("succeeded", "failed", "interrupted", "cancelled"):
                            break
                        await asyncio.sleep(0.1)
                    assert job["status"] == "succeeded", job
                    result = job["result"]
                    assert result["info"]["kind"] == kind
                    if kind == "image":
                        assert (result["info"]["width"], result["info"]["height"]) == (160, 120)
                    else:
                        assert abs(result["info"]["duration"] - 1) < 0.15
                    read = await session.call_tool(
                        "mtools_media_library__read_v1", {"artifact_id": result["artifact_id"]}
                    )
                    assert (
                        read.structuredContent
                        and len(base64.b64decode(read.structuredContent["content_base64"])) > 50
                    )
                    download = await client.get(
                        f"/api/v1/artifacts/{result['artifact_id']}/content"
                    )
                    assert download.status_code == 200 and len(download.content) == result["size"]
                listed = await session.call_tool("mtools_media_library__jobs_v1", {})
                assert listed.structuredContent and len(listed.structuredContent["items"]) == 3
                same = await approved(
                    "mtools_media_library__cancel_v1", {"resource_id": job["job_id"]}
                )
                assert same["status"] == "succeeded"
                cleared = await approved("mtools_media_library__clear_v1", {})
                assert cleared["items"] == []
        response = await client.delete("/api/v1/artifacts")
        response.raise_for_status()
    print(
        "Media MCP: three edits, import/read/jobs/status/cancel/clear, "
        "real user approval and HTTP download passed"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--fixtures", type=Path, default=Path(".runtime/media-fixtures"))
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command or [sys.executable, "-m", "mtools", "mcp"]
    if command[0] == "--":
        command = command[1:]
    asyncio.run(verify(args.url, args.fixtures, command))


if __name__ == "__main__":
    main()
