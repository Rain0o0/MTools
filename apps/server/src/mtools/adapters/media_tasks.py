import importlib.util
import json
import os
import subprocess
import sys
import threading
import time
import wave
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from mtools.adapters.media_process import FORMATS, MAX_FILE, MediaProcess, process_options
from mtools.contracts.media import MediaInfo, SpeechProcessing, VideoProcessing
from mtools.contracts.media_tasks import (
    SpeechEnvironment,
    SpeechTranscribe,
    SubtitleSpeech,
    VideoConcat,
)
from mtools.contracts.models import AppError
from mtools.shared.subtitles import parse_subtitles

QWEN_MODEL = "Qwen3-TTS-12Hz-1.7B-CustomVoice"
QWEN_URL = f"https://huggingface.co/Qwen/{QWEN_MODEL}"
WHISPER_URL = "https://github.com/openai/whisper"


def concatenate(
    process: MediaProcess,
    parameters: VideoConcat,
    sources: list[tuple[Path, MediaInfo]],
    output: Path,
    cancel: threading.Event,
) -> VideoProcessing | None:
    """统一画面、帧率和音轨后按列表顺序拼接，共用实测编码与 CPU 回退。"""
    if not process.ffmpeg:
        raise AppError(503, "MEDIA_UNAVAILABLE", "请安装 FFmpeg 后重新检测")
    if sum(info.duration for _, info in sources) > 3600:
        raise AppError(422, "MEDIA_LIMIT", "拼接总时长不能超过 1 小时")
    width = parameters.width or sources[0][1].width
    height = parameters.height or sources[0][1].height
    width, height = width + width % 2, height + height % 2
    acceleration = process.acceleration
    if acceleration:
        acceleration.load()
    backend = acceleration.status.backend if acceleration else "cpu"
    started = time.monotonic()

    def command(cpu: bool = False) -> list[str]:
        selected = "cpu" if cpu else backend
        args = [
            str(process.ffmpeg),
            "-nostdin",
            "-v",
            "error",
            "-y",
            "-threads",
            "2",
            "-filter_complex_threads",
            "1",
            "-max_alloc",
            "67108864",
        ]
        if acceleration:
            args.extend(acceleration.input_options(selected))
        filters = []
        for index, (path, info) in enumerate(sources):
            args.extend(
                [
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    FORMATS,
                    "-threads",
                    "2",
                    "-i",
                    str(path),
                ]
            )
            filters.append(
                f"[{index}:v:0]trim=duration={info.duration},setpts=PTS-STARTPTS,"
                f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,"
                f"fps={parameters.fps},format=yuv420p[v{index}]"
            )
            audio = (
                f"[{index}:a:0]aresample=48000" if info.has_audio else "anullsrc=r=48000:cl=stereo"
            )
            filters.append(
                f"{audio},aformat=sample_fmts=fltp:channel_layouts=stereo,apad,"
                f"atrim=duration={info.duration},asetpts=PTS-STARTPTS[a{index}]"
            )
        labels = "".join(f"[v{i}][a{i}]" for i in range(len(sources)))
        upload = acceleration.upload_filter(selected) if acceleration else ""
        filters.append(f"{labels}concat=n={len(sources)}:v=1:a=1[v][a]")
        filters.append(f"[v]format=yuv420p{upload}[out]")
        args.extend(["-filter_complex", ";".join(filters), "-map", "[out]", "-map", "[a]"])
        args.extend(
            acceleration.output_options(selected)
            if acceleration
            else ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23"]
        )
        args.extend(
            [
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
                "-map_metadata",
                "-1",
                "-threads",
                "2",
                "-fs",
                str(MAX_FILE),
                str(output),
            ]
        )
        return args

    try:
        process.run(command(), cancel)
    except AppError as exc:
        if not acceleration or backend == "cpu" or exc.code != "MEDIA_FAILED":
            raise
        acceleration.failed(backend, cancel, started + 300)
        process.run(command(True), cancel, timeout=max(0, 300 - (time.monotonic() - started)))
        return acceleration.result("cpu", fallback=True)
    return acceleration.result(backend) if acceleration else None


