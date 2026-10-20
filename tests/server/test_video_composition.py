import asyncio
import os
import struct
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mtools.adapters.media_process import MediaProcess, process_options
from mtools.contracts.media import Job, VideoEdit
from mtools.contracts.models import AppError
from mtools.platform.invocation import actor
from mtools.platform.media_workspace import MediaWorkspace, source_ids
from pydantic import ValidationError
from test_media import upload, wait_job


@pytest.fixture(scope="module")
def composition_files(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Path]:
    process = MediaProcess()
    if not process.available:
        pytest.skip("组合剪辑集成测试需要完整版 FFmpeg")
    root = tmp_path_factory.mktemp("video-composition")
    video = root / "红蓝视频.mp4"
    subprocess.run(
        [
            str(process.ffmpeg),
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=red:s=96x64:r=20:d=1",
            "-f",
            "lavfi",
            "-i",
            "color=blue:s=96x64:r=20:d=1",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000:duration=2",
            "-filter_complex",
            "[0:v][1:v]concat=n=2:v=1:a=0[v]",
            "-map",
            "[v]",
            "-map",
            "2:a",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(video),
        ],
        check=True,
        capture_output=True,
        **process_options(),
    )
    result = {"video": video}
    for name, color in [("red", "red"), ("green", "lime")]:
        path = root / f"{name}.png"
        subprocess.run(
            [
                str(process.ffmpeg),
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                f"color={color}:s=8x8",
                "-frames:v",
                "1",
                str(path),
            ],
            check=True,
            capture_output=True,
            **process_options(),
        )
        result[name] = path
    return result


def pixel(path: Path, second: float, x: int, y: int) -> tuple[int, int, int]:
    """解码指定时刻的像素，核对真实画面与水印显示区间。"""
    result = subprocess.run(
        [
            str(MediaProcess().ffmpeg),
            "-v",
            "error",
            "-ss",
            str(second),
            "-i",
            str(path),
            "-vf",
            f"format=rgb24,crop=1:1:{x}:{y}",
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "pipe:1",
        ],
        check=True,
        capture_output=True,
        **process_options(),
    )
    assert len(result.stdout) == 3
    return result.stdout[0], result.stdout[1], result.stdout[2]


def test_composed_video_pixels_audio_timing_and_layer_order(
    authenticated: TestClient,
    composition_files: dict[str, Path],
    tmp_path: Path,
) -> None:
    client = authenticated
    resources = {
        key: upload(client, path.name, path.read_bytes()) for key, path in composition_files.items()
    }
    response = client.post(
        "/api/v1/tools/video-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": resources["video"]["artifact_id"],
                "segments": [
                    {"start_seconds": 1, "end_seconds": 2},
                    {"start_seconds": 0, "end_seconds": 0.5},
                ],
                "speed": 0.5,
                "crop": {"width": 80, "height": 40},
                "rotate": 90,
                "flip_horizontal": True,
                "flip_vertical": True,
                "resize_width": 48,
                "grayscale": True,
                "brightness": 0.05,
                "contrast": 1.1,
                "saturation": 0.8,
                "watermarks": [
                    {"artifact_id": resources["red"]["artifact_id"], "end_seconds": 0.8},
                    {
                        "artifact_id": resources["green"]["artifact_id"],
                        "start_seconds": 0.3,
                        "end_seconds": 1,
                    },
                ],
                "volume": 0.5,
                "fade_in_seconds": 0.2,
                "fade_out_seconds": 0.2,
            }
        },
    )
    assert response.status_code == 202, response.text
    job = Job.model_validate(wait_job(client, response.json()["job_id"]))
    assert job.status == "succeeded" and job.result, job
    assert job.result.info.duration == pytest.approx(3, abs=0.15)
    assert (job.result.info.width, job.result.info.height, job.result.info.has_audio) == (
        48,
        96,
        True,
    )
    assert job.result.info.frame_rate == pytest.approx(20)
    output = tmp_path / "组合.mp4"
    output.write_bytes(client.get(f"/api/v1/artifacts/{job.result.artifact_id}/content").content)
    red = pixel(output, 0.1, 3, 3)
    green = pixel(output, 0.5, 3, 3)
    gray = pixel(output, 1.2, 3, 3)
    assert red[0] > 180 and red[1] < 50
    assert green[1] > 180 and green[0] < 50
    assert max(gray) - min(gray) < 8
    assert pixel(output, 2.5, 20, 20)[0] > pixel(output, 1.5, 20, 20)[0] + 25
    decoded = subprocess.run(
        [
            str(MediaProcess().ffmpeg),
            "-v",
            "error",
            "-i",
            str(output),
            "-map",
            "0:a:0",
            "-f",
            "s16le",
            "-ac",
            "1",
            "-ar",
            "48000",
            "pipe:1",
        ],
        check=True,
        capture_output=True,
        **process_options(),
    ).stdout
    assert len(decoded) / 96000 == pytest.approx(3, abs=0.1)
    values = struct.unpack(f"<{len(decoded) // 2}h", decoded)
    middle = values[24000:43200]
    frequency = sum(a <= 0 < b for a, b in zip(middle, middle[1:], strict=False)) / 0.4
    assert frequency == pytest.approx(440, abs=20)
    level = sum(abs(v) for v in middle) / len(middle)
    assert 500 < level < 2000
    assert sum(abs(v) for v in values[:2400]) / 2400 < level * 0.5
    assert sum(abs(v) for v in values[-2400:]) / 2400 < level * 0.5


