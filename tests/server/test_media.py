import asyncio
import base64
import io
import os
import struct
import subprocess
import sys
import threading
import time
import wave
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mtools.adapters.media_process import MediaProcess, process_options
from mtools.bootstrap.config import Settings
from mtools.bootstrap.tools import assemble_tools
from mtools.contracts.media import ImageEdit, Job
from mtools.contracts.models import AppError
from mtools.platform.invocation import actor
from mtools.platform.media_workspace import MediaWorkspace


@pytest.fixture(scope="module")
def samples(tmp_path_factory: pytest.TempPathFactory) -> dict[str, bytes]:
    process = MediaProcess()
    if not process.available:
        pytest.skip("媒体集成测试需要可运行且组件齐全的 FFmpeg/FFprobe")
    root = tmp_path_factory.mktemp("media-samples")
    for name, source, extra in (
        ("蓝色.png", "color=blue:s=96x64", ["-frames:v", "1"]),
        ("红色.png", "color=red:s=16x16", ["-frames:v", "1"]),
        ("视频.mp4", "color=blue:s=96x64:r=10:d=2", ["-c:v", "libx264", "-pix_fmt", "yuv420p"]),
    ):
        subprocess.run(
            [
                str(process.ffmpeg),
                "-nostdin",
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                source,
                *extra,
                str(root / name),
            ],
            check=True,
            capture_output=True,
            **process_options(),
        )
    result = {path.name: path.read_bytes() for path in root.iterdir()}
    for name, level in (("主音轨.wav", 3000), ("叠加.wav", 6000)):
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as stream:
            stream.setnchannels(1)
            stream.setsampwidth(2)
            stream.setframerate(44100)
            stream.writeframes(struct.pack("<h", level) * 88200)
        result[name] = buffer.getvalue()
    return result


def upload(client: TestClient, name: str, content: bytes) -> dict[str, object]:
    response = client.post("/api/v1/artifacts/upload", params={"name": name}, content=content)
    assert response.status_code == 201, response.text
    return dict(response.json())


def wait_job(client: TestClient, job_id: str) -> dict[str, object]:
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/jobs/{job_id}")
        value = dict(response.json())
        if value["status"] in ("succeeded", "failed", "cancelled", "interrupted"):
            return value
        time.sleep(0.05)
    raise AssertionError("媒体任务没有在限时内结束")


def test_image_crop_overlay_pixels_and_private_files(
    authenticated: TestClient,
    samples: dict[str, bytes],
    tmp_path: Path,
) -> None:
    client = authenticated
    source = upload(client, "蓝色.png", samples["蓝色.png"])
    extra = upload(client, "红色.png", samples["红色.png"])
    response = client.post(
        "/api/v1/tools/image-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": source["artifact_id"],
                "crop": {"x": 8, "y": 8, "width": 64, "height": 32},
                "overlay_id": extra["artifact_id"],
                "overlay_x": 0,
                "overlay_y": 0,
            }
        },
    )
    assert response.status_code == 202, response.text
    job = Job.model_validate(wait_job(client, response.json()["job_id"]))
    assert job.status == "succeeded", job
    assert job.result and (job.result.info.width, job.result.info.height) == (64, 32)
    content = client.get(f"/api/v1/artifacts/{job.result.artifact_id}/content")
    assert content.status_code == 200 and content.content.startswith(b"\x89PNG")
    output = tmp_path / "result.png"
    output.write_bytes(content.content)
    decoded = subprocess.run(
        [
            str(MediaProcess().ffmpeg),
            "-v",
            "error",
            "-i",
            str(output),
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-",
        ],
        capture_output=True,
        check=True,
        **process_options(),
    ).stdout
    assert decoded[0] > 240 and decoded[2] < 20
    assert decoded[(20 * 64 + 40) * 3 + 2] > 240
    partial = client.get(
        f"/api/v1/artifacts/{job.result.artifact_id}/content", headers={"Range": "bytes=0-7"}
    )
    assert partial.status_code == 206 and partial.content == b"\x89PNG\r\n\x1a\n"
    original_cookies = dict(client.cookies)
    client.cookies.clear()
    client.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"})
    assert client.get(f"/api/v1/artifacts/{job.result.artifact_id}/content").status_code == 404
    client.cookies.clear()
    client.cookies.update(original_cookies)
    assert (
        client.get(f"/api/v1/artifacts/{source['artifact_id']}/content").content
        == samples["蓝色.png"]
    )
    invalid = client.post(
        "/api/v1/tools/image-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": source["artifact_id"],
                "crop": {"x": 90, "y": 0, "width": 20, "height": 10},
            }
        },
    )
    assert wait_job(client, invalid.json()["job_id"])["status"] == "failed"


