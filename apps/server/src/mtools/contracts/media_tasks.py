from typing import Annotated, Literal

from pydantic import Field, model_validator

from mtools.contracts.media import ResourceId
from mtools.contracts.models import Contract

LocalPath = Annotated[str, Field(min_length=1, max_length=32768)]
Authorization = Annotated[str, Field(min_length=1, max_length=1000)]


class MediaSource(Contract):
    artifact_id: ResourceId | None = None
    source_path: LocalPath | None = Field(
        default=None, description="MCP 服务所在电脑的绝对本机文件路径，拒绝 UNC 和网络地址。"
    )

    @model_validator(mode="after")
    def one_source(self) -> "MediaSource":
        if (self.artifact_id is None) == (self.source_path is None):
            raise ValueError("必须且只能指定 artifact_id 或 source_path")
        return self


class VideoConcat(Contract):
    sources: list[MediaSource] = Field(min_length=2, max_length=16)
    user_authorization: Authorization | None = Field(
        default=None, description="使用任何本机路径时，引用用户指定全部文件和拼接顺序的任务原话。"
    )
    width: int | None = Field(default=None, ge=2, le=4096, description="留空沿用首段画面大小。")
    height: int | None = Field(default=None, ge=2, le=4096)
    fps: int = Field(default=30, ge=1, le=120)

    @model_validator(mode="after")
    def valid_sources(self) -> "VideoConcat":
        if any(item.source_path for item in self.sources) != bool(self.user_authorization):
            raise ValueError("本机路径拼接须引用用户任务原话")
        if (self.width is None) != (self.height is None):
            raise ValueError("画面宽高须同时指定")
        return self


class SpeechTranscribe(MediaSource):
    user_authorization: Authorization | None = None
    model: Literal["tiny", "base", "small", "medium", "large-v3", "turbo"] = "base"
    language: str | None = Field(default=None, pattern=r"^[a-z]{2,3}$")
    audio_stream: int = Field(default=0, ge=0, le=7, description="音频流序号，从 0 开始。")
    output_format: Literal["srt", "vtt"] = "srt"

    @model_validator(mode="after")
    def consent(self) -> "SpeechTranscribe":
        if bool(self.source_path) != bool(self.user_authorization):
            raise ValueError("本机路径转字幕须引用用户任务原话")
        return self


class SubtitleSpeech(Contract):
    subtitle_text: str | None = Field(default=None, min_length=1, max_length=100000)
    artifact_id: ResourceId | None = None
    source_path: LocalPath | None = None
    user_authorization: Authorization | None = None
    engine: Literal["auto", "edge", "qwen"] = Field(
        default="auto", description="auto 优先使用本地可用 Qwen，其他环境默认 Edge TTS。"
    )
    voice: str = Field(default="zh-CN-XiaoxiaoNeural", pattern=r"^[a-zA-Z0-9-]{1,100}$")
    speaker: Literal[
        "Vivian", "Serena", "Uncle_Fu", "Dylan", "Eric", "Ryan", "Aiden", "Ono_Anna", "Sohee"
    ] = "Vivian"
    language: Literal[
        "Auto",
        "Chinese",
        "English",
        "Japanese",
        "Korean",
        "German",
        "French",
        "Russian",
        "Portuguese",
        "Spanish",
        "Italian",
    ] = "Auto"
    instruct: str = Field(default="", max_length=500)
    rate: int = Field(default=0, ge=-50, le=100, description="Edge TTS 语速百分比。")
    fit: Literal["speed-up", "strict"] = Field(
        default="speed-up",
        description="超出字幕时段时最多加速 4 倍，或 strict 直接报错；不截断语音。",
    )
    output_format: Literal["wav", "mp3"] = "wav"
    allow_network: bool = Field(
        default=False, description="使用 Edge 时必须为 true，字幕文本会发送至微软在线语音服务。"
    )

    @model_validator(mode="after")
    def valid_input(self) -> "SubtitleSpeech":
        if (
            sum(
                value is not None
                for value in (self.subtitle_text, self.artifact_id, self.source_path)
            )
            != 1
        ):
            raise ValueError("必须且只能指定字幕正文、资源编号或本机字幕路径")
        if bool(self.source_path) != bool(self.user_authorization):
            raise ValueError("本机字幕路径须引用用户任务原话")
        return self


class SpeechEnvironment(Contract):
    whisper_available: bool
    whisper_models: list[str]
    qwen_available: bool
    edge_available: bool
    preferred_engine: Literal["qwen", "edge"]
    message: str
    whisper_url: str = "https://github.com/openai/whisper"
    qwen_url: str = "https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
    runtime_url: str = "https://github.com/QwenLM/Qwen3-TTS"


class VideoConcatExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: VideoConcat


class TranscribeExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: SpeechTranscribe


class SubtitleSpeechExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: SubtitleSpeech