class SpeechProcess:
    """通过可信配置的独立 Python 进程执行语音模型，主服务不加载 Torch。"""

    def __init__(self, data_dir: Path) -> None:
        self.root = data_dir / "speech"
        self.root.mkdir(parents=True, exist_ok=True)
        config_path = self.root / "config.json"
        self.config_error = ""
        try:
            config = json.loads(config_path.read_text("utf-8")) if config_path.is_file() else {}
            if not isinstance(config, dict) or any(
                key not in ("python", "qwen_dir", "whisper_model_dir") or not isinstance(value, str)
                for key, value in config.items()
            ):
                raise ValueError("invalid speech config")
        except (OSError, UnicodeError, ValueError):
            config = {}
            self.config_error = "语音配置文件无效，请修复 speech/config.json 后重启。"
        self.qwen_root = Path(
            os.environ.get("MTOOLS_QWEN_TTS_DIR") or config.get("qwen_dir") or self.root / "qwen"
        )
        self.model = self.qwen_root / "models" / QWEN_MODEL
        if (self.qwen_root / "config.json").is_file():
            self.model = self.qwen_root
        qwen_python = (
            self.qwen_root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        )
        default_python = str(qwen_python) if qwen_python.is_file() else sys.executable
        self.python = (
            os.environ.get("MTOOLS_SPEECH_PYTHON") or config.get("python") or default_python
        )
        self.whisper_dir = Path(
            os.environ.get("MTOOLS_WHISPER_MODEL_DIR")
            or config.get("whisper_model_dir")
            or Path.home() / ".cache" / "whisper"
        )
        self._cached: SpeechEnvironment | None = None
        self._checked = 0.0
        self._lock = threading.Lock()

    def environment(self) -> SpeechEnvironment:
        """只探测安装状态与本地模型，不加载权重、不联网下载。"""
        with self._lock:
            if self._cached and time.monotonic() - self._checked < 30:
                return self._cached
            packages: dict[str, bool] = {}
            if getattr(sys, "frozen", False) and self.python == sys.executable:
                packages["edge_tts"] = importlib.util.find_spec("edge_tts") is not None
            elif self.python:
                try:
                    probe = subprocess.run(
                        [
                            self.python,
                            "-c",
                            "import importlib.util,json; print(json.dumps({"
                            "m:importlib.util.find_spec(m) is not None for m in "
                            "['whisper','qwen_tts','edge_tts','torch','soundfile']}))",
                        ],
                        capture_output=True,
                        stdin=subprocess.DEVNULL,
                        timeout=5,
                        **process_options(),
                    )
                    if probe.returncode == 0 and len(probe.stdout) < 4096:
                        packages = json.loads(probe.stdout)
                except (OSError, ValueError, subprocess.SubprocessError):
                    pass
            models = [
                name
                for name in ("tiny", "base", "small", "medium", "large-v3", "turbo")
                if (self.whisper_dir / f"{name}.pt").is_file()
                or (name == "turbo" and (self.whisper_dir / "large-v3-turbo.pt").is_file())
            ]
            qwen = bool(
                packages.get("qwen_tts")
                and packages.get("torch")
                and packages.get("soundfile")
                and (self.model / "config.json").is_file()
                and (
                    (self.model / "model.safetensors").is_file()
                    or (self.model / "model.safetensors.index.json").is_file()
                )
                and (self.model / "speech_tokenizer" / "config.json").is_file()
                and (self.model / "speech_tokenizer" / "model.safetensors").is_file()
            )
            if qwen:
                try:
                    configuration = self.model / "config.json"
                    if configuration.stat().st_size > 1048576:
                        raise ValueError("oversized model config")
                    metadata = json.loads(configuration.read_text("utf-8"))
                    qwen = (
                        metadata.get("tts_model_type") == "custom_voice"
                        and metadata.get("tts_model_size") == "1b7"
                    )
                except (OSError, ValueError, AttributeError):
                    qwen = False
            self._cached = SpeechEnvironment(
                whisper_available=bool(packages.get("whisper") and packages.get("torch")),
                whisper_models=models,
                qwen_available=qwen,
                edge_available=importlib.util.find_spec("edge_tts") is not None,
                preferred_engine="qwen" if qwen else "edge",
                message=self.config_error
                or (
                    "模型仅从本地加载；Edge TTS 需联网并发送字幕正文。缺少模型时请按官方链接安装。"
                ),
            )
            self._checked = time.monotonic()
            return self._cached

    def select(self, parameters: SubtitleSpeech) -> str:
        environment = self.environment()
        engine = environment.preferred_engine if parameters.engine == "auto" else parameters.engine
        if engine == "qwen" and not environment.qwen_available:
            raise AppError(
                503,
                "QWEN_MODEL_MISSING",
                (
                    f"未找到可用的 Qwen3-TTS 1.7B CustomVoice。请下载模型：{QWEN_URL}；"
                    "安装运行环境：https://github.com/QwenLM/Qwen3-TTS，并配置模型目录。"
                ),
            )
        if engine == "edge":
            if not parameters.allow_network:
                raise AppError(
                    422,
                    "NETWORK_CONSENT_REQUIRED",
                    (
                        "Edge TTS 会将字幕正文发送至微软在线服务，"
                        "请明确允许联网（allow_network=true）或选择本地 Qwen。"
                    ),
                )
            if not environment.edge_available:
                raise AppError(
                    503,
                    "EDGE_TTS_MISSING",
                    "未安装 edge-tts，请配置独立语音运行环境：https://github.com/rany2/edge-tts",
                )
        return engine

    def require_whisper(self, parameters: SpeechTranscribe) -> Path:
        environment = self.environment()
        if not environment.whisper_available or parameters.model not in environment.whisper_models:
            raise AppError(
                503,
                "WHISPER_MODEL_MISSING",
                (
                    f"Whisper 运行环境或 {parameters.model} 模型未安装。"
                    f"请按官方说明下载并配置本地模型：{WHISPER_URL}；不会自动下载。"
                ),
            )
        path = self.whisper_dir / f"{parameters.model}.pt"
        if parameters.model == "turbo" and not path.is_file():
            path = self.whisper_dir / "large-v3-turbo.pt"
        return path

    def worker(
        self, payload: dict[str, Any], folder: Path, cancel: threading.Event, deadline: float
    ) -> SpeechProcessing:
        if cancel.is_set():
            raise AppError(409, "JOB_CANCELLED", "处理已取消")
        request = folder / "request.json"
        request.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8", newline="\n")
        worker = Path(__file__).with_name("speech_worker.py")
        runtime = sys.executable if payload["task"] == "edge" else self.python
        environment = dict(
            os.environ,
            HF_HUB_OFFLINE="1",
            TRANSFORMERS_OFFLINE="1",
            PYTHONUTF8="1",
            USE_TF="0",
            OMP_NUM_THREADS="2",
        )
        command = (
            [sys.executable, "_speech-worker", str(request)]
            if getattr(sys, "frozen", False) and runtime == sys.executable
            else [runtime, "-I", str(worker), str(request)]
        )
        with subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=environment,
            **process_options(),
        ) as child:
            try:
                while child.poll() is None:
                    if cancel.wait(0.1):
                        raise AppError(409, "JOB_CANCELLED", "处理已取消")
                    if time.monotonic() > deadline:
                        raise AppError(
                            504, "SPEECH_TIMEOUT", "语音处理超过 30 分钟，请缩短素材或字幕"
                        )
                    if (
                        sum(path.stat().st_size for path in folder.iterdir() if path.is_file())
                        >= MAX_FILE
                    ):
                        raise AppError(413, "MEDIA_LIMIT", "语音临时文件超过 256 MiB，请缩短素材")
                if child.returncode:
                    error_path = folder / "error.json"
                    code = "SPEECH_FAILED"
                    if error_path.is_file() and error_path.stat().st_size < 4096:
                        code = json.loads(error_path.read_text("utf-8")).get("code", code)
                    messages = {
                        "SPEECH_DEPENDENCY": "语音环境缺少依赖，请按官方说明补齐后重试。",
                        "SPEECH_MEMORY": "内存或显存不足，请关闭其他模型或选较小模型。",
                        "EDGE_TTS_FAILED": "Edge TTS 在线请求失败，请检查网络、音色或稍后重试。",
                        "QWEN_LOAD_FAILED": (
                            "Qwen 模型不完整或与运行环境不兼容。请检查官方模型和安装说明："
                            f"{QWEN_URL}；https://github.com/QwenLM/Qwen3-TTS"
                        ),
                    }
                    raise AppError(
                        422,
                        "SPEECH_FAILED",
                        messages.get(
                            code,
                            "语音生成或识别失败，请检查本地模型完整性；Edge TTS 请检查网络与音色。",
                        ),
                    )
            finally:
                if child.poll() is None:
                    child.kill()
                    child.wait(timeout=5)
        return SpeechProcessing.model_validate_json((folder / "processing.json").read_text("utf-8"))

    def transcribe(
        self,
        process: MediaProcess,
        parameters: SpeechTranscribe,
        source: Path,
        output: Path,
        cancel: threading.Event,
    ) -> SpeechProcessing:
        checkpoint = self.require_whisper(parameters)
        deadline = time.monotonic() + 1800
        with TemporaryDirectory(prefix="speech-", dir=output.parent) as temporary:
            folder = Path(temporary)
            audio = folder / "input.wav"
            process.run(
                [
                    str(process.ffmpeg),
                    "-nostdin",
                    "-v",
                    "error",
                    "-y",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    FORMATS,
                    "-i",
                    str(source),
                    "-map",
                    f"0:a:{parameters.audio_stream}",
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-c:a",
                    "pcm_s16le",
                    "-threads",
                    "2",
                    "-fs",
                    str(MAX_FILE),
                    str(audio),
                ],
                cancel,
            )
            processing = self.worker(
                {
                    "task": "whisper",
                    "checkpoint": str(checkpoint),
                    "audio": str(audio),
                    "output": str(output),
                    "language": parameters.language,
                    "format": parameters.output_format,
                },
                folder,
                cancel,
                deadline,
            )
            if not output.is_file() or output.stat().st_size > 300000:
                raise AppError(422, "SUBTITLE_LIMIT", "识别结果为空或超过字幕大小上限")
            parse_subtitles(output.read_text("utf-8"))
            return processing

    def synthesize(
        self,
        process: MediaProcess,
        parameters: SubtitleSpeech,
        text: str,
        output: Path,
        cancel: threading.Event,
    ) -> SpeechProcessing:
        engine = self.select(parameters)
        cues = parse_subtitles(text, speech=True)
        deadline = time.monotonic() + 1800
        with TemporaryDirectory(prefix="speech-", dir=output.parent) as temporary:
            folder = Path(temporary)
            processing = self.worker(
                {
                    "task": engine,
                    "model": str(self.model),
                    "texts": [cue.text for cue in cues],
                    "folder": str(folder),
                    "voice": parameters.voice,
                    "speaker": parameters.speaker,
                    "language": parameters.language,
                    "instruct": parameters.instruct,
                    "rate": parameters.rate,
                },
                folder,
                cancel,
                deadline,
            )
            joined = folder / "timeline.wav"
            with wave.open(str(joined), "wb") as timeline:
                timeline.setparams((1, 2, 24000, 0, "NONE", "not compressed"))
                position = 0
                for index, cue in enumerate(cues):
                    if cancel.is_set():
                        raise AppError(409, "JOB_CANCELLED", "处理已取消")
                    clip = folder / f"{index}.{'mp3' if engine == 'edge' else 'wav'}"
                    info = process.inspect(clip, cancel)
                    speed = max(1, info.duration / (cue.end - cue.start))
                    if speed > 4 or (parameters.fit == "strict" and speed > 1.001):
                        raise AppError(
                            422,
                            "SPEECH_CUE_TOO_LONG",
                            (
                                f"第 {index + 1} 条语音超过字幕时段，"
                                "请延长字幕时间或提高语速；语音未截断。"
                            ),
                        )
                    normalized = folder / "normalized.wav"
                    if speed > 1 and parameters.fit == "speed-up":
                        speed = min(4, speed * 1.02)
                    tempo = f"atempo={min(speed, 2)},atempo={max(1, speed / 2)}"
                    process.run(
                        [
                            str(process.ffmpeg),
                            "-nostdin",
                            "-v",
                            "error",
                            "-y",
                            "-i",
                            str(clip),
                            "-af",
                            tempo,
                            "-ac",
                            "1",
                            "-ar",
                            "24000",
                            "-c:a",
                            "pcm_s16le",
                            str(normalized),
                        ],
                        cancel,
                        timeout=max(0, min(300, deadline - time.monotonic())),
                    )
                    target = round(cue.start * 24000)
                    if target < position:
                        raise AppError(
                            422, "SPEECH_CUE_TOO_LONG", "语音超出相邻字幕时段，请延长字幕时间。"
                        )
                    if target > position:
                        self.silence(timeline, target - position)
                    with wave.open(str(normalized), "rb") as audio:
                        count = audio.getnframes()
                        if target + count > round(cue.end * 24000) + 240:
                            raise AppError(
                                422,
                                "SPEECH_CUE_TOO_LONG",
                                f"第 {index + 1} 条配音无法完整放入字幕时段，请延长时间。",
                            )
                        while data := audio.readframes(24000):
                            timeline.writeframesraw(data)
                    position = target + count
                    clip.unlink()
                    normalized.unlink()
                self.silence(timeline, max(0, round(cues[-1].end * 24000) - position))
            process.run(
                [
                    str(process.ffmpeg),
                    "-nostdin",
                    "-v",
                    "error",
                    "-y",
                    "-i",
                    str(joined),
                    "-c:a",
                    "libmp3lame" if output.suffix == ".mp3" else "pcm_s16le",
                    "-map_metadata",
                    "-1",
                    "-fs",
                    str(MAX_FILE),
                    str(output),
                ],
                cancel,
                timeout=max(0, min(300, deadline - time.monotonic())),
            )
        return processing

    @staticmethod
    def silence(stream: wave.Wave_write, frames: int) -> None:
        while frames:
            count = min(frames, 24000)
            stream.writeframesraw(bytes(count * 2))
            frames -= count