def test_video_trim_crop_watermark_and_audio_mix(
    authenticated: TestClient, samples: dict[str, bytes]
) -> None:
    client = authenticated
    video = upload(client, "视频.mp4", samples["视频.mp4"])
    image = upload(client, "红色.png", samples["红色.png"])
    result = client.post(
        "/api/v1/tools/video-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": video["artifact_id"],
                "start_seconds": 0.5,
                "end_seconds": 1.5,
                "crop": {"x": 0, "y": 0, "width": 80, "height": 40},
                "overlay_id": image["artifact_id"],
                "muted": True,
            }
        },
    )
    job = Job.model_validate(wait_job(client, result.json()["job_id"]))
    assert job.status == "succeeded", job
    assert job.result and job.result.info.duration == pytest.approx(1, abs=0.15)
    assert job.video_processing and job.video_processing.encoder
    assert (job.result.info.width, job.result.info.height, job.result.info.has_audio) == (
        80,
        40,
        False,
    )
    main = upload(client, "主音轨.wav", samples["主音轨.wav"])
    extra = upload(client, "叠加.wav", samples["叠加.wav"])
    result = client.post(
        "/api/v1/tools/audio-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": main["artifact_id"],
                "start_seconds": 0.5,
                "end_seconds": 1.5,
                "overlay_id": extra["artifact_id"],
                "overlay_start_seconds": 0.25,
                "overlay_volume": 0.5,
                "output_format": "wav",
            }
        },
    )
    job = Job.model_validate(wait_job(client, result.json()["job_id"]))
    assert job.status == "succeeded", job
    assert job.result and job.result.info.duration == pytest.approx(1, abs=0.01)
    data = client.get(f"/api/v1/artifacts/{job.result.artifact_id}/content").content
    with wave.open(io.BytesIO(data)) as stream:
        frames = stream.readframes(stream.getnframes())
        values = struct.unpack(f"<{len(frames) // 2}h", frames)
        assert values[1000] == pytest.approx(2121, abs=5)
        assert values[40000] == pytest.approx(4242, abs=5)


@pytest.mark.parametrize(
    ("rotation", "output_format", "size"),
    [(90, "png", (32, 64)), (180, "jpg", (32, 16)), (270, "webp", (32, 64))],
)
def test_image_rotation_resize_and_formats(
    authenticated: TestClient,
    samples: dict[str, bytes],
    rotation: int,
    output_format: str,
    size: tuple[int, int],
) -> None:
    """通过实际媒体任务验证旋转缩放后的尺寸和各图片格式签名。"""
    source = upload(authenticated, "蓝色.png", samples["蓝色.png"])
    response = authenticated.post(
        "/api/v1/tools/image-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": source["artifact_id"],
                "crop": {"x": 0, "y": 0, "width": 64, "height": 32},
                "rotate": rotation,
                "resize_width": 32,
                "output_format": output_format,
            }
        },
    )
    assert response.status_code == 202, response.text
    job = Job.model_validate(wait_job(authenticated, response.json()["job_id"]))
    assert job.status == "succeeded" and job.result, job
    assert (job.result.info.width, job.result.info.height) == size
    content = authenticated.get(f"/api/v1/artifacts/{job.result.artifact_id}/content").content
    assert content.startswith(
        {"png": b"\x89PNG", "jpg": b"\xff\xd8", "webp": b"RIFF"}[output_format]
    )
    if output_format == "webp":
        assert content[8:12] == b"WEBP"


@pytest.mark.parametrize("output_format", ["wav", "mp3"])
def test_audio_volume_fades_and_formats(
    authenticated: TestClient, samples: dict[str, bytes], output_format: str
) -> None:
    """验证音量及淡入淡出实际改变采样，且 WAV/MP3 均可导出。"""
    source = upload(authenticated, "主音轨.wav", samples["主音轨.wav"])
    response = authenticated.post(
        "/api/v1/tools/audio-editor/operations/edit/execute",
        json={
            "parameters": {
                "artifact_id": source["artifact_id"],
                "volume": 0.5,
                "fade_in_seconds": 0.4,
                "fade_out_seconds": 0.4,
                "output_format": output_format,
            }
        },
    )
    assert response.status_code == 202, response.text
    job = Job.model_validate(wait_job(authenticated, response.json()["job_id"]))
    assert job.status == "succeeded" and job.result, job
    assert job.result.info.duration == pytest.approx(2, abs=0.1)
    content = authenticated.get(f"/api/v1/artifacts/{job.result.artifact_id}/content").content
    if output_format == "wav":
        with wave.open(io.BytesIO(content)) as stream:
            values = struct.unpack(
                f"<{stream.getnframes() * stream.getnchannels()}h",
                stream.readframes(stream.getnframes()),
            )
        assert max(values) == pytest.approx(1061, abs=5)
        assert abs(values[0]) < 10 and abs(values[-1]) < 10
    else:
        assert len(content) > 100 and not content.startswith(b"RIFF")


