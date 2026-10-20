from importlib.resources import files
from typing import cast

from pydantic import BaseModel

from mtools.bootstrap.config import Settings
from mtools.contracts.media import (
    Artifact,
    ArtifactChunk,
    ArtifactList,
    AudioEdit,
    EmptyParameters,
    ImageEdit,
    ImportMedia,
    Job,
    JobList,
    MediaEnvironment,
    ReadArtifact,
    ResourceRef,
    VideoEdit,
)
from mtools.contracts.media_tasks import (
    SpeechEnvironment,
    SpeechTranscribe,
    SubtitleSpeech,
    VideoConcat,
)
from mtools.contracts.models import Manifest
from mtools.platform.media_workspace import MediaWorkspace
from mtools.platform.registry import OperationHandler, ToolRegistration, ToolRegistry
from mtools.tools.tool_json_formatter.schemas import JsonParameters, JsonResult
from mtools.tools.tool_json_formatter.service import format_json
from mtools.tools.tool_json_lines.schemas import JsonLinesParameters, JsonLinesResult
from mtools.tools.tool_json_lines.service import convert_lines
from mtools.tools.tool_text_codec.schemas import CodecParameters, CodecResult
from mtools.tools.tool_text_codec.service import transform_text
from mtools.tools.tool_text_diff.schemas import DiffParameters, DiffResult
from mtools.tools.tool_text_diff.service import compare_text


def json_operation(parameters: BaseModel) -> JsonResult:
    return format_json(cast(JsonParameters, parameters))


def diff_operation(parameters: BaseModel) -> DiffResult:
    return compare_text(cast(DiffParameters, parameters))


def lines_operation(parameters: BaseModel) -> JsonLinesResult:
    return convert_lines(cast(JsonLinesParameters, parameters))


def codec_operation(parameters: BaseModel) -> CodecResult:
    return transform_text(cast(CodecParameters, parameters))


def assemble_tools(settings: Settings, media: MediaWorkspace | None = None) -> ToolRegistry:
    bindings = [
        ("json_formatter", "format", OperationHandler(JsonParameters, JsonResult, json_operation)),
        ("text_diff", "compare", OperationHandler(DiffParameters, DiffResult, diff_operation)),
        (
            "json_lines",
            "convert",
            OperationHandler(JsonLinesParameters, JsonLinesResult, lines_operation),
        ),
        (
            "text_codec",
            "transform",
            OperationHandler(CodecParameters, CodecResult, codec_operation),
        ),
    ]
    registrations = [
        ToolRegistration(
            Manifest.model_validate_json(
                files(f"mtools.tools.tool_{package}").joinpath("manifest.json").read_text("utf-8")
            ),
            {operation: handler},
        )
        for package, operation, handler in bindings
    ]
    if media:
        for package, model in (
            ("image_editor", ImageEdit),
            ("video_editor", VideoEdit),
            ("audio_editor", AudioEdit),
        ):
            tool_id = package.replace("_", "-")

            def submit(parameters: BaseModel, target: str = tool_id) -> Job:
                return media.submit(target, cast(ImageEdit | VideoEdit | AudioEdit, parameters))

            registrations.append(
                ToolRegistration(
                    Manifest.model_validate_json(
                        files(f"mtools.tools.tool_{package}")
                        .joinpath("manifest.json")
                        .read_text("utf-8")
                    ),
                    {"edit": OperationHandler(model, Job, submit)},
                )
            )
        registrations.append(
            ToolRegistration(
                Manifest.model_validate_json(
                    files("mtools.tools.tool_media_library")
                    .joinpath("manifest.json")
                    .read_text("utf-8")
                ),
                {
                    "environment": OperationHandler(
                        EmptyParameters, MediaEnvironment, lambda p: media.environment()
                    ),
                    "import": OperationHandler(
                        ImportMedia,
                        Artifact,
                        lambda p: media.import_base64(
                            cast(ImportMedia, p).name, cast(ImportMedia, p).content_base64
                        ),
                    ),
                    "read": OperationHandler(
                        ReadArtifact,
                        ArtifactChunk,
                        lambda p: media.read(
                            cast(ReadArtifact, p).artifact_id, cast(ReadArtifact, p).offset
                        ),
                    ),
                    "sources": OperationHandler(
                        EmptyParameters, ArtifactList, lambda p: media.list_sources()
                    ),
                    "jobs": OperationHandler(EmptyParameters, JobList, lambda p: media.list_jobs()),
                    "status": OperationHandler(
                        ResourceRef, Job, lambda p: media.get_job(cast(ResourceRef, p).resource_id)
                    ),
                    "cancel": OperationHandler(
                        ResourceRef,
                        Job,
                        lambda p: media.cancel_job(cast(ResourceRef, p).resource_id),
                    ),
                    "clear": OperationHandler(EmptyParameters, JobList, lambda p: media.clear()),
                },
            )
        )
        for package, task_model, operation in (
            ("video_concat", VideoConcat, "concat"),
            ("speech_transcriber", SpeechTranscribe, "transcribe"),
            ("subtitle_speaker", SubtitleSpeech, "synthesize"),
        ):

            def submit_task(parameters: BaseModel, target: str = package.replace("_", "-")) -> Job:
                return media.submit(
                    target, cast(VideoConcat | SpeechTranscribe | SubtitleSpeech, parameters)
                )

            handlers = {operation: OperationHandler(task_model, Job, submit_task)}
            if package != "video_concat":
                handlers["environment"] = OperationHandler(
                    EmptyParameters, SpeechEnvironment, lambda p: media.speech.environment()
                )
            registrations.append(
                ToolRegistration(
                    Manifest.model_validate_json(
                        files(f"mtools.tools.tool_{package}")
                        .joinpath("manifest.json")
                        .read_text("utf-8")
                    ),
                    handlers,
                )
            )
    registry = ToolRegistry(
        registrations,
        settings.mode,
        settings.disabled_tools,
        {"filesystem": False, "network": False, "clipboard": False},
    )
    if media and not media.process.available:
        for tool_id in (
            "image-editor",
            "video-editor",
            "audio-editor",
            "video-concat",
            "speech-transcriber",
            "subtitle-speaker",
        ):
            entry = registry.entries[tool_id]
            if entry.status == "available":
                entry.status, entry.reason, entry.available_operations = (
                    "unavailable",
                    media.process.environment.message,
                    [],
                )
        library = registry.entries["media-library"]
        library.available_operations = [op for op in library.available_operations if op != "import"]
    return registry
