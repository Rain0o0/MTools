import hashlib
import json
import os
import platform
import subprocess
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from mtools.contracts.media import VideoAcceleration, VideoBackend, VideoProcessing

PROFILES: dict[VideoBackend, tuple[str, str, tuple[str, ...]]] = {
    "cpu": ("libx264", "CPU 编码", ("-preset", "veryfast", "-crf", "23")),
    "nvenc": (
        "h264_nvenc",
        "NVIDIA 显卡加速",
        ("-preset", "p4", "-rc", "vbr", "-cq", "23", "-b:v", "0"),
    ),
    "qsv": ("h264_qsv", "Intel 显卡加速", ("-preset", "veryfast", "-global_quality", "23")),
    "amf": (
        "h264_amf",
        "AMD 显卡加速",
        ("-quality", "balanced", "-rc", "cqp", "-qp_i", "23", "-qp_p", "23"),
    ),
    "videotoolbox": (
        "h264_videotoolbox",
        "Apple 显卡加速",
        ("-allow_sw", "0", "-b:v", "8M"),
    ),
    "vaapi": ("h264_vaapi", "VA-API 显卡加速", ("-qp", "23")),
}


def machine_signature() -> str:
    """绑定当前机器、系统及可读取的显卡驱动，避免换机沿用能力缓存。"""
    parts = [platform.node(), platform.system(), platform.release(), platform.machine()]
    if os.name == "nt":
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography"
            ) as key:
                parts.append(str(winreg.QueryValueEx(key, "MachineGuid")[0]))
            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}",
            ) as key:
                for index in range(winreg.QueryInfoKey(key)[0]):
                    name = winreg.EnumKey(key, index)
                    if not name.isdecimal():
                        continue
                    with winreg.OpenKey(key, name) as device:
                        for field in ("DriverDesc", "DriverVersion", "MatchingDeviceId"):
                            try:
                                parts.append(str(winreg.QueryValueEx(device, field)[0]))
                            except OSError:
                                pass
        except OSError:
            pass
    else:
        for path in (Path("/etc/machine-id"), Path("/sys/module/nvidia/version")):
            try:
                parts.append(path.read_text("utf-8")[:256])
            except OSError:
                pass
    return "|".join(parts)


