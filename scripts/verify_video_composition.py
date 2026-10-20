import argparse
import asyncio
import base64
import os
import sys
import time
from datetime import timedelta
from io import TextIOWrapper
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mtools.adapters.media_process import MediaProcess
from mtools.contracts.media import Job


async def verify(fixtures: Path, data: Path, command: list[str]) -> None:
    """用独立测试工作区核对源码或目录包的组合剪辑 MCP、产物及编码状态。"""
    async with stdio_client(
        StdioServerParameters(
            command=command[0],
            args=command[1:],
            env={**os.environ, "MTOOLS_DATA_DIR": str(data.resolve())},
        )
    ) as (reader, writer):
        async with ClientSession(
            reader, writer, read_timeout_seconds=timedelta(seconds=30)
        ) as session:
            await session.initialize()
            tools = {tool.name: tool for tool in (await session.list_tools()).tools}
            assert "watermarks" in tools["mtools_video_editor__edit_v1"].inputSchema["properties"]
            called = await session.call_tool(
                "mtools_video_editor__edit_v1",
                {
                    "source_path": str((fixtures / "source.mp4").resolve()),
                    "segments": [{"start_seconds": 1, "end_seconds": 1.5}, {"end_seconds": 0.5}],
                    "speed": 0.5,
                    "crop": {"width": 320, "height": 240},
                    "rotate": 90,
                    "resize_width": 240,
                    "flip_horizontal": True,
                    "grayscale": True,
                    "watermarks": [
                        {
                            "source_path": str((fixtures / "overlay.png").resolve()),
                            "width": 24,
                            "end_seconds": 0.5,
                        },
                        {
                            "source_path": str((fixtures / "overlay.png").resolve()),
                            "width": 24,
                            "x": 48,
                            "start_seconds": 0.5,
                            "opacity": 0.5,
                        },
                    ],
                    "muted": True,
                    "user_authorization": "本次验收使用测试目录的 source.mp4 与 overlay.png，"
                    "重排两段并慢放、裁剪旋转缩放和黑白，添加两个定时图片水印后静音导出。",
                },
            )
            assert not called.isError and called.structuredContent, called
            job = Job.model_validate(called.structuredContent)
            deadline = time.monotonic() + 60
            while job.status not in ("succeeded", "failed", "cancelled", "interrupted"):
                assert time.monotonic() < deadline, "组合剪辑任务等待超时"
                await asyncio.sleep(0.1)
                status = await session.call_tool(
                    "mtools_media_library__status_v1", {"resource_id": job.job_id}
                )
                assert not status.isError and status.structuredContent
                job = Job.model_validate(status.structuredContent)
            assert job.status == "succeeded" and job.result, job
            assert job.video_processing
            output = bytearray()
            offset: int | None = 0
            while offset is not None:
                chunk = await session.call_tool(
                    "mtools_media_library__read_v1",
                    {
                        "artifact_id": job.result.artifact_id,
                        "offset": offset,
                    },
                )
                assert not chunk.isError and chunk.structuredContent
                output.extend(base64.b64decode(chunk.structuredContent["content_base64"]))
                offset = chunk.structuredContent["next_offset"]
            data.mkdir(parents=True, exist_ok=True)
            path = data / "composition-result.mp4"
            path.write_bytes(output)
            info = MediaProcess().inspect(path)
            assert (info.width, info.height, info.has_audio) == (240, 320, False)
            assert abs(info.duration - 2) < 0.06
            print(
                f"组合剪辑 MCP 通过：2段、2水印、240×320、{info.duration:.2f}秒，"
                f"编码={job.video_processing.encoder}，回退={job.video_processing.fallback}"
            )


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="验证视频组合编辑的真实 MCP 调用")
    parser.add_argument("--fixtures", type=Path, default=Path(".runtime/media-fixtures"))
    parser.add_argument("--data", type=Path, default=Path(".runtime/video-composition-mcp"))
    parser.add_argument("command", nargs=argparse.REMAINDER)
    arguments = parser.parse_args()
    command = arguments.command or [sys.executable, "-m", "mtools", "mcp"]
    if command[0] == "--":
        command = command[1:]
    asyncio.run(verify(arguments.fixtures, arguments.data, command))


if __name__ == "__main__":
    main()