def test_missing_components_and_unusable_programs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("mtools.adapters.media_process.find_program", lambda name: None)
    media = MediaWorkspace(tmp_path)
    assert not media.process.available
    registry = assemble_tools(Settings(data_dir=tmp_path), media)
    assert registry.entries["image-editor"].status == "unavailable"
    assert registry.entries["json-formatter"].status == "available"
    monkeypatch.setattr(
        "mtools.adapters.media_process.find_program", lambda name: str(tmp_path / "broken.exe")
    )
    assert not MediaProcess().available


def test_approval_digest_expiry_actor_replay_and_revoke(tmp_path: Path) -> None:
    media = MediaWorkspace(tmp_path)
    parameters: dict[str, object] = {"artifact_id": "a" * 32, "opacity": 1}
    with pytest.raises(AppError, match="批准"):
        media.authorize("ai:first", "image-editor/edit", parameters)
    ticket = media.approvals().items[0]
    media.decide(ticket.approval_id, True, "ui:user")
    with pytest.raises(AppError):
        media.authorize("ai:other", "image-editor/edit", parameters)
    with pytest.raises(AppError):
        media.authorize("ai:first", "image-editor/edit", {**parameters, "opacity": 0.5})
    media.authorize("ai:first", "image-editor/edit", parameters)
    with pytest.raises(AppError) as reused:
        media.authorize("ai:first", "image-editor/edit", parameters)
    assert reused.value.code == "AI_APPROVAL_INVALID"
    ticket = next(item for item in media.approvals().items if item.actor == "ai:other")
    media.decide(ticket.approval_id, True, "ui:user")
    media.decide(ticket.approval_id, False, "ui:user")
    with pytest.raises(AppError):
        media.authorize("ai:other", "image-editor/edit", parameters)
    with media.connect() as db:
        db.execute("UPDATE approvals SET expires=0")
    with pytest.raises(AppError):
        media.decide(ticket.approval_id, True, "ui:user")


def test_shared_input_and_real_mcp_media_call(tmp_path: Path, samples: dict[str, bytes]) -> None:
    async def exercise() -> None:
        media = MediaWorkspace(tmp_path)
        token = actor.set("ui:user")
        item = media.save(samples["蓝色.png"], "中文.png")
        actor.reset(token)
        env = {**os.environ, "MTOOLS_DATA_DIR": str(tmp_path)}
        async with stdio_client(
            StdioServerParameters(command=sys.executable, args=["-m", "mtools", "mcp"], env=env)
        ) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                discovered = {tool.name for tool in (await session.list_tools()).tools}
                assert {
                    "mtools_image_editor__edit_v1",
                    "mtools_video_editor__edit_v1",
                    "mtools_audio_editor__edit_v1",
                } <= discovered
                denied = await session.call_tool(
                    "mtools_media_library__read_v1", {"artifact_id": item.artifact_id}
                )
                assert denied.isError and "ARTIFACT_NOT_FOUND" in str(denied)
                media.share(item.artifact_id, True, "ui:user")
                read = await session.call_tool(
                    "mtools_media_library__read_v1", {"artifact_id": item.artifact_id}
                )
                assert (
                    read.structuredContent
                    and base64.b64decode(read.structuredContent["content_base64"])
                    == samples["蓝色.png"]
                )
                arguments = {
                    "artifact_id": item.artifact_id,
                    "crop": {"x": 0, "y": 0, "width": 32, "height": 24},
                }
                pending = await session.call_tool("mtools_image_editor__edit_v1", arguments)
                assert pending.isError and "AI_APPROVAL_REQUIRED" in str(pending)
                ticket = media.approvals().items[0]
                media.decide(ticket.approval_id, True, "ui:user")
                called = await session.call_tool("mtools_image_editor__edit_v1", arguments)
                assert not called.isError and called.structuredContent
                job_id = called.structuredContent["job_id"]
                for _ in range(100):
                    status = await session.call_tool(
                        "mtools_media_library__status_v1", {"resource_id": job_id}
                    )
                    assert status.structuredContent
                    if status.structuredContent["status"] == "succeeded":
                        assert status.structuredContent["result"]["info"]["width"] == 32
                        break
                    await asyncio.sleep(0.05)
                else:
                    raise AssertionError(str(status))
                assert media.get_job(job_id, "ui:user").status == "succeeded"
                assert (await session.call_tool("mtools_image_editor__edit_v1", arguments)).isError

    asyncio.run(exercise())


