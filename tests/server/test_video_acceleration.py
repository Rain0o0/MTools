import json
import subprocess
import sys
import threading
from pathlib import Path

import pytest
from mtools.adapters.media_process import MediaProcess
from mtools.adapters.video_acceleration import PROFILES, VideoAccelerator
from mtools.contracts.media import MediaEnvironment, MediaInfo, VideoBackend, VideoEdit
from mtools.contracts.models import AppError


@pytest.fixture
def accelerator(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> VideoAccelerator:
    executable = tmp_path / "ffmpeg.exe"
    executable.write_bytes(b"test program")
    monkeypatch.setattr(VideoAccelerator, "candidates", lambda self: ["nvenc", "qsv", "amf"])
    monkeypatch.setattr(
        VideoAccelerator, "probe", lambda self, backend, **kwargs: backend == "nvenc"
    )
    return VideoAccelerator(
        str(executable), "ffmpeg test", {p[0] for p in PROFILES.values()}, tmp_path / "gpu.json"
    )


def test_cached_detection_and_invalidation(
    accelerator: VideoAccelerator,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    probes: list[VideoBackend] = []

    def probe(self: VideoAccelerator, backend: VideoBackend, **kwargs: object) -> bool:
        probes.append(backend)
        return backend == "qsv"

    monkeypatch.setattr(VideoAccelerator, "probe", probe)
    args = (accelerator.ffmpeg, "ffmpeg test", accelerator.encoders, accelerator.cache)
    cached = VideoAccelerator(*args)
    assert cached.status.backend == "nvenc" and cached.status.cached
    assert not probes
    refreshed = VideoAccelerator(*args, refresh=True)
    assert refreshed.status.backend == "qsv" and probes == ["nvenc", "qsv"]
    probes.clear()
    monkeypatch.setattr(
        "mtools.adapters.video_acceleration.machine_signature", lambda: "new machine"
    )
    assert VideoAccelerator(*args).status.backend == "qsv"
    assert probes == ["nvenc", "qsv"]
    probes.clear()
    Path(accelerator.ffmpeg).write_bytes(b"updated program")
    assert not VideoAccelerator(*args).status.cached
    assert probes


def test_invalid_cache_and_cpu_cache(
    accelerator: VideoAccelerator,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert accelerator.cache
    content = json.loads(accelerator.cache.read_text("utf-8"))
    content["selection"]["backend"] = "untrusted executable"
    accelerator.cache.write_text(json.dumps(content), encoding="utf-8")
    probes: list[VideoBackend] = []

    def probe(self: VideoAccelerator, backend: VideoBackend, **kwargs: object) -> bool:
        probes.append(backend)
        return False

    monkeypatch.setattr(VideoAccelerator, "probe", probe)
    args = (accelerator.ffmpeg, "ffmpeg test", accelerator.encoders, accelerator.cache)
    assert VideoAccelerator(*args).status.backend == "cpu"
    assert probes == ["nvenc", "qsv", "amf"]
    probes.clear()
    assert VideoAccelerator(*args).status.cached
    assert not probes


def test_probe_timeout_does_not_claim_gpu(
    accelerator: VideoAccelerator,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def timeout(*args: object, **kwargs: object) -> None:
        raise subprocess.TimeoutExpired("ffmpeg", 8)

    monkeypatch.undo()
    monkeypatch.setattr("mtools.adapters.video_acceleration.subprocess.Popen", timeout)
    assert not accelerator.probe("nvenc")


@pytest.mark.parametrize("cancelled", [False, True])
def test_probe_reaps_process_on_timeout_or_cancel(
    accelerator: VideoAccelerator,
    monkeypatch: pytest.MonkeyPatch,
    cancelled: bool,
) -> None:
    monkeypatch.undo()
    original = subprocess.Popen
    children: list[subprocess.Popen[bytes]] = []

    def spawn(*args: object, **kwargs: object) -> subprocess.Popen[bytes]:
        child = original(
            [sys.executable, "-c", "import time; time.sleep(10)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        children.append(child)
        return child

    monkeypatch.setattr("mtools.adapters.video_acceleration.subprocess.Popen", spawn)
    cancel = threading.Event()
    timer = threading.Timer(0.1, cancel.set)
    if cancelled:
        timer.start()
    try:
        assert not accelerator.probe("nvenc", cancel=cancel, timeout=5 if cancelled else 0.1)
        assert children and children[-1].poll() is not None
    finally:
        timer.cancel()


@pytest.mark.parametrize("hardware_broken", [True, False])
def test_gpu_failure_retries_cpu_and_preserves_working_hardware(
    accelerator: VideoAccelerator,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    hardware_broken: bool,
) -> None:
    process = MediaProcess.__new__(MediaProcess)
    process.ffmpeg = accelerator.ffmpeg
    process.acceleration = accelerator
    process.environment = MediaEnvironment(available=True, message="ready")
    monkeypatch.setattr(
        VideoAccelerator,
        "probe",
        lambda self, backend, **kwargs: backend == "nvenc" and not hardware_broken,
    )
    commands: list[list[str]] = []
    limits: list[float] = []

    def run(command: list[str], cancel: threading.Event, *, timeout: float = 300) -> None:
        commands.append(command)
        limits.append(timeout)
        if "h264_nvenc" in command:
            raise AppError(422, "MEDIA_FAILED", "failed")

    monkeypatch.setattr(process, "run", run)
    output = tmp_path / "output.mp4"
    parameters = VideoEdit.model_validate(
        {
            "artifact_id": "a" * 32,
            "segments": [{"start_seconds": 1, "end_seconds": 2}, {"end_seconds": 0.5}],
            "speed": 0.5,
            "rotate": 90,
            "grayscale": True,
            "watermarks": [
                {"artifact_id": "b" * 32, "end_seconds": 0.5},
                {"artifact_id": "c" * 32, "start_seconds": 0.5},
            ],
        }
    )
    result = process.execute(
        parameters,
        tmp_path / "source.mp4",
        MediaInfo(kind="video", width=320, height=240, duration=2),
        None,
        None,
        output,
        threading.Event(),
        watermarks=[
            (mark, tmp_path / f"mark-{i}.png", MediaInfo(kind="image", width=8, height=8))
            for i, mark in enumerate(parameters.watermarks)
        ],
    )
    assert result and result.backend == "cpu" and result.fallback
    assert len(commands) == 2 and "libx264" in commands[1]
    assert commands[0][-1] == commands[1][-1] == str(output)
    assert (
        commands[0][commands[0].index("-filter_complex") + 1]
        == (commands[1][commands[1].index("-filter_complex") + 1])
    )
    assert 0 < limits[1] <= limits[0]
    assert accelerator.status.backend == ("cpu" if hardware_broken else "nvenc")
    assert accelerator.load()
    assert accelerator.status.backend == ("cpu" if hardware_broken else "nvenc")


def test_multisegment_qsv_initializes_device_once(
    accelerator: VideoAccelerator,
    tmp_path: Path,
) -> None:
    process = MediaProcess.__new__(MediaProcess)
    process.ffmpeg = accelerator.ffmpeg
    process.acceleration = accelerator
    command = process.command(
        VideoEdit.model_validate(
            {
                "artifact_id": "a" * 32,
                "segments": [
                    {"start_seconds": 1, "end_seconds": 2},
                    {"end_seconds": 0.5},
                ],
            }
        ),
        tmp_path / "source.mp4",
        MediaInfo(kind="video", width=320, height=240, duration=2, has_audio=True),
        None,
        None,
        tmp_path / "out.mp4",
        backend="qsv",
    )
    assert command.count("-init_hw_device") == 1
    assert command.count("-ss") == 2


@pytest.mark.parametrize("error", ["JOB_CANCELLED", "MEDIA_TIMEOUT"])
def test_cancellation_and_timeout_never_retry(
    accelerator: VideoAccelerator,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    error: str,
) -> None:
    process = MediaProcess.__new__(MediaProcess)
    process.ffmpeg = accelerator.ffmpeg
    process.acceleration = accelerator
    calls = 0

    def fail(command: list[str], cancel: threading.Event, *, timeout: float = 300) -> None:
        nonlocal calls
        calls += 1
        raise AppError(409, error, "stopped")

    monkeypatch.setattr(process, "run", fail)
    with pytest.raises(AppError) as exc:
        process.execute(
            VideoEdit(artifact_id="a" * 32),
            tmp_path / "source.mp4",
            MediaInfo(kind="video", width=320, height=240, duration=2),
            None,
            None,
            tmp_path / "output.mp4",
            threading.Event(),
        )
    assert exc.value.code == error and calls == 1
