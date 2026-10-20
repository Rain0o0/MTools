from pathlib import Path
from typing import Annotated, cast
from uuid import uuid4

import anyio
from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse

from mtools.adapters.media_process import MAX_FILE
from mtools.contracts.media import (
    ApprovalDecision,
    ApprovalList,
    Artifact,
    ArtifactChunk,
    ArtifactList,
    ArtifactPersistence,
    ArtifactShare,
    AudioExecute,
    EmptyExecute,
    ImageExecute,
    ImportExecute,
    Job,
    JobList,
    MediaEnvironment,
    ReadExecute,
    ResourceExecute,
    SourceRegistration,
    VideoExecute,
)
from mtools.contracts.media_tasks import (
    SpeechEnvironment,
    SubtitleSpeechExecute,
    TranscribeExecute,
    VideoConcatExecute,
)
from mtools.contracts.models import AppError
from mtools.platform.media_workspace import MEDIA_TYPES, MediaWorkspace


def owner(request: Request) -> str:
    value = request.cookies.get("mtools_workspace")
    cookie, identity = request.app.state.media.identity(value)
    if cookie != value:
        raise AppError(403, "WORKSPACE_REQUIRED", "文件工作区已失效，请重新连接后重试")
    return str(identity)


def register_media_routes(app: FastAPI) -> None:
    """为会话文件与任务提供强类型接口，所有计算复用已注册的操作。"""

    def workspace() -> MediaWorkspace:
        return cast(MediaWorkspace, app.state.media)

    @app.get("/api/v1/media/environment", response_model=MediaEnvironment)
    def environment() -> MediaEnvironment:
        return workspace().environment()

    @app.get("/api/v1/media/speech-environment", response_model=SpeechEnvironment)
    def speech_environment() -> SpeechEnvironment:
        return workspace().speech.environment()

    @app.post(
        "/api/v1/tools/video-concat/operations/concat/execute", response_model=Job, status_code=202
    )
    async def concat(body: VideoConcatExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "video-concat",
                "concat",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/speech-transcriber/operations/transcribe/execute",
        response_model=Job,
        status_code=202,
    )
    async def transcribe(body: TranscribeExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "speech-transcriber",
                "transcribe",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/subtitle-speaker/operations/synthesize/execute",
        response_model=Job,
        status_code=202,
    )
    async def synthesize(body: SubtitleSpeechExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "subtitle-speaker",
                "synthesize",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/speech-transcriber/operations/environment/execute",
        response_model=SpeechEnvironment,
    )
    async def transcribe_environment(body: EmptyExecute, request: Request) -> SpeechEnvironment:
        return cast(
            SpeechEnvironment,
            await app.state.runtime.execute(
                "speech-transcriber",
                "environment",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/subtitle-speaker/operations/environment/execute",
        response_model=SpeechEnvironment,
    )
    async def speaker_environment(body: EmptyExecute, request: Request) -> SpeechEnvironment:
        return cast(
            SpeechEnvironment,
            await app.state.runtime.execute(
                "subtitle-speaker",
                "environment",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post("/api/v1/media/environment/check", response_model=MediaEnvironment)
    async def check_environment() -> MediaEnvironment:
        from mtools.adapters.media_process import MediaProcess
        from mtools.bootstrap.tools import assemble_tools

        if app.state.media_check_lock.locked():
            raise AppError(429, "MEDIA_CHECK_BUSY", "已有媒体组件检测正在进行，请稍候")
        async with app.state.media_check_lock:
            media = workspace()
            media.process = await anyio.to_thread.run_sync(
                lambda: MediaProcess(media.root / "video-acceleration.json", refresh=True)
            )
            registry = await anyio.to_thread.run_sync(assemble_tools, app.state.config, media)
            app.state.registry = registry
            app.state.runtime.registry = registry
            return media.process.environment

    @app.post("/api/v1/artifacts/upload", response_model=Artifact, status_code=201)
    async def upload(
        request: Request,
        name: Annotated[str, Query(min_length=1, max_length=120)],
        persistent: bool = False,
    ) -> Artifact:
        app.state.registry.require("media-library", "import")
        if app.state.upload_lock.locked():
            raise AppError(429, "UPLOAD_BUSY", "已有文件正在导入，请稍后重试")
        suffix = Path(name).suffix[1:].lower()
        if suffix not in MEDIA_TYPES:
            raise AppError(422, "INVALID_MEDIA", "请选择支持的图片、视频或音频格式")
        media = workspace()
        path = media.file_path(uuid4().hex, suffix)
        async with app.state.upload_lock:
            await anyio.to_thread.run_sync(media.reserve, path.stem)
            try:
                size = 0
                with anyio.fail_after(120):
                    async with await anyio.open_file(path, "xb") as stream:
                        async for chunk in request.stream():
                            size += len(chunk)
                            if size > MAX_FILE:
                                raise AppError(413, "REQUEST_TOO_LARGE", "单文件不能超过 256 MiB")
                            await stream.write(chunk)
                    info = await anyio.to_thread.run_sync(media.process.inspect, path)
                    return await anyio.to_thread.run_sync(
                        media.register_file, path, name, info, owner(request), persistent
                    )
            except BaseException:
                with anyio.CancelScope(shield=True):
                    await anyio.to_thread.run_sync(lambda: path.unlink(missing_ok=True))
                raise
            finally:
                with anyio.CancelScope(shield=True):
                    await anyio.to_thread.run_sync(media.release, path.stem)

    @app.post("/api/v1/media/local-source", response_model=Artifact, status_code=201)
    def local_source(body: SourceRegistration, request: Request) -> Artifact:
        if app.state.config.mode != "desktop":
            raise AppError(403, "DESKTOP_REQUIRED", "本机原文件引用仅在 MTools 桌面软件中可用")
        return workspace().register_local_source(body.path, owner(request))

    @app.get("/api/v1/artifacts/library", response_model=ArtifactList)
    def library(request: Request) -> ArtifactList:
        return workspace().list_sources(owner(request))

    @app.patch("/api/v1/artifacts/{artifact_id}/persistence", response_model=Artifact)
    def persistence(artifact_id: str, body: ArtifactPersistence, request: Request) -> Artifact:
        return workspace().set_persistent(artifact_id, body.persistent, owner(request))

    @app.delete("/api/v1/artifacts/{artifact_id}", response_model=ArtifactList)
    def remove_source(artifact_id: str, request: Request) -> ArtifactList:
        return workspace().remove_source(artifact_id, owner(request))

    @app.get("/api/v1/artifacts/{artifact_id}/content")
    def content(artifact_id: str, request: Request, download: bool = False) -> FileResponse:
        item, path = workspace().artifact(artifact_id, owner(request))
        return FileResponse(
            path,
            media_type=item.media_type,
            filename=item.name,
            content_disposition_type="attachment" if download else "inline",
        )

    @app.patch("/api/v1/artifacts/{artifact_id}/share", response_model=Artifact)
    def share(artifact_id: str, body: ArtifactShare, request: Request) -> Artifact:
        return workspace().share(artifact_id, body.shared_with_ai, owner(request))

    @app.get("/api/v1/jobs", response_model=JobList)
    def jobs(request: Request) -> JobList:
        return workspace().list_jobs(owner(request))

    @app.get("/api/v1/jobs/{job_id}", response_model=Job)
    def job(job_id: str, request: Request) -> Job:
        return workspace().get_job(job_id, owner(request))

    @app.post("/api/v1/jobs/{job_id}/cancel", response_model=Job)
    def cancel(job_id: str, request: Request) -> Job:
        return workspace().cancel_job(job_id, owner(request))

    @app.delete("/api/v1/artifacts", response_model=JobList)
    def clear(request: Request) -> JobList:
        return workspace().clear(owner(request))

    @app.get("/api/v1/ai/approvals", response_model=ApprovalList)
    def approvals() -> ApprovalList:
        return workspace().approvals()

    @app.post("/api/v1/ai/approvals/{approval_id}", response_model=ApprovalList)
    def decide(approval_id: str, body: ApprovalDecision, request: Request) -> ApprovalList:
        return workspace().decide(approval_id, body.approve, owner(request))

    @app.post("/api/v1/tools/media-library/operations/import/execute", response_model=Artifact)
    async def import_media(body: ImportExecute, request: Request) -> Artifact:
        return cast(
            Artifact,
            await app.state.runtime.execute(
                "media-library",
                "import",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post("/api/v1/tools/media-library/operations/read/execute", response_model=ArtifactChunk)
    async def read_media(body: ReadExecute, request: Request) -> ArtifactChunk:
        return cast(
            ArtifactChunk,
            await app.state.runtime.execute(
                "media-library",
                "read",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post("/api/v1/tools/media-library/operations/jobs/execute", response_model=JobList)
    async def list_media_jobs(body: EmptyExecute, request: Request) -> JobList:
        return cast(
            JobList,
            await app.state.runtime.execute(
                "media-library",
                "jobs",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post("/api/v1/tools/media-library/operations/status/execute", response_model=Job)
    async def media_status(body: ResourceExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "media-library",
                "status",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post("/api/v1/tools/media-library/operations/cancel/execute", response_model=Job)
    async def media_cancel(body: ResourceExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "media-library",
                "cancel",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post("/api/v1/tools/media-library/operations/clear/execute", response_model=JobList)
    async def media_clear(body: EmptyExecute, request: Request) -> JobList:
        return cast(
            JobList,
            await app.state.runtime.execute(
                "media-library",
                "clear",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/image-editor/operations/edit/execute", response_model=Job, status_code=202
    )
    async def image(body: ImageExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "image-editor",
                "edit",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/video-editor/operations/edit/execute", response_model=Job, status_code=202
    )
    async def video(body: VideoExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "video-editor",
                "edit",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )

    @app.post(
        "/api/v1/tools/audio-editor/operations/edit/execute", response_model=Job, status_code=202
    )
    async def audio(body: AudioExecute, request: Request) -> Job:
        return cast(
            Job,
            await app.state.runtime.execute(
                "audio-editor",
                "edit",
                body.parameters.model_dump(),
                "ui",
                request.state.request_id,
                owner(request),
            ),
        )