def test_cancel_restart_and_identity(tmp_path: Path, samples: dict[str, bytes]) -> None:
    media = MediaWorkspace(tmp_path)
    cookie, identity = media.identity(None)
    assert media.identity(cookie)[1] == identity
    assert media.identity(cookie[:-1] + ("0" if cookie[-1] != "0" else "1"))[1] != identity
    source = media.save(samples["蓝色.png"], "中文.png")
    job = media.submit("image-editor", ImageEdit(artifact_id=source.artifact_id))
    assert media.cancel_job(job.job_id).status == "cancelled"
    queued = media.submit("image-editor", ImageEdit(artifact_id=source.artifact_id))
    restarted = MediaWorkspace(tmp_path)
    assert restarted.identity(cookie)[1] == identity
    restarted.start()
    try:
        for _ in range(100):
            if restarted.get_job(queued.job_id).status == "interrupted":
                break
            time.sleep(0.02)
        assert restarted.get_job(queued.job_id).status == "interrupted"
    finally:
        restarted.close()


def test_running_cancel_and_atomic_capacity(
    tmp_path: Path, samples: dict[str, bytes], monkeypatch: pytest.MonkeyPatch
) -> None:
    media = MediaWorkspace(tmp_path)
    entered = threading.Event()

    def blocked(command: list[str], cancel: threading.Event) -> None:
        entered.set()
        assert cancel.wait(5)
        raise AppError(409, "JOB_CANCELLED", "处理已取消")

    monkeypatch.setattr(media.process, "run", blocked)
    source = media.save(samples["蓝色.png"], "中文.png")
    media.start()
    try:
        job = media.submit("image-editor", ImageEdit(artifact_id=source.artifact_id))
        assert entered.wait(5)
        assert media.cancel_job(job.job_id).status == "cancel_requested"
        for _ in range(100):
            if media.get_job(job.job_id).status == "cancelled":
                break
            time.sleep(0.02)
        assert media.get_job(job.job_id).status == "cancelled"
        assert media.get_job(job.job_id).result is None
        assert len(list(media.files.iterdir())) == 1
    finally:
        media.close()
    for number in range(7):
        media.reserve(f"{number:032x}")
    with pytest.raises(AppError) as exceeded:
        media.reserve("f" * 32)
    assert exceeded.value.code == "MEDIA_QUOTA"


def test_process_timeout_cancel_and_probe_output_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    media = MediaProcess()
    processes: list[subprocess.Popen[bytes]] = []
    original = subprocess.Popen

    def spawn(
        command: list[str], *, stdin: int, stdout: int, stderr: int, creationflags: int = 0
    ) -> subprocess.Popen[bytes]:
        process = original(
            command, stdin=stdin, stdout=stdout, stderr=stderr, creationflags=creationflags
        )
        processes.append(process)
        return process

    monkeypatch.setattr("mtools.adapters.media_process.subprocess.Popen", spawn)
    cancelled = threading.Event()
    cancelled.set()
    with pytest.raises(AppError) as denied:
        media.run([sys.executable, "-c", "import time; time.sleep(10)"], cancelled)
    assert denied.value.code == "JOB_CANCELLED" and not processes
    with pytest.raises(ValueError):
        media.probe_output([sys.executable, "-c", "print('x'*100000)"], None)
    assert processes[-1].poll() is not None
    clock_values = iter((0.0, 301.0))
    monkeypatch.setattr(
        "mtools.adapters.media_process.time", SimpleNamespace(monotonic=lambda: next(clock_values))
    )
    with pytest.raises(AppError) as timed_out:
        media.run([sys.executable, "-c", "import time; time.sleep(10)"], threading.Event())
    assert timed_out.value.code == "MEDIA_TIMEOUT" and processes[-1].poll() is not None
