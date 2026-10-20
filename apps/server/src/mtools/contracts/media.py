from typing import Annotated, Literal

from pydantic import Field, model_validator

from mtools.contracts.models import Contract

ResourceId = Annotated[str, Field(pattern=r"^[a-f0-9]{32}$")]


VideoBackend = Literal["cpu", "nvenc", "qsv", "amf", "videotoolbox", "vaapi"]


class VideoProcessing(Contract):
    backend: VideoBackend
    encoder: str
    label: str
    fallback: bool = False


class VideoAcceleration(VideoProcessing):
    checked_at: str
    cached: bool = False
    cache_warning: str | None = None


class MediaEnvironment(Contract):
    available: bool
    version: str | None = None
    message: str
    video_acceleration: VideoAcceleration | None = None


class MediaInfo(Contract):
    kind: Literal["image", "video", "audio", "subtitle"]
    width: int = 0
    height: int = 0
    duration: float = 0
    has_audio: bool = False
    frame_rate: float = Field(
        default=0,
        ge=0,
        le=120,
        allow_inf_nan=False,
        description="视频平均帧率；旧记录或未知帧率为 0，组合输出回退到 30 fps",
    )


class Artifact(Contract):
    artifact_id: ResourceId
    name: str
    size: int
    media_type: str
    info: MediaInfo
    shared_with_ai: bool = False
    source_type: Literal["managed", "local"] = Field(
        default="managed", description="managed 为资源库副本；local 为本机原文件只读引用"
    )
    persistent: bool = Field(
        default=False, description="资源库副本是否长期保留；本机原文件引用始终保留至手动移除"
    )
    available: bool = Field(default=True, description="源文件当前是否可读取")


class ArtifactList(Contract):
    items: list[Artifact]


class LocalSourceRequest(Contract):
    path: str = Field(min_length=1, max_length=32768)


class ArtifactPersistence(Contract):
    persistent: bool


class Crop(Contract):
    x: int = Field(default=0, ge=0, le=4096)
    y: int = Field(default=0, ge=0, le=4096)
    width: int = Field(ge=1, le=4096)
    height: int = Field(ge=1, le=4096)


def validate_media_sources(
    artifact_id: str | None,
    source_path: str | None,
    overlay_id: str | None,
    overlay_source_path: str | None,
    user_authorization: str | None,
) -> None:
    if (artifact_id is None) == (source_path is None):
        raise ValueError("必须且只能指定 artifact_id 或 source_path")
    if overlay_id is not None and overlay_source_path is not None:
        raise ValueError("叠加素材只能指定 overlay_id 或 overlay_source_path")
    uses_path = source_path is not None or overlay_source_path is not None
    if uses_path != (user_authorization is not None):
        raise ValueError("指定本机路径时必须提供用户当前任务指令中的相关原文")


class ImageEdit(Contract):
    artifact_id: ResourceId | None = Field(default=None, description="已授权的媒体源编号")
    source_path: str | None = Field(
        default=None,
        min_length=1,
        max_length=32768,
        description=(
            "本机绝对文件路径。若用户当前任务已明确指定此路径和处理动作，直接按指令执行，无需再次询问授权；"
            "仅限本地文件，不接受 UNC/网络路径。"
        ),
    )
    crop: Crop | None = None
    overlay_id: ResourceId | None = None
    overlay_source_path: str | None = Field(
        default=None,
        min_length=1,
        max_length=32768,
        description="本机叠加图片绝对路径。用户当前任务已明确指定此路径和叠加操作时无需再次询问；仅限本地文件。",
    )
    user_authorization: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
        description=(
            "指定任何本机路径时必填：引用当前对话中用户明确指定该路径和处理动作的相关原话；"
            "无需包含单独的同意/授权措辞。"
        ),
    )
    overlay_x: int = Field(default=0, ge=0, le=4096)
    overlay_y: int = Field(default=0, ge=0, le=4096)
    overlay_width: int | None = Field(default=None, ge=1, le=4096)
    opacity: float = Field(default=1, ge=0.01, le=1, allow_inf_nan=False)
    resize_width: int | None = Field(default=None, ge=1, le=4096)
    rotate: Literal[0, 90, 180, 270] = 0
    output_format: Literal["png", "jpg", "webp"] = "png"

    @model_validator(mode="after")
    def valid_sources(self) -> "ImageEdit":
        validate_media_sources(
            self.artifact_id,
            self.source_path,
            self.overlay_id,
            self.overlay_source_path,
            self.user_authorization,
        )
        return self


class VideoSegment(Contract):
    start_seconds: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    end_seconds: float = Field(gt=0, le=3600, allow_inf_nan=False)

    @model_validator(mode="after")
    def valid_interval(self) -> "VideoSegment":
        if self.end_seconds <= self.start_seconds:
            raise ValueError("片段结束时间须晚于开始时间")
        return self