class VideoAccelerator:
    """仅用内置参数实测硬件编码，按机器与组件指纹原子保存选择结果。"""

    def __init__(
        self,
        ffmpeg: str,
        version: str,
        encoders: set[str],
        cache: Path | None,
        *,
        refresh: bool = False,
    ) -> None:
        self.ffmpeg, self.encoders, self.cache = ffmpeg, encoders, cache
        self.device = (
            next(
                (
                    path
                    for path in sorted(Path("/dev/dri").glob("renderD*"))
                    if path.is_char_device()
                ),
                None,
            )
            if platform.system() == "Linux"
            else None
        )
        stat = Path(ffmpeg).stat()
        identity = (
            machine_signature(),
            str(Path(ffmpeg).resolve()),
            stat.st_size,
            stat.st_mtime_ns,
            version,
            str(self.device),
            1,
        )
        self.fingerprint = hashlib.sha256(repr(identity).encode("utf-8")).hexdigest()
        self.status = self.describe("cpu")
        if not refresh and self.load():
            return
        self.select()

    def describe(self, backend: VideoBackend, *, fallback: bool = False) -> VideoAcceleration:
        encoder, label, _ = PROFILES[backend]
        return VideoAcceleration(
            backend=backend,
            encoder=encoder,
            label=label,
            fallback=fallback,
            checked_at=datetime.now(UTC).isoformat(),
        )

    def candidates(self) -> list[VideoBackend]:
        if platform.system() == "Darwin":
            return ["videotoolbox"]
        result: list[VideoBackend] = ["nvenc", "qsv", "amf"]
        if self.device:
            result.append("vaapi")
        return result

    def input_options(self, backend: VideoBackend) -> list[str]:
        if backend == "vaapi" and self.device:
            return ["-vaapi_device", str(self.device)]
        if backend == "qsv":
            return ["-init_hw_device", "qsv=hw:hw"]
        return []

    def output_options(self, backend: VideoBackend) -> list[str]:
        encoder, _, options = PROFILES[backend]
        return ["-c:v", encoder, *options, *([] if backend == "vaapi" else ["-pix_fmt", "yuv420p"])]

    def upload_filter(self, backend: VideoBackend) -> str:
        return ",format=nv12,hwupload" if backend == "vaapi" else ""

    def probe(
        self, backend: VideoBackend, *, cancel: threading.Event | None = None, timeout: float = 8
    ) -> bool:
        """短片实际编码验证驱动和硬件可用性；不读取任何用户文件。"""
        if (
            PROFILES[backend][0] not in self.encoders
            or timeout <= 0
            or (cancel and cancel.is_set())
        ):
            return False
        try:
            started = time.monotonic()
            stopped = cancel or threading.Event()
            with subprocess.Popen(
                [
                    self.ffmpeg,
                    "-nostdin",
                    "-v",
                    "error",
                    "-threads",
                    "2",
                    "-filter_threads",
                    "1",
                    *self.input_options(backend),
                    "-f",
                    "lavfi",
                    "-i",
                    "color=c=black:s=320x240:r=30",
                    "-frames:v",
                    "3",
                    "-vf",
                    "crop=318:238:0:0:exact=1,pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1"
                    + self.upload_filter(backend),
                    *self.output_options(backend),
                    "-f",
                    "null",
                    "-",
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            ) as process:
                try:
                    while process.poll() is None:
                        if time.monotonic() - started >= timeout:
                            return False
                        if stopped.wait(0.05):
                            return False
                    return process.returncode == 0
                finally:
                    if process.poll() is None:
                        process.kill()
                        process.wait(timeout=5)
        except (OSError, subprocess.SubprocessError):
            return False

    def select(
        self,
        exclude: VideoBackend | None = None,
        *,
        cancel: threading.Event | None = None,
        deadline: float | None = None,
    ) -> None:
        for backend in self.candidates():
            remaining = deadline - time.monotonic() if deadline is not None else 8
            if remaining <= 0 or (cancel and cancel.is_set()):
                return
            if backend != exclude and self.probe(backend, cancel=cancel, timeout=min(8, remaining)):
                self.status = self.describe(backend)
                self.save()
                return
        if (cancel and cancel.is_set()) or (deadline is not None and time.monotonic() >= deadline):
            return
        self.status = self.describe("cpu")
        self.save()

    def load(self) -> bool:
        if not self.cache:
            return False
        try:
            if self.cache.stat().st_size > 16384:
                return False
            content = json.loads(self.cache.read_text("utf-8"))
            status = VideoAcceleration.model_validate(content["selection"])
            if content["fingerprint"] != self.fingerprint:
                return False
            if status.backend != "cpu" and status.backend not in self.candidates():
                return False
            if PROFILES[status.backend][0] not in self.encoders:
                return False
            self.status = self.describe(status.backend).model_copy(
                update={"cached": True, "checked_at": status.checked_at}
            )
            return True
        except (OSError, ValueError, KeyError, TypeError):
            return False

    def save(self) -> None:
        if not self.cache:
            return
        temporary = self.cache.with_name(f"{self.cache.name}.{uuid4().hex}.tmp")
        try:
            self.cache.parent.mkdir(parents=True, exist_ok=True)
            temporary.write_text(
                json.dumps(
                    {
                        "fingerprint": self.fingerprint,
                        "selection": self.status.model_dump(),
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
                newline="\n",
            )
            temporary.replace(self.cache)
        except OSError:
            self.status.cache_warning = "无法保存显卡检测结果，下次启动会重新检测。"
        finally:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass

    def failed(self, backend: VideoBackend, cancel: threading.Event, deadline: float) -> None:
        """仅在硬件复测失败时更换后续方案，避免素材兼容问题禁用正常显卡。"""
        if not self.probe(backend, cancel=cancel, timeout=min(8, deadline - time.monotonic())):
            self.select(exclude=backend, cancel=cancel, deadline=deadline)

    def result(self, backend: VideoBackend, *, fallback: bool = False) -> VideoProcessing:
        info = self.describe(backend, fallback=fallback)
        return VideoProcessing(
            backend=info.backend, encoder=info.encoder, label=info.label, fallback=fallback
        )
