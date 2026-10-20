import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

from mtools.adapters.video_acceleration import VideoAccelerator
from mtools.adapters.video_pipeline import TrackInput, WatermarkInput, video_arguments
from mtools.contracts.media import (
    AudioEdit,
    ImageEdit,
    MediaEnvironment,
    MediaInfo,
    VideoBackend,
    VideoEdit,
    VideoProcessing,
    VideoWatermark,
)
from mtools.contracts.models import AppError

MAX_FILE = 256 * 1024 * 1024
FORMATS = "mov,matroska,mp3,wav,flac,ogg,png_pipe,jpeg_pipe,webp_pipe"


def find_program(name: str) -> str | None:
    """优先使用受控发行目录，再探测系统 PATH，不接受调用参数指定程序。"""
    if getattr(sys, "frozen", False):
        candidate = Path(sys.executable).parent / "media" / f"{name}.exe"
        if candidate.is_file():
            return str(candidate)
    return shutil.which(name)


def process_options() -> dict[str, Any]:
    return {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}


class MediaProcess:
    """以有限参数和本地产物驱动 FFmpeg，隔离网络、命令和子进程生命周期。"""

    def __init__(self, cache: Path | None = None, *, refresh: bool = False) -> None:
        self.ffmpeg = find_program("ffmpeg")
        self.ffprobe = find_program("ffprobe")
        self.cache, self.refresh = cache, refresh
        self.acceleration: VideoAccelerator | None = None
        self.filters: set[str] = set()
        self.environment = self.detect()

    @property
    def available(self) -> bool:
        return self.environment.available

    def detect(self) -> MediaEnvironment:
        if not self.ffmpeg or not self.ffprobe:
            return MediaEnvironment(
                available=False,
                message=(
                    "未找到完整的媒体组件。请安装 FFmpeg（包含 ffprobe）并加入系统 PATH，"
                    "再点击重新检测；软件不会自动下载程序。"
                ),
            )
        try:
            outputs = []
            for program, arguments in (
                (self.ffmpeg, ["-version"]),
                (self.ffprobe, ["-version"]),
                (self.ffmpeg, ["-hide_banner", "-encoders"]),
                (self.ffmpeg, ["-hide_banner", "-filters"]),
            ):
                result = subprocess.run(
                    [program, *arguments],
                    stdin=subprocess.DEVNULL,
                    capture_output=True,
                    timeout=2,
                    **process_options(),
                )
                if result.returncode or len(result.stdout) > 262_144:
                    raise ValueError("unusable component")
                outputs.append(result.stdout.decode("utf-8", errors="replace"))
            encoders = {
                line.split()[1] for line in outputs[2].splitlines() if len(line.split()) >= 2
            }
            filters = {
                line.split()[1] for line in outputs[3].splitlines() if len(line.split()) >= 2
            }
            self.filters = filters
            if (
                not {"png", "mjpeg", "libwebp", "libx264", "aac", "libmp3lame", "pcm_s16le"}
                <= encoders
            ):
                return MediaEnvironment(
                    available=False,
                    message=(
                        "媒体组件缺少所需的图片、MP4 或 MP3 编码器，"
                        "请安装完整版 FFmpeg 后重新检测。"
                    ),
                )
            if (
                not {
                    "crop",
                    "scale",
                    "overlay",
                    "amix",
                    "volume",
                    "afade",
                    "colorchannelmixer",
                    "pad",
                    "setpts",
                    "atrim",
                    "asetpts",
                    "transpose",
                    "hflip",
                    "vflip",
                    "format",
                    "setsar",
                    "trim",
                    "concat",
                    "atempo",
                    "apad",
                    "eq",
                    "tpad",
                    "fps",
                    "adelay",
                    "anull",
                }
                <= filters
            ):
                return MediaEnvironment(
                    available=False,
                    message="媒体组件缺少裁剪、叠加或混音功能，请安装完整版 FFmpeg 后重新检测。",
                )
            if not outputs[0].startswith("ffmpeg version ") or not outputs[1].startswith(
                "ffprobe version "
            ):
                raise ValueError("unexpected component")
            self.acceleration = VideoAccelerator(
                self.ffmpeg, outputs[0].splitlines()[0], encoders, self.cache, refresh=self.refresh
            )
            return MediaEnvironment(
                available=True,
                version=outputs[0].splitlines()[0].split(" Copyright")[0][:160],
                message="媒体组件已就绪，支持图片、视频和音频处理。",
                video_acceleration=self.acceleration.status,
            )
        except (OSError, ValueError, subprocess.SubprocessError):
            return MediaEnvironment(
                available=False,
                message="媒体组件无法正常运行或检测超时。请检查安装、系统兼容性与运行权限，再重新检测。",
            )

    def probe_output(self, command: list[str], cancel: threading.Event | None) -> bytes:
        buffer = bytearray()
        oversized = threading.Event()
        started = time.monotonic()
        with subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            **process_options(),
        ) as process:
            if process.stdout is None:
                raise ValueError("probe output unavailable")
            stream = process.stdout

            def read() -> None:
                while chunk := stream.read(8192):
                    buffer.extend(chunk[: 65_537 - len(buffer)])
                    if len(buffer) > 65_536:
                        oversized.set()
                        return

            reader = threading.Thread(target=read, daemon=True)
            reader.start()
            try:
                while process.poll() is None:
                    if cancel and cancel.is_set():
                        raise AppError(409, "JOB_CANCELLED", "处理已取消")
                    if oversized.is_set() or time.monotonic() - started > 15:
                        raise ValueError("probe resource limit")
                    threading.Event().wait(0.05)
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait(timeout=5)
                reader.join(timeout=2)
            if process.returncode or oversized.is_set():
                raise ValueError("invalid media")
        return bytes(buffer)

    def inspect(self, path: Path, cancel: threading.Event | None = None) -> MediaInfo:
        if path.suffix.lower() in (".srt", ".vtt"):
            from mtools.shared.subtitles import parse_subtitles

            if path.stat().st_size > 300000:
                raise AppError(422, "SUBTITLE_LIMIT", "字幕文件不能超过 300 KB")
            try:
                cues = parse_subtitles(path.read_text("utf-8-sig"))
            except UnicodeError as exc:
                raise AppError(422, "INVALID_SUBTITLE", "字幕须使用 UTF-8 编码") from exc
            return MediaInfo(kind="subtitle", duration=cues[-1].end)
        if not self.ffprobe:
            raise AppError(503, "MEDIA_UNAVAILABLE", "媒体组件未安装，请查看媒体工具帮助")
        try:
            result = self.probe_output(
                [
                    self.ffprobe,
                    "-v",
                    "error",
                    "-max_alloc",
                    "67108864",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    FORMATS,
                    "-show_entries",
                    "format=format_name,duration:stream=codec_type,width,height,duration,avg_frame_rate",
                    "-of",
                    "json",
                    str(path),
                ],
                cancel,
            )
            data = json.loads(result)
            streams = data.get("streams", [])
            if not streams or len(streams) > 8:
                raise ValueError("invalid streams")
            visual = next((item for item in streams if item["codec_type"] == "video"), None)
            audio = any(item["codec_type"] == "audio" for item in streams)
            duration = float(data["format"].get("duration", 0))
            frame_rate = 0.0
            image = data["format"]["format_name"] in ("png_pipe", "jpeg_pipe", "webp_pipe")
            width, height = (int(visual["width"]), int(visual["height"])) if visual else (0, 0)
            if width > 4096 or height > 4096 or width * height > 16_777_216:
                raise AppError(422, "MEDIA_LIMIT", "画面最长边不能超过 4096 像素")
            if not image and not 0 < duration <= 3600:
                raise AppError(422, "MEDIA_LIMIT", "音视频须有有效时长，且不能超过 1 小时")
            if visual and not image:
                numerator, denominator = visual.get("avg_frame_rate", "0/1").split("/")
                frame_rate = float(numerator) / max(float(denominator), 1)
                if frame_rate > 120:
                    raise AppError(422, "MEDIA_LIMIT", "视频帧率不能超过 120 帧/秒")
            if not visual and not audio:
                raise ValueError("no playable stream")
            return MediaInfo(
                kind="image" if image else ("video" if visual else "audio"),
                width=width,
                height=height,
                duration=0 if image else duration,
                frame_rate=frame_rate,
                has_audio=audio,
            )
        except (ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError) as exc:
            raise AppError(
                422, "INVALID_MEDIA", "无法读取此文件，请选择受支持且完整的媒体文件"
            ) from exc

    def command(
        self,
        parameters: ImageEdit | VideoEdit | AudioEdit,
        source: Path,
        info: MediaInfo,
        overlay: Path | None,
        overlay_info: MediaInfo | None,
        output: Path,
        *,
        backend: VideoBackend | None = None,
        watermarks: list[WatermarkInput] | None = None,
        tracks: list[TrackInput] | None = None,
        subtitle_path: Path | None = None,
    ) -> list[str]:
        if not self.ffmpeg:
            raise AppError(503, "MEDIA_UNAVAILABLE", "媒体组件不可用")
        args = [
            self.ffmpeg,
            "-nostdin",
            "-v",
            "error",
            "-y",
            "-max_alloc",
            "67108864",
            "-threads",
            "2",
            "-filter_threads",
            "1",
            "-filter_complex_threads",
            "1",
        ]
        video_backend = backend or (
            self.acceleration.status.backend if self.acceleration else "cpu"
        )
        if isinstance(parameters, VideoEdit):
            if subtitle_path and "subtitles" not in self.filters:
                raise AppError(
                    422, "SUBTITLE_FILTER_UNAVAILABLE", "当前 FFmpeg 未启用字幕烧录组件 libass"
                )
            layers = list(watermarks or [])
            if overlay and overlay_info:
                layers.insert(
                    0,
                    (
                        VideoWatermark(
                            artifact_id=parameters.overlay_id,
                            x=parameters.overlay_x,
                            y=parameters.overlay_y,
                            width=parameters.overlay_width,
                            opacity=parameters.opacity,
                        ),
                        overlay,
                        overlay_info,
                    ),
                )
            args.extend(
                video_arguments(
                    parameters,
                    source,
                    info,
                    layers,
                    formats=FORMATS,
                    input_options=self.acceleration.input_options(video_backend)
                    if self.acceleration
                    else [],
                    upload_filter=self.acceleration.upload_filter(video_backend)
                    if self.acceleration
                    else "",
                    output_options=self.acceleration.output_options(video_backend)
                    if self.acceleration
                    else [
                        "-c:v",
                        "libx264",
                        "-preset",
                        "veryfast",
                        "-crf",
                        "23",
                        "-pix_fmt",
                        "yuv420p",
                    ],
                    tracks=tracks,
                    subtitle_path=subtitle_path,
                )
            )
            args.extend(["-threads", "2", "-map_metadata", "-1", "-fs", str(MAX_FILE), str(output)])
            return args

        def add_input(path: Path) -> None:
            args.extend(
                [
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    FORMATS,
                    "-i",
                    str(path),
                ]
            )

        start, duration = 0.0, 0.0
        if not isinstance(parameters, ImageEdit):
            start = parameters.start_seconds
            end = parameters.end_seconds or info.duration
            if start >= info.duration or end > info.duration + 0.05:
                raise AppError(422, "INVALID_INTERVAL", "截取时间超出文件时长")
            duration = end - start
            if start:
                args.extend(["-ss", str(start)])
        add_input(source)
        if overlay:
            add_input(overlay)
        if isinstance(parameters, AudioEdit):
            filters = f"[0:a]asetpts=PTS-STARTPTS,volume={parameters.volume}[main]"
            label = "main"
            if overlay:
                delay = round(parameters.overlay_start_seconds * 1000)
                filters += (
                    f";[1:a]asetpts=PTS-STARTPTS,volume={parameters.overlay_volume},"
                    f"adelay={delay}:all=1[extra];[main][extra]"
                    "amix=inputs=2:duration=first:normalize=0[mixed]"
                )
                label = "mixed"
            fade_in = min(parameters.fade_in_seconds, duration)
            fade_out = min(parameters.fade_out_seconds, duration)
            filters += f";[{label}]atrim=duration={duration},asetpts=PTS-STARTPTS"
            if fade_in:
                filters += f",afade=t=in:d={fade_in}"
            if fade_out:
                filters += f",afade=t=out:st={duration - fade_out}:d={fade_out}"
            filters += "[out]"
            args.extend(
                ["-filter_complex", filters, "-map", "[out]", "-vn", "-ac", "2", "-ar", "44100"]
            )
            args.extend(["-c:a", "libmp3lame" if output.suffix == ".mp3" else "pcm_s16le"])
        else:
            width, height = info.width, info.height
            visual = "[0:v]setpts=PTS-STARTPTS"
            if parameters.crop:
                crop = parameters.crop
                if crop.x + crop.width > width or crop.y + crop.height > height:
                    raise AppError(422, "INVALID_CROP", "裁剪区域超出画面，请调整位置和大小")
                width, height = crop.width, crop.height
                visual += f",crop={width}:{height}:{crop.x}:{crop.y}:exact=1"
            if isinstance(parameters, ImageEdit):
                if parameters.rotate:
                    visual += {90: ",transpose=1", 180: ",hflip,vflip", 270: ",transpose=2"}[
                        parameters.rotate
                    ]
                    if parameters.rotate != 180:
                        width, height = height, width
                if parameters.resize_width:
                    height = round(height * parameters.resize_width / width)
                    width = parameters.resize_width
                    if height > 4096:
                        raise AppError(422, "MEDIA_LIMIT", "缩放后最长边不能超过 4096 像素")
                    visual += f",scale={width}:{max(height, 1)}"
            visual += "[main]"
            label = "main"
            if overlay and overlay_info:
                overlay_width = parameters.overlay_width or overlay_info.width
                overlay_height = round(overlay_info.height * overlay_width / overlay_info.width)
                if (
                    parameters.overlay_x + overlay_width > width
                    or parameters.overlay_y + overlay_height > height
                ):
                    raise AppError(422, "INVALID_OVERLAY", "叠加图片超出画面，请缩小图片或调整位置")
                visual += (
                    f";[1:v]scale={overlay_width}:{overlay_height},format=rgba,"
                    f"colorchannelmixer=aa={parameters.opacity}[extra];"
                    f"[main][extra]overlay={parameters.overlay_x}:{parameters.overlay_y}"
                    ":eof_action=repeat:format=auto[combined]"
                )
                label = "combined"
            args.extend(["-filter_complex", visual, "-map", f"[{label}]"])
            args.extend(["-frames:v", "1", "-update", "1"])
            if output.suffix == ".jpg":
                args.extend(["-q:v", "2"])
        if duration:
            args.extend(["-t", str(duration)])
        args.extend(["-threads", "2", "-map_metadata", "-1", "-fs", str(MAX_FILE), str(output)])
        return args

    def execute(
        self,
        parameters: ImageEdit | VideoEdit | AudioEdit,
        source: Path,
        info: MediaInfo,
        overlay: Path | None,
        overlay_info: MediaInfo | None,
        output: Path,
        cancel: threading.Event,
        *,
        watermarks: list[WatermarkInput] | None = None,
        tracks: list[TrackInput] | None = None,
        subtitle_path: Path | None = None,
    ) -> VideoProcessing | None:
        """硬件编码失败后以相同输入重试 CPU，取消和总限时不因回退重置。"""
        started = time.monotonic()
        acceleration = self.acceleration if isinstance(parameters, VideoEdit) else None
        if acceleration:
            acceleration.load()
        backend = acceleration.status.backend if acceleration else "cpu"
        command = self.command(
            parameters,
            source,
            info,
            overlay,
            overlay_info,
            output,
            backend=backend,
            watermarks=watermarks,
            tracks=tracks,
            subtitle_path=subtitle_path,
        )
        try:
            self.run(command, cancel)
        except AppError as exc:
            if not acceleration or backend == "cpu" or exc.code != "MEDIA_FAILED":
                raise
            if cancel.is_set():
                raise AppError(409, "JOB_CANCELLED", "处理已取消") from exc
            acceleration.failed(backend, cancel, started + 300)
            self.environment.video_acceleration = acceleration.status
            command = self.command(
                parameters,
                source,
                info,
                overlay,
                overlay_info,
                output,
                backend="cpu",
                watermarks=watermarks,
                tracks=tracks,
                subtitle_path=subtitle_path,
            )
            self.run(command, cancel, timeout=max(0, 300 - (time.monotonic() - started)))
            return acceleration.result("cpu", fallback=True)
        return acceleration.result(backend) if acceleration else None

    def run(self, command: list[str], cancel: threading.Event, *, timeout: float = 300) -> None:
        if cancel.is_set():
            raise AppError(409, "JOB_CANCELLED", "处理已取消")
        if timeout <= 0:
            raise AppError(504, "MEDIA_TIMEOUT", "处理超过 5 分钟，请缩短文件或降低分辨率")
        started = time.monotonic()
        with subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            **process_options(),
        ) as process:
            try:
                while process.poll() is None:
                    if cancel.wait(0.1):
                        raise AppError(409, "JOB_CANCELLED", "处理已取消")
                    if time.monotonic() - started > timeout:
                        raise AppError(
                            504, "MEDIA_TIMEOUT", "处理超过 5 分钟，请缩短文件或降低分辨率"
                        )
                if process.returncode:
                    raise AppError(422, "MEDIA_FAILED", "文件处理失败，请检查格式或调整参数")
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait(timeout=5)