@pytest.mark.parametrize(
    "patch",
    [
        {"segments": [{"start_seconds": 1, "end_seconds": 0.5}]},
        {"segments": [{"end_seconds": 1}], "end_seconds": 2},
        {"segments": [{"end_seconds": 1}] * 17},
        {"speed": float("inf")},
        {"speed": 0},
        {"rotate": 45},
        {"watermarks": [{"artifact_id": "b" * 32}] * 9},
        {"watermarks": [{"artifact_id": "b" * 32, "source_path": "C:/mark.png"}]},
        {"watermarks": [{"source_path": "C:/mark.png"}]},
    ],
)
def test_composition_rejects_ambiguous_or_unbounded_inputs(patch: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        VideoEdit.model_validate({"artifact_id": "a" * 32, **patch})


@pytest.mark.parametrize(
    "patch",
    [
        {"segments": [{"start_seconds": 0, "end_seconds": 3}]},
        {"fade_out_seconds": 3},
        {"watermarks": [{"x": 95}]},
        {"watermarks": [{"start_seconds": 2}]},
    ],
)
def test_composition_media_boundaries_fail_safely(
    authenticated: TestClient,
    composition_files: dict[str, Path],
    patch: dict[str, Any],
) -> None:
    source = upload(authenticated, "源.mp4", composition_files["video"].read_bytes())
    mark = upload(authenticated, "水印.png", composition_files["red"].read_bytes())
    if "watermarks" in patch:
        patch = {
            **patch,
            "watermarks": [{"artifact_id": mark["artifact_id"], **patch["watermarks"][0]}],
        }
    result = authenticated.post(
        "/api/v1/tools/video-editor/operations/edit/execute",
        json={
            "parameters": {"artifact_id": source["artifact_id"], **patch},
        },
    )
    assert result.status_code == 202
    job = wait_job(authenticated, result.json()["job_id"])
    assert job["status"] == "failed" and job["result"] is None


@pytest.mark.parametrize("speed", [0.25, 0.5, 2, 4])
def test_muted_speed_preserves_full_output_duration(
    authenticated: TestClient,
    composition_files: dict[str, Path],
    speed: float,
) -> None:
    source = upload(authenticated, "速度.mp4", composition_files["video"].read_bytes())
    result = authenticated.post(
        "/api/v1/tools/video-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": source["artifact_id"],
                "speed": speed,
                "muted": True,
                "fade_out_seconds": 30,
            },
        },
    )
    assert result.status_code == 202
    job = Job.model_validate(wait_job(authenticated, result.json()["job_id"]))
    assert job.status == "succeeded" and job.result, job
    assert job.result.info.duration == pytest.approx(2 / speed, abs=0.06)
    assert not job.result.info.has_audio


def test_nested_watermarks_are_private_and_protected_while_queued(
    tmp_path: Path,
    composition_files: dict[str, Path],
) -> None:
    media = MediaWorkspace(tmp_path)
    token = actor.set("ui:owner")
    try:
        source = media.save(composition_files["video"].read_bytes(), "源.mp4")
        mark = media.save(composition_files["red"].read_bytes(), "水印.png")
        parameters = VideoEdit.model_validate(
            {"artifact_id": source.artifact_id, "watermarks": [{"artifact_id": mark.artifact_id}]}
        )
        assert source_ids(parameters.model_dump()) == {source.artifact_id, mark.artifact_id}
        job = media.submit("video-editor", parameters)
        with pytest.raises(AppError) as busy:
            media.remove_source(mark.artifact_id, "ui:owner")
        assert busy.value.code == "SOURCE_IN_USE"
        media.share(source.artifact_id, True, "ui:owner")
        other = actor.set("ai:other")
        try:
            with pytest.raises(AppError):
                media.submit("video-editor", parameters)
        finally:
            actor.reset(other)
        media.cancel_job(job.job_id)
    finally:
        actor.reset(token)
        media.close()


def test_real_mcp_composition_with_nested_paths(
    tmp_path: Path,
    composition_files: dict[str, Path],
) -> None:
    async def exercise() -> None:
        async with stdio_client(
            StdioServerParameters(
                command=sys.executable,
                args=["-m", "mtools", "mcp"],
                env={**os.environ, "MTOOLS_DATA_DIR": str(tmp_path)},
            )
        ) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                tools = {tool.name: tool for tool in (await session.list_tools()).tools}
                assert (
                    "watermarks" in tools["mtools_video_editor__edit_v1"].inputSchema["properties"]
                )
                called = await session.call_tool(
                    "mtools_video_editor__edit_v1",
                    {
                        "source_path": str(composition_files["video"]),
                        "segments": [{"start_seconds": 1, "end_seconds": 2}, {"end_seconds": 0.5}],
                        "speed": 2,
                        "muted": True,
                        "rotate": 180,
                        "watermarks": [
                            {"source_path": str(composition_files["green"]), "width": 8}
                        ],
                        "user_authorization": "请重排指定视频片段，2倍速旋转并叠加指定绿色图片。",
                    },
                )
                assert not called.isError and called.structuredContent, called
                job_id = called.structuredContent["job_id"]
                deadline = time.monotonic() + 20
                while time.monotonic() < deadline:
                    status = await session.call_tool(
                        "mtools_media_library__status_v1", {"resource_id": job_id}
                    )
                    assert status.structuredContent
                    job = Job.model_validate(status.structuredContent)
                    if job.status in ("succeeded", "failed"):
                        break
                    await asyncio.sleep(0.05)
                assert job.status == "succeeded" and job.result, job
                assert job.result.info.duration == pytest.approx(0.75, abs=0.15)
                assert not job.result.info.has_audio
                media = MediaWorkspace(tmp_path)
                with media.connect() as db:
                    stored = db.execute(
                        "SELECT parameters FROM jobs WHERE id=?", (job_id,)
                    ).fetchone()[0]
                    assert str(composition_files["green"]) not in stored
                    assert str(composition_files["video"]) not in stored

    asyncio.run(exercise())