class VideoWatermark(Contract):
    artifact_id: ResourceId | None = None
    source_path: str | None = Field(default=None, min_length=1, max_length=32768)
    x: int = Field(default=0, ge=0, le=4096)
    y: int = Field(default=0, ge=0, le=4096)
    width: int | None = Field(default=None, ge=1, le=4096)
    opacity: float = Field(default=1, ge=0.01, le=1, allow_inf_nan=False)
    start_seconds: float = Field(
        default=0, ge=0, le=3600, allow_inf_nan=False, description="相对剪辑并变速后的输出时间"
    )
    end_seconds: float | None = Field(default=None, gt=0, le=3600, allow_inf_nan=False)

    @model_validator(mode="after")
    def valid_source_and_interval(self) -> "VideoWatermark":
        if (self.artifact_id is None) == (self.source_path is None):
            raise ValueError("每个水印必须且只能指定 artifact_id 或 source_path")
        if self.end_seconds is not None and self.end_seconds <= self.start_seconds:
            raise ValueError("水印结束时间须晚于开始时间")
        return self


class VideoTrack(Contract):
    artifact_id: ResourceId
    kind: Literal["video", "image", "audio"]
    source_start_seconds: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    source_end_seconds: float = Field(gt=0, le=3600, allow_inf_nan=False)
    timeline_start_seconds: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    volume: float = Field(default=1, ge=0, le=4, allow_inf_nan=False)
    x: int = Field(default=0, ge=0, le=4096)
    y: int = Field(default=0, ge=0, le=4096)
    width: int | None = Field(default=None, ge=1, le=4096)
    opacity: float = Field(default=1, ge=0.01, le=1, allow_inf_nan=False)

    @model_validator(mode="after")
    def valid_interval(self) -> "VideoTrack":
        if self.source_end_seconds <= self.source_start_seconds:
            raise ValueError("轨道片段结束时间须晚于开始时间")
        return self


class VideoEdit(Contract):
    artifact_id: ResourceId | None = Field(default=None, description="已授权的视频源编号")
    source_path: str | None = Field(
        default=None,
        min_length=1,
        max_length=32768,
        description=(
            "本机视频绝对文件路径。若用户当前任务已明确指定此路径和处理动作，直接按指令执行，无需再次询问授权；"
            "仅限本地文件，不接受 UNC/网络路径。"
        ),
    )
    start_seconds: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    end_seconds: float | None = Field(default=None, gt=0, le=3600, allow_inf_nan=False)
    crop: Crop | None = None
    overlay_id: ResourceId | None = None
    overlay_source_path: str | None = Field(
        default=None,
        min_length=1,
        max_length=32768,
        description="本机叠加图片绝对路径。用户当前任务已明确指定此路径和叠加操作时无需再次询问；仅限本地文件。",
    )
    user_authorization: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
        description=(
            "指定任何本机路径时必填：引用当前对话中用户明确指定该路径和处理动作的相关原话；"
            "无需包含单独的同意/授权措辞。"
        ),
    )
    overlay_x: int = Field(default=0, ge=0, le=4096)
    overlay_y: int = Field(default=0, ge=0, le=4096)
    overlay_width: int | None = Field(default=None, ge=1, le=4096)
    opacity: float = Field(default=1, ge=0.01, le=1, allow_inf_nan=False)
    muted: bool = False
    segments: list[VideoSegment] = Field(
        default_factory=list,
        max_length=16,
        description="按数组顺序保留原视频片段，允许重排或重复；与非默认的单段起止参数互斥",
    )
    watermarks: list[VideoWatermark] = Field(
        default_factory=list,
        max_length=8,
        description="按数组顺序叠加，后者在上层；与旧 overlay 参数共计最多 8 层",
    )
    tracks: list[VideoTrack] = Field(
        default_factory=list,
        max_length=8,
        description="叠加的视频、图片或音频轨道片段，素材引用资源库；最多 8 段",
    )
    subtitle_id: ResourceId | None = Field(default=None, description="可选 SRT/WebVTT 字幕产物")
    rotate: Literal[0, 90, 180, 270] = 0
    flip_horizontal: bool = False
    flip_vertical: bool = False
    resize_width: int | None = Field(default=None, ge=2, le=4096)
    speed: float = Field(default=1, ge=0.25, le=4, allow_inf_nan=False)
    brightness: float = Field(default=0, ge=-1, le=1, allow_inf_nan=False)
    contrast: float = Field(default=1, ge=0, le=2, allow_inf_nan=False)
    saturation: float = Field(default=1, ge=0, le=3, allow_inf_nan=False)
    grayscale: bool = False
    volume: float = Field(default=1, ge=0, le=4, allow_inf_nan=False)
    fade_in_seconds: float = Field(default=0, ge=0, le=30, allow_inf_nan=False)
    fade_out_seconds: float = Field(default=0, ge=0, le=30, allow_inf_nan=False)

    @model_validator(mode="after")
    def valid_interval(self) -> "VideoEdit":
        validate_media_sources(
            self.artifact_id,
            self.source_path,
            self.overlay_id,
            self.overlay_source_path,
            self.user_authorization if self.source_path or self.overlay_source_path else None,
        )
        uses_path = bool(
            self.source_path
            or self.overlay_source_path
            or any(w.source_path for w in self.watermarks)
        )
        if uses_path != (self.user_authorization is not None):
            raise ValueError("指定本机路径时必须提供用户当前任务指令中的相关原文")
        if self.segments and (self.start_seconds != 0 or self.end_seconds is not None):
            raise ValueError("多片段模式不能同时指定单段开始或结束时间")
        if sum(s.end_seconds - s.start_seconds for s in self.segments) > 3600:
            raise ValueError("所选片段总时长不能超过 3600 秒")
        if len(self.watermarks) + bool(self.overlay_id or self.overlay_source_path) > 8:
            raise ValueError("水印总数不能超过 8 个")
        if self.end_seconds is not None and self.end_seconds <= self.start_seconds:
            raise ValueError("结束时间须晚于开始时间")
        return self


