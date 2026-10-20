import argparse
import asyncio
import base64
import hashlib
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mtools.adapters.media_process import MediaProcess, process_options
from mtools.bootstrap.config import Settings


async def verify(speech: bool, edge: bool = False, command: list[str] | None = None) -> None:
    """使用 SDK 与临时生成素材验收新增 MCP，不接触用户媒体或实际工作区。"""
    process = MediaProcess()
    assert process.available, process.environment.message
    with tempfile.TemporaryDirectory(prefix="mtools-workflows-") as temporary:
        root = Path(temporary)
        sources = []
        for index, color in enumerate(("blue", "red")):
            path = root / f"片段-{index}.mp4"
            subprocess.run(
                [
                    str(process.ffmpeg),
                    "-nostdin",
                    "-v",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    f"color={color}:s={320 + index * 160}x240:r=10:d=1",
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    str(path),
                ],
                check=True,
                **process_options(),
            )
            sources.append(path)
        subtitle = root / "示例.srt"
        subtitle.write_text(
            "1\n00:00:01,000 --> 00:00:08,000\n你好，这是语音字幕测试。\n",
            encoding="utf-8",
            newline="\n",
        )
        originals = {
            path: hashlib.sha256(path.read_bytes()).hexdigest() for path in [*sources, subtitle]
        }
        config_path = Settings().data_dir / "speech" / "config.json"
        if config_path.is_file():
            destination = root / "data" / "speech"
            destination.mkdir(parents=True)
            (destination / "config.json").write_bytes(config_path.read_bytes())
        environment = dict(os.environ, MTOOLS_DATA_DIR=str(root / "data"), PYTHONUTF8="1")
        command = command or [sys.executable, "-m", "mtools", "mcp"]
        async with stdio_client(
            StdioServerParameters(command=command[0], args=command[1:], env=environment)
        ) as (reader, writer):
            async with ClientSession(reader, writer) as client:
                await client.initialize()
                names = {tool.name for tool in (await client.list_tools()).tools}
                assert {
                    "mtools_video_concat__concat_v1",
                    "mtools_speech_transcriber__transcribe_v1",
                    "mtools_subtitle_speaker__synthesize_v1",
                } <= names

                async def call(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
                    result = await client.call_tool(name, arguments)
                    assert not result.isError and result.structuredContent, str(result)
                    return result.structuredContent

                async def completed(job: dict[str, Any]) -> dict[str, Any]:
                    for _ in range(1800):
                        job = await call(
                            "mtools_media_library__status_v1", {"resource_id": job["job_id"]}
                        )
                        if job["status"] in ("succeeded", "failed", "cancelled", "interrupted"):
                            assert job["status"] == "succeeded", job
                            return job
                        await asyncio.sleep(0.5)
                    raise AssertionError("任务超时")

                job = await completed(
                    await call(
                        "mtools_video_concat__concat_v1",
                        {
                            "sources": [{"source_path": str(path)} for path in sources],
                            "user_authorization": "验证程序生成的蓝色和红色片段按顺序拼接。",
                        },
                    )
                )
                assert abs(job["result"]["info"]["duration"] - 2) < 0.15, job
                assert job["result"]["info"]["has_audio"]
                print(
                    "视频拼接、静音轨补齐、尺寸归一、实际编码：",
                    job["video_processing"],
                    flush=True,
                )
                settings = await call("mtools_subtitle_speaker__environment_v1", {})
                print("语音环境：", settings, flush=True)
                await call("mtools_speech_transcriber__environment_v1", {})
                await call("mtools_media_library__environment_v1", {})
                await call("mtools_media_library__sources_v1", {})
                denied = await client.call_tool(
                    "mtools_subtitle_speaker__synthesize_v1",
                    {
                        "source_path": str(subtitle),
                        "engine": "edge",
                        "allow_network": False,
                        "user_authorization": "验证生成字幕的 Edge 联网拒绝分支。",
                    },
                )
                assert denied.isError and "NETWORK_CONSENT_REQUIRED" in str(denied)
                if speech:
                    job = await completed(
                        await call(
                            "mtools_subtitle_speaker__synthesize_v1",
                            {
                                "source_path": str(subtitle),
                                "engine": "auto",
                                "user_authorization": "验证程序生成字幕的本地 Qwen 配音。",
                            },
                        )
                    )
                    assert abs(job["result"]["info"]["duration"] - 8) < 0.1
                    print("Qwen 字幕时间轴配音成功", flush=True)
                    result = await call(
                        "mtools_media_library__read_v1",
                        {"artifact_id": job["result"]["artifact_id"]},
                    )
                    assert base64.b64decode(result["content_base64"])[:4] == b"RIFF"
                    audio_path = (
                        root / "data" / "media" / "files" / (job["result"]["artifact_id"] + ".wav")
                    )
                    print("Qwen 实际推理：", job["speech_processing"], flush=True)
                    assert job["speech_processing"]["engine"] == "qwen"
                    audio_job = await completed(
                        await call(
                            "mtools_speech_transcriber__transcribe_v1",
                            {
                                "source_path": str(audio_path),
                                "model": "base",
                                "language": "zh",
                                "output_format": "vtt",
                                "user_authorization": "生成的配音音频直接转为 WebVTT 字幕。",
                            },
                        )
                    )
                    audio_result = await call(
                        "mtools_media_library__read_v1",
                        {"artifact_id": audio_job["result"]["artifact_id"]},
                    )
                    webvtt = base64.b64decode(audio_result["content_base64"]).decode("utf-8")
                    assert webvtt.startswith("WEBVTT") and "-->" in webvtt
                    print("Whisper 音频直接转 WebVTT 通过", flush=True)
                    video_path = root / "双音轨视频.mp4"
                    subprocess.run(
                        [
                            str(process.ffmpeg),
                            "-nostdin",
                            "-v",
                            "error",
                            "-f",
                            "lavfi",
                            "-i",
                            "color=blue:s=320x240:r=10:d=8",
                            "-f",
                            "lavfi",
                            "-i",
                            "sine=frequency=440:duration=8",
                            "-i",
                            str(audio_path),
                            "-map",
                            "0:v",
                            "-map",
                            "1:a",
                            "-map",
                            "2:a",
                            "-c:v",
                            "libx264",
                            "-c:a",
                            "aac",
                            "-shortest",
                            str(video_path),
                        ],
                        check=True,
                        **process_options(),
                    )
                    job = await completed(
                        await call(
                            "mtools_speech_transcriber__transcribe_v1",
                            {
                                "source_path": str(video_path),
                                "audio_stream": 1,
                                "model": "base",
                                "language": "zh",
                                "user_authorization": (
                                    "验证生成的双音轨视频，选择第二音频流用 Whisper 转字幕。"
                                ),
                            },
                        )
                    )
                    result = await call(
                        "mtools_media_library__read_v1",
                        {"artifact_id": job["result"]["artifact_id"]},
                    )
                    transcript = base64.b64decode(result["content_base64"]).decode("utf-8")
                    assert "-->" in transcript and ("语音" in transcript or "字幕" in transcript), (
                        transcript
                    )
                    print("Whisper base 中文字幕：", transcript, flush=True)
                    print("Whisper 实际推理：", job["speech_processing"], flush=True)
                if edge:
                    job = await completed(
                        await call(
                            "mtools_subtitle_speaker__synthesize_v1",
                            {
                                "source_path": str(subtitle),
                                "engine": "edge",
                                "output_format": "mp3",
                                "rate": 10,
                                "allow_network": True,
                                "user_authorization": "验证程序生成的字幕使用 Edge 在线配音。",
                            },
                        )
                    )
                    assert job["speech_processing"] == {"engine": "edge", "device": "online"}
                    assert abs(job["result"]["info"]["duration"] - 8) < 0.1
                    edge_result = await call(
                        "mtools_media_library__read_v1",
                        {"artifact_id": job["result"]["artifact_id"]},
                    )
                    encoded = base64.b64decode(edge_result["content_base64"])
                    assert len(encoded) > 100 and not encoded.startswith(b"RIFF")
                    assert job["result"]["name"].endswith(".mp3")
                    print("Edge MP3 字幕配音、语速及时间轴对齐通过", flush=True)
        for path, checksum in originals.items():
            assert hashlib.sha256(path.read_bytes()).hexdigest() == checksum
        print("MCP 发现、异步任务、权限分支、结果读取及原件校验通过", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--speech", action="store_true", help="使用已安装的 Qwen 和 Whisper 做真实推理"
    )
    parser.add_argument(
        "--edge", action="store_true", help="联网验证 Edge，仅发送程序生成的示例文本"
    )
    parser.add_argument("--command", nargs="+", help="待验收的受信任 MCP 进程及其参数")
    arguments = parser.parse_args()
    asyncio.run(verify(arguments.speech, arguments.edge, arguments.command))