class AudioEdit(Contract):
    artifact_id: ResourceId | None = Field(default=None, description="已授权的音频源编号")
    source_path: str | None = Field(
        default=None,
        min_length=1,
        max_length=32768,
        description=(
            "本机音频绝对文件路径。若用户当前任务已明确指定此路径和处理动作，直接按指令执行，无需再次询问授权；"
            "仅限本地文件，不接受 UNC/网络路径。"
        ),
    )
    start_seconds: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    end_seconds: float | None = Field(default=None, gt=0, le=3600, allow_inf_nan=False)
    overlay_id: ResourceId | None = None
    overlay_source_path: str | None = Field(
        default=None,
        min_length=1,
        max_length=32768,
        description="本机叠加音频绝对路径。用户当前任务已明确指定此路径和混音操作时无需再次询问；仅限本地文件。",
    )
    user_authorization: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
        description=(
            "指定任何本机路径时必填：引用当前对话中用户明确指定该路径和处理动作的相关原话；"
            "无需包含单独的同意/授权措辞。"
        ),
    )
    overlay_start_seconds: float = Field(default=0, ge=0, le=3600, allow_inf_nan=False)
    volume: float = Field(default=1, ge=0, le=4, allow_inf_nan=False)
    overlay_volume: float = Field(default=0.5, ge=0, le=4, allow_inf_nan=False)
    fade_in_seconds: float = Field(default=0, ge=0, le=30, allow_inf_nan=False)
    fade_out_seconds: float = Field(default=0, ge=0, le=30, allow_inf_nan=False)
    output_format: Literal["mp3", "wav"] = "mp3"

    @model_validator(mode="after")
    def valid_interval(self) -> "AudioEdit":
        validate_media_sources(
            self.artifact_id,
            self.source_path,
            self.overlay_id,
            self.overlay_source_path,
            self.user_authorization,
        )
        if self.end_seconds is not None and self.end_seconds <= self.start_seconds:
            raise ValueError("结束时间须晚于开始时间")
        return self


class ImageExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: ImageEdit


class VideoExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: VideoEdit


class AudioExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: AudioEdit


class ResourceRef(Contract):
    resource_id: ResourceId


class ImportMedia(Contract):
    name: str = Field(min_length=1, max_length=120)
    content_base64: str = Field(min_length=4, max_length=700_000)


class ReadArtifact(Contract):
    artifact_id: ResourceId
    offset: int = Field(default=0, ge=0, le=268_435_456)


class ArtifactChunk(Contract):
    artifact: Artifact
    content_base64: str
    next_offset: int | None


class EmptyParameters(Contract):
    pass


class SourceRegistration(Contract):
    path: str = Field(min_length=1, max_length=32768)


class SpeechProcessing(Contract):
    engine: Literal["whisper", "edge", "qwen"]
    device: Literal["cpu", "cuda", "online"]


class Job(Contract):
    job_id: ResourceId
    tool_id: str
    status: Literal[
        "queued", "running", "cancel_requested", "succeeded", "failed", "cancelled", "interrupted"
    ]
    stage: str
    created_at: str
    result: Artifact | None = None
    error: str | None = None
    speech_processing: SpeechProcessing | None = None
    video_processing: VideoProcessing | None = Field(
        default=None, description="视频完成时的实际编码方式；fallback=true 表示硬件失败后改用 CPU"
    )


class JobList(Contract):
    items: list[Job]


class Approval(Contract):
    approval_id: ResourceId
    actor: str
    operation: str
    parameters_summary: str
    expires_at: str
    status: Literal["pending", "approved", "rejected", "used"]


class ApprovalList(Contract):
    items: list[Approval]


class ApprovalDecision(Contract):
    approve: bool


class ArtifactShare(Contract):
    shared_with_ai: bool


class ImportExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: ImportMedia


class ReadExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: ReadArtifact


class ResourceExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: ResourceRef


class EmptyExecute(Contract):
    contract_version: Literal[1] = 1
    parameters: EmptyParameters = Field(default_factory=EmptyParameters)
