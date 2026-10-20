import base64
import binascii
import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
import sys
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from mtools import __version__
from mtools.adapters.media_process import MAX_FILE, MediaProcess
from mtools.adapters.media_tasks import SpeechProcess, concatenate
from mtools.contracts.media import (
    Approval,
    ApprovalList,
    Artifact,
    ArtifactChunk,
    ArtifactList,
    AudioEdit,
    ImageEdit,
    Job,
    JobList,
    MediaEnvironment,
    MediaInfo,
    VideoEdit,
)
from mtools.contracts.media_tasks import MediaSource, SpeechTranscribe, SubtitleSpeech, VideoConcat
from mtools.contracts.models import AppError
from mtools.platform.invocation import actor

TERMINAL = ("succeeded", "failed", "cancelled", "interrupted")
MediaParameters = (
    ImageEdit | VideoEdit | AudioEdit | VideoConcat | SpeechTranscribe | SubtitleSpeech
)
MEDIA_MODELS: dict[str, type[MediaParameters]] = {
    "image-editor": ImageEdit,
    "video-editor": VideoEdit,
    "audio-editor": AudioEdit,
    "video-concat": VideoConcat,
    "speech-transcriber": SpeechTranscribe,
    "subtitle-speaker": SubtitleSpeech,
}
MEDIA_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "mp4": "video/mp4",
    "mkv": "video/x-matroska",
    "mov": "video/quicktime",
    "webm": "video/webm",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "flac": "audio/flac",
    "ogg": "audio/ogg",
    "m4a": "audio/mp4",
    "srt": "application/x-subrip",
    "vtt": "text/vtt",
}


def source_ids(parameters: dict[str, Any]) -> set[str]:
    """统一收集嵌套媒体引用，保护队列和运行任务输入免受清理或移除。"""
    result = {str(parameters[key]) for key in ("artifact_id", "overlay_id") if parameters.get(key)}
    result.update(
        item["artifact_id"] for item in parameters.get("sources", []) if item.get("artifact_id")
    )
    result.update(
        item["artifact_id"] for item in parameters.get("watermarks", []) if item.get("artifact_id")
    )
    result.update(item["artifact_id"] for item in parameters.get("tracks", []))
    if parameters.get("subtitle_id"):
        result.add(parameters["subtitle_id"])
    return result


def timestamp(value: float | None = None) -> str:
    return datetime.fromtimestamp(value or time.time(), UTC).isoformat()


class MediaWorkspace:
    """管理私有产物、可撤销的单次 AI 授权和单实例持久任务队列。"""

    def __init__(
        self, data_dir: Path, retention_hours: int = 24, logger: logging.Logger | None = None
    ) -> None:
        self.retention_hours = retention_hours
        self.logger = logger
        self.root = data_dir / "media"
        self.root.mkdir(parents=True, exist_ok=True)
        self.files = self.root / "files"
        self.files.mkdir(exist_ok=True)
        key_file = self.root / "identity.key"
        try:
            descriptor = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(secrets.token_bytes(32))
        except FileExistsError:
            pass
        self.identity_key = key_file.read_bytes()
        if len(self.identity_key) != 32:
            raise RuntimeError("媒体工作区凭据损坏，请先备份数据并联系支持")
        self.database = self.root / "workspace.sqlite3"
        self.process = MediaProcess(self.root / "video-acceleration.json")
        self.speech = SpeechProcess(data_dir)
        self.stop = threading.Event()
        self.cancel = threading.Event()
        self.thread: threading.Thread | None = None
        self.lock_file: Any = None
        self.worker_mutex = threading.Lock()
        self.started_at = time.time()
        with self.connect() as db:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1, 2):
                raise RuntimeError("媒体数据版本较新，请使用对应版本的软件")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS artifacts (
                    id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL,
                    suffix TEXT NOT NULL, created REAL NOT NULL, source_path TEXT,
                    source_mtime_ns INTEGER, persistent INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL,
                    parameters TEXT NOT NULL, created REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS approvals (
                    id TEXT PRIMARY KEY, actor TEXT NOT NULL, operation TEXT NOT NULL,
                    digest TEXT NOT NULL, summary TEXT NOT NULL, expires REAL NOT NULL,
                    status TEXT NOT NULL, approver TEXT);
                CREATE TABLE IF NOT EXISTS reservations (
                    id TEXT PRIMARY KEY, size INTEGER NOT NULL, expires REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS jobs_owner ON jobs(owner, created);
                CREATE INDEX IF NOT EXISTS artifacts_owner ON artifacts(owner);
                CREATE INDEX IF NOT EXISTS approvals_request ON approvals(actor, operation, digest);
            """)
            columns = {row[1] for row in db.execute("PRAGMA table_info(artifacts)")}
            if "source_path" not in columns:
                db.execute("ALTER TABLE artifacts ADD COLUMN source_path TEXT")
            if "source_mtime_ns" not in columns:
                db.execute("ALTER TABLE artifacts ADD COLUMN source_mtime_ns INTEGER")
            if "persistent" not in columns:
                db.execute("ALTER TABLE artifacts ADD COLUMN persistent INTEGER NOT NULL DEFAULT 0")
            if version < 2:
                db.execute("PRAGMA user_version=2")

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.database, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def start(self) -> None:
        self.thread = threading.Thread(target=self.schedule, name="mtools-media", daemon=True)
        self.thread.start()

    def identity(self, cookie: str | None) -> tuple[str, str]:
        if cookie and len(cookie) == 97:
            identifier, _, signature = cookie.partition(".")
            expected = hmac.new(self.identity_key, identifier.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(signature, expected):
                return cookie, f"ui:{identifier}"
        identifier = uuid4().hex
        signature = hmac.new(self.identity_key, identifier.encode(), hashlib.sha256).hexdigest()
        return f"{identifier}.{signature}", f"ui:{identifier}"

    def visible_owners(self, owner: str) -> list[str]:
        if not owner.startswith("ui:"):
            return [owner]
        with self.connect() as db:
            rows = db.execute(
                "SELECT DISTINCT actor FROM approvals WHERE approver=? AND status='used'", (owner,)
            ).fetchall()
        return [owner, *(row[0] for row in rows)]

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            yield db

    def authorize(self, owner: str, operation: str, parameters: dict[str, Any]) -> None:
        canonical = json.dumps(
            parameters, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        )
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        summary = {key: value for key, value in parameters.items() if key != "content_base64"}
        if "content_base64" in parameters:
            summary["encoded_length"] = len(parameters["content_base64"])
        now = time.time()
        with self.transaction() as db:
            for key, caption in (
                ("artifact_id", "source_file_name"),
                ("overlay_id", "overlay_file_name"),
            ):
                if parameters.get(key):
                    file_row = db.execute(
                        "SELECT data FROM artifacts WHERE id=?", (parameters[key],)
                    ).fetchone()
                    if file_row:
                        summary[caption] = Artifact.model_validate_json(file_row[0]).name
            row = db.execute(
                "SELECT * FROM approvals WHERE actor=? AND operation=? AND digest=? "
                "AND expires>? ORDER BY expires DESC LIMIT 1",
                (owner, operation, digest, now),
            ).fetchone()
            if row and row["status"] == "approved":
                db.execute("UPDATE approvals SET status='used' WHERE id=?", (row["id"],))
                return
            if row and row["status"] in ("used", "rejected"):
                raise AppError(
                    403, "AI_APPROVAL_INVALID", "此请求的授权已使用或被拒绝，请在软件中检查"
                )
            if not row:
                count = db.execute(
                    "SELECT count(*) FROM approvals WHERE expires>?",
                    (now,),
                ).fetchone()[0]
                if count >= 64:
                    raise AppError(429, "APPROVAL_LIMIT", "待处理授权过多，请先在软件中处理")
                db.execute(
                    "INSERT INTO approvals VALUES (?,?,?,?,?,?,?,NULL)",
                    (
                        uuid4().hex,
                        owner,
                        operation,
                        digest,
                        json.dumps(summary, ensure_ascii=False),
                        now + 600,
                        "pending",
                    ),
                )
        raise AppError(
            403,
            "AI_APPROVAL_REQUIRED",
            "请在 MTools 的任务页批准此请求，再用相同参数重试（10 分钟内有效）",
        )

    def approvals(self) -> ApprovalList:
        with self.connect() as db:
            rows = db.execute(
                "SELECT * FROM approvals WHERE expires>? AND status IN ('pending','approved') "
                "ORDER BY expires LIMIT 64",
                (time.time(),),
            ).fetchall()
        return ApprovalList(
            items=[
                Approval(
                    approval_id=row["id"],
                    actor=row["actor"],
                    operation=row["operation"],
                    parameters_summary=row["summary"],
                    expires_at=timestamp(row["expires"]),
                    status=row["status"],
                )
                for row in rows
            ]
        )

    def decide(self, approval_id: str, approve: bool, owner: str) -> ApprovalList:
        with self.transaction() as db:
            updated = db.execute(
                "UPDATE approvals SET status=?,approver=? WHERE id=? AND expires>? "
                "AND status IN ('pending','approved')",
                ("approved" if approve else "rejected", owner, approval_id, time.time()),
            ).rowcount
            if not updated:
                raise AppError(409, "APPROVAL_EXPIRED", "授权已失效或已处理，请刷新")
        return self.approvals()

    def file_path(self, artifact_id: str, suffix: str) -> Path:
        path = self.files / f"{artifact_id}.{suffix}"
        if path.is_symlink() or path.resolve().parent != self.files.resolve():
            raise AppError(403, "INVALID_ARTIFACT", "文件引用不可用")
        return path

    def artifact(self, artifact_id: str, owner: str | None = None) -> tuple[Artifact, Path]:
        owner = owner or actor.get()
        with self.connect() as db:
            row = db.execute("SELECT * FROM artifacts WHERE id=?", (artifact_id,)).fetchone()
        if row:
            item = Artifact.model_validate_json(row["data"])
            if row["owner"] in self.visible_owners(owner) or (
                owner.startswith("ai:") and item.shared_with_ai
            ):
                path = self.source_path(row)
                if path:
                    return item, path
        raise AppError(404, "ARTIFACT_NOT_FOUND", "找不到文件或尚未向此 AI 连接共享")

    def source_path(self, row: sqlite3.Row) -> Path | None:
        if row["source_path"]:
            path = Path(row["source_path"])
            try:
                stat = path.stat()
            except OSError:
                raise AppError(
                    404, "SOURCE_MISSING", "原文件已移动或不可访问，请重新选择"
                ) from None
            item = Artifact.model_validate_json(row["data"])
            if (
                not path.is_file()
                or stat.st_size != item.size
                or stat.st_mtime_ns != row["source_mtime_ns"]
            ):
                raise AppError(409, "SOURCE_CHANGED", "原文件已更改，请重新选择后再处理")
        else:
            path = self.file_path(row["id"], row["suffix"])
        return path if path.is_file() else None

    def quota(self) -> None:
        with self.transaction() as db:
            self.check_space(db, MAX_FILE)

    def check_space(self, db: sqlite3.Connection, requested: int) -> None:
        reservations = {row["id"]: row["size"] for row in db.execute("SELECT * FROM reservations")}
        used = sum(
            path.stat().st_size
            for path in self.files.iterdir()
            if path.is_file() and path.stem not in reservations
        )
        if used + sum(reservations.values()) + requested > 2 * 1024**3:
            raise AppError(413, "MEDIA_QUOTA", "媒体空间不足，请清理已下载的记录后重试")

    def reserve(self, resource_id: str, size: int = MAX_FILE) -> None:
        with self.transaction() as db:
            self.check_space(db, size)
            db.execute(
                "INSERT INTO reservations VALUES (?,?,?)", (resource_id, size, time.time() + 2400)
            )

    def release(self, resource_id: str) -> None:
        with self.connect() as db:
            db.execute("DELETE FROM reservations WHERE id=?", (resource_id,))

    def save(self, content: bytes, name: str, owner: str | None = None) -> Artifact:
        suffix = name.rsplit(".", 1)[-1].lower()
        if suffix not in MEDIA_TYPES or not content or len(content) > MAX_FILE:
            raise AppError(422, "INVALID_MEDIA", "请选择支持的媒体格式，单文件不超过 256 MiB")
        artifact_id = uuid4().hex
        self.reserve(artifact_id, len(content))
        path = self.file_path(artifact_id, suffix)
        try:
            with path.open("xb") as stream:
                stream.write(content)
            info = self.process.inspect(path)
            return self.register_file(path, name, info, owner or actor.get())
        except BaseException:
            path.unlink(missing_ok=True)
            raise
        finally:
            self.release(artifact_id)

    def register_file(
        self,
        path: Path,
        name: str,
        info: MediaInfo,
        owner: str,
        persistent: bool = False,
    ) -> Artifact:
        item = Artifact(
            artifact_id=path.stem,
            name=Path(name.replace("\\", "/")).name[:120],
            size=path.stat().st_size,
            media_type=MEDIA_TYPES[path.suffix[1:]],
            info=info,
            persistent=persistent,
        )
        if item.size >= MAX_FILE:
            raise AppError(413, "MEDIA_LIMIT", "结果超过 256 MiB，请缩短文件或降低分辨率")
        with self.connect() as db:
            db.execute(
                "INSERT INTO artifacts "
                "(id,owner,data,suffix,created,source_path,source_mtime_ns,persistent) "
                "VALUES (?,?,?,?,?,NULL,NULL,?)",
                (
                    item.artifact_id,
                    owner,
                    item.model_dump_json(),
                    path.suffix[1:],
                    time.time(),
                    int(persistent),
                ),
            )
        return item

    def register_local_source(self, value: str, owner: str, persistent: bool = True) -> Artifact:
        if not Path(value).is_absolute() or value.startswith(("\\\\", "//")):
            raise AppError(422, "INVALID_LOCAL_PATH", "只接受本机绝对路径，不接受网络或相对路径")
        try:
            path = Path(value).resolve(strict=True)
        except (OSError, ValueError) as exc:
            raise AppError(422, "SOURCE_MISSING", "无法访问所选的本机文件") from exc
        if path.suffix[1:].lower() not in MEDIA_TYPES or not path.is_file():
            raise AppError(422, "INVALID_MEDIA", "请选择受支持的本机媒体文件")
        stat = path.stat()
        if stat.st_size <= 0 or stat.st_size >= MAX_FILE:
            raise AppError(413, "MEDIA_LIMIT", "本机原文件须小于 256 MiB")
        info = self.process.inspect(path)
        item = Artifact(
            artifact_id=uuid4().hex,
            name=path.name[:120],
            size=stat.st_size,
            media_type=MEDIA_TYPES[path.suffix[1:].lower()],
            info=info,
            source_type="local",
            persistent=persistent,
        )
        with self.connect() as db:
            db.execute(
                "INSERT INTO artifacts "
                "(id,owner,data,suffix,created,source_path,source_mtime_ns,persistent) "
                "VALUES (?,?,?,?,?,?,?,?)",
                (
                    item.artifact_id,
                    owner,
                    item.model_dump_json(),
                    path.suffix[1:].lower(),
                    time.time(),
                    str(path),
                    stat.st_mtime_ns,
                    int(persistent),
                ),
            )
        return item

    def list_sources(self, owner: str | None = None) -> ArtifactList:
        owner = owner or actor.get()
        owners = self.visible_owners(owner) if owner.startswith("ui:") else [owner]
        with self.connect() as db:
            rows = (
                db.execute(
                    f"SELECT * FROM artifacts WHERE owner IN ({','.join('?' for _ in owners)}) "
                    "ORDER BY created DESC",
                    owners,
                ).fetchall()
                if owner.startswith("ui:")
                else db.execute("SELECT * FROM artifacts ORDER BY created DESC").fetchall()
            )
        items = []
        for row in rows:
            item = Artifact.model_validate_json(row["data"])
            if owner.startswith("ai:") and not item.shared_with_ai and row["owner"] != owner:
                continue
            try:
                self.source_path(row)
            except AppError:
                item.available = False
            items.append(item)
        return ArtifactList(items=items[:200])

    def set_persistent(self, artifact_id: str, persistent: bool, owner: str) -> Artifact:
        item, _ = self.artifact(artifact_id, owner)
        if item.source_type == "local" and not persistent:
            raise AppError(
                422,
                "LOCAL_REFERENCE_PERSISTENT",
                "本机原文件引用保存在资源库中；移除引用不会删除原文件",
            )
        item.persistent = persistent
        with self.transaction() as db:
            db.execute(
                "UPDATE artifacts SET data=?,persistent=? WHERE id=? AND owner=?",
                (item.model_dump_json(), int(persistent), artifact_id, owner),
            )
        return item

    def remove_source(self, artifact_id: str, owner: str) -> ArtifactList:
        with self.connect() as db:
            row = db.execute(
                "SELECT * FROM artifacts WHERE id=? AND owner=?", (artifact_id, owner)
            ).fetchone()
        if not row:
            raise AppError(404, "ARTIFACT_NOT_FOUND", "找不到此资源")
        with self.transaction() as db:
            active = db.execute("SELECT data,parameters FROM jobs").fetchall()
            references = {
                value
                for entry in active
                if Job.model_validate_json(entry["data"]).status not in TERMINAL
                for value in source_ids(json.loads(entry["parameters"]))
            }
            if artifact_id in references:
                raise AppError(409, "SOURCE_IN_USE", "文件正在处理中，完成后再从资源库移除")
            db.execute("DELETE FROM artifacts WHERE id=? AND owner=?", (artifact_id, owner))
        if not row["source_path"]:
            self.file_path(artifact_id, row["suffix"]).unlink(missing_ok=True)
        return self.list_sources(owner)

    def import_base64(self, name: str, content: str) -> Artifact:
        try:
            decoded = base64.b64decode(content, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise AppError(422, "INVALID_BASE64", "文件编码无效") from exc
        return self.save(decoded, name)

    def read(self, artifact_id: str, offset: int) -> ArtifactChunk:
        item, path = self.artifact(artifact_id)
        if offset > item.size:
            raise AppError(422, "INVALID_OFFSET", "读取位置超过文件大小")
        with path.open("rb") as stream:
            stream.seek(offset)
            content = stream.read(393_216)
        next_offset = offset + len(content)
        return ArtifactChunk(
            artifact=item,
            content_base64=base64.b64encode(content).decode("ascii"),
            next_offset=next_offset if next_offset < item.size else None,
        )

    def share(self, artifact_id: str, shared: bool, owner: str) -> Artifact:
        item, _ = self.artifact(artifact_id, owner)
        item.shared_with_ai = shared
        with self.connect() as db:
            db.execute(
                "UPDATE artifacts SET data=? WHERE id=? AND owner=?",
                (
                    item.model_dump_json(),
                    artifact_id,
                    owner,
                ),
            )
        return item

    def submit(self, tool_id: str, parameters: MediaParameters) -> Job:
        owner = actor.get()
        if self.thread:
            if not self.thread.is_alive():
                raise AppError(
                    503, "MEDIA_WORKER_UNAVAILABLE", "媒体任务服务已停止，请重启 MTools 后重试"
                )
            if not self.worker_lock() and not self.compatible_worker_running():
                raise AppError(
                    503,
                    "MEDIA_WORKER_VERSION",
                    "检测到旧版 MTools 正在处理媒体任务，请关闭旧版 MTools 或 Codex 连接后重试",
                )
        if isinstance(parameters, (VideoConcat, SpeechTranscribe, SubtitleSpeech)):
            parameters = self.prepare_task(parameters, owner)
        elif (
            parameters.source_path
            or parameters.overlay_source_path
            or (
                isinstance(parameters, VideoEdit)
                and any(w.source_path for w in parameters.watermarks)
            )
        ):
            if not owner.startswith("ai:"):
                raise AppError(403, "AI_PATH_ONLY", "本机路径参数仅用于取得对话授权后的 AI 调用")
            if parameters.source_path:
                source_item = self.register_local_source(
                    parameters.source_path, owner, persistent=False
                )
                parameters = parameters.model_copy(
                    update={
                        "artifact_id": source_item.artifact_id,
                        "source_path": None,
                    }
                )
            if parameters.overlay_source_path:
                overlay_item = self.register_local_source(
                    parameters.overlay_source_path, owner, persistent=False
                )
                parameters = parameters.model_copy(
                    update={
                        "overlay_id": overlay_item.artifact_id,
                        "overlay_source_path": None,
                    }
                )
            if isinstance(parameters, VideoEdit):
                marks = []
                for mark in parameters.watermarks:
                    if mark.source_path:
                        mark_item = self.register_local_source(
                            mark.source_path, owner, persistent=False
                        )
                        mark = mark.model_copy(
                            update={
                                "artifact_id": mark_item.artifact_id,
                                "source_path": None,
                            }
                        )
                    marks.append(mark)
                parameters = parameters.model_copy(update={"watermarks": marks})
            parameters = parameters.model_copy(update={"user_authorization": None})
        if isinstance(parameters, (VideoConcat, SpeechTranscribe, SubtitleSpeech)):
            pass
        elif parameters.artifact_id is None:
            raise AppError(422, "SOURCE_REQUIRED", "必须指定一个媒体源")
        else:
            item, _ = self.artifact(parameters.artifact_id, owner)
            kind = {"image-editor": "image", "video-editor": "video", "audio-editor": "audio"}[
                tool_id
            ]
            if item.info.kind != kind:
                raise AppError(422, "MEDIA_KIND_MISMATCH", "请选择与当前工具相符的媒体文件")
            if parameters.overlay_id:
                extra, _ = self.artifact(parameters.overlay_id, owner)
                if extra.info.kind != ("audio" if kind == "audio" else "image"):
                    raise AppError(422, "MEDIA_KIND_MISMATCH", "叠加文件类型不符合要求")
            if isinstance(parameters, VideoEdit):
                for mark in parameters.watermarks:
                    extra, _ = self.artifact(str(mark.artifact_id), owner)
                    if extra.info.kind != "image":
                        raise AppError(422, "MEDIA_KIND_MISMATCH", "视频水印必须使用图片")
                for track in parameters.tracks:
                    extra, _ = self.artifact(str(track.artifact_id), owner)
                    if extra.info.kind != track.kind:
                        raise AppError(422, "MEDIA_KIND_MISMATCH", "时间轴轨道类型与素材不一致")
                if parameters.subtitle_id:
                    extra, _ = self.artifact(parameters.subtitle_id, owner)
                    if extra.info.kind != "subtitle":
                        raise AppError(
                            422,
                            "MEDIA_KIND_MISMATCH",
                            "字幕轨道须使用 SRT 或 WebVTT 文件",
                        )
        self.quota()
        job = Job(
            job_id=uuid4().hex,
            tool_id=tool_id,
            status="queued",
            stage="等待处理",
            created_at=timestamp(),
        )
        with self.transaction() as db:
            active = [
                Job.model_validate_json(row[0]) for row in db.execute("SELECT data FROM jobs")
            ]
            if sum(item.status not in TERMINAL for item in active) >= 8:
                raise AppError(429, "JOB_QUEUE_FULL", "已有 8 个任务等待或正在处理，请稍后重试")
            db.execute(
                "INSERT INTO jobs VALUES (?,?,?,?,?)",
                (
                    job.job_id,
                    actor.get(),
                    job.model_dump_json(),
                    parameters.model_dump_json(),
                    time.time(),
                ),
            )
        return job

    def prepare_task(
        self, parameters: VideoConcat | SpeechTranscribe | SubtitleSpeech, owner: str
    ) -> VideoConcat | SpeechTranscribe | SubtitleSpeech:
        """校验新增任务依赖，将明示授权的本机路径转为私有只读引用。"""
        if isinstance(parameters, SpeechTranscribe):
            self.speech.require_whisper(parameters)
        if isinstance(parameters, SubtitleSpeech):
            selected = self.speech.select(parameters)
            parameters = parameters.model_copy(update={"engine": selected})
            if parameters.subtitle_text is not None:
                from mtools.shared.subtitles import parse_subtitles

                parse_subtitles(parameters.subtitle_text, speech=True)
                return parameters
        sources = (
            parameters.sources
            if isinstance(parameters, VideoConcat)
            else [
                MediaSource.model_construct(
                    artifact_id=parameters.artifact_id, source_path=parameters.source_path
                )
            ]
        )
        resolved = []
        for source in sources:
            if source.source_path:
                if not owner.startswith("ai:"):
                    raise AppError(
                        403, "AI_PATH_ONLY", "本机路径参数仅用于取得对话授权后的 AI 调用"
                    )
                item = self.register_local_source(source.source_path, owner, persistent=False)
            else:
                item, _ = self.artifact(str(source.artifact_id), owner)
            if isinstance(parameters, VideoConcat) and item.info.kind != "video":
                raise AppError(422, "MEDIA_KIND_MISMATCH", "拼接输入必须全部为视频")
            if isinstance(parameters, SpeechTranscribe) and not item.info.has_audio:
                raise AppError(422, "AUDIO_STREAM_MISSING", "输入文件没有音频流")
            if isinstance(parameters, SubtitleSpeech) and item.info.kind != "subtitle":
                raise AppError(422, "MEDIA_KIND_MISMATCH", "请选择 SRT 或 WebVTT 字幕文件")
            resolved.append(MediaSource(artifact_id=item.artifact_id))
        if isinstance(parameters, VideoConcat):
            total = sum(
                self.artifact(str(item.artifact_id), owner)[0].info.duration for item in resolved
            )
            if total > 3600:
                raise AppError(422, "MEDIA_LIMIT", "拼接总时长不能超过 1 小时")
            return parameters.model_copy(update={"sources": resolved, "user_authorization": None})
        return parameters.model_copy(
            update={
                "artifact_id": resolved[0].artifact_id,
                "source_path": None,
                "user_authorization": None,
            }
        )

    def get_job(self, job_id: str, owner: str | None = None) -> Job:
        with self.connect() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row or row["owner"] not in self.visible_owners(owner or actor.get()):
            raise AppError(404, "JOB_NOT_FOUND", "找不到此任务或没有访问权限")
        return Job.model_validate_json(row["data"])

    def list_jobs(self, owner: str | None = None) -> JobList:
        owners = self.visible_owners(owner or actor.get())
        with self.connect() as db:
            rows = db.execute(
                f"SELECT data FROM jobs WHERE owner IN ({','.join('?' for _ in owners)}) "
                "ORDER BY created DESC LIMIT 50",
                owners,
            ).fetchall()
        return JobList(items=[Job.model_validate_json(row[0]) for row in rows])

    def cancel_job(self, job_id: str, owner: str | None = None) -> Job:
        owners = self.visible_owners(owner or actor.get())
        with self.transaction() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            if not row or row["owner"] not in owners:
                raise AppError(404, "JOB_NOT_FOUND", "找不到此任务")
            job = Job.model_validate_json(row["data"])
            if job.status == "queued":
                job.status, job.stage = "cancelled", "已取消"
            elif job.status == "running":
                job.status, job.stage = "cancel_requested", "正在取消"
            db.execute("UPDATE jobs SET data=? WHERE id=?", (job.model_dump_json(), job_id))
        return job

    def clear(self, owner: str | None = None) -> JobList:
        owner = owner or actor.get()
        with self.transaction() as db:
            protected: set[str] = set()
            for row in db.execute("SELECT * FROM jobs").fetchall():
                job = Job.model_validate_json(row["data"])
                if job.status not in TERMINAL:
                    parameters = json.loads(row["parameters"])
                    protected.update(source_ids(parameters))
                elif row["owner"] == owner:
                    db.execute("DELETE FROM jobs WHERE id=?", (job.job_id,))
            for row in db.execute("SELECT * FROM artifacts WHERE owner=?", (owner,)).fetchall():
                item = Artifact.model_validate_json(row["data"])
                if row["id"] not in protected and not item.persistent:
                    if not row["source_path"]:
                        self.file_path(row["id"], row["suffix"]).unlink(missing_ok=True)
                    db.execute("DELETE FROM artifacts WHERE id=?", (row["id"],))
        return self.list_jobs(owner)

    def worker_lock(self) -> bool:
        """串行获取进程锁与写入版本标记，避免启动和入队同时检查时误判。"""
        with self.worker_mutex:
            return self.acquire_worker_lock()

    def acquire_worker_lock(self) -> bool:
        if self.lock_file is not None:
            return True
        try:
            descriptor = os.open(self.root / "worker.lock", os.O_CREAT | os.O_RDWR, 0o600)
            lock = os.fdopen(descriptor, "r+b")
        except OSError:
            return False
        try:
            if sys.platform == "win32":
                import msvcrt

                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            lock.close()
            return False
        try:
            (self.root / "worker.owner").write_text(
                f"mtools-worker:{__version__}:{os.getpid()}\n", encoding="utf-8"
            )
        except (OSError, UnicodeError):
            lock.close()
            return False
        self.lock_file = lock
        return True

    def compatible_worker_running(self) -> bool:
        try:
            marker = (self.root / "worker.owner").read_text("utf-8").strip().split(":")
            version, process_id = marker[1], int(marker[2])
            if marker[0] != "mtools-worker" or version != __version__:
                return False
            return self.process_running(process_id)
        except (IndexError, OSError, ValueError):
            return False

    @staticmethod
    def process_running(process_id: int) -> bool:
        if process_id == os.getpid():
            return True
        if sys.platform == "win32":
            import ctypes
            from ctypes import wintypes

            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel32.OpenProcess.argtypes = (
                wintypes.DWORD,
                wintypes.BOOL,
                wintypes.DWORD,
            )
            kernel32.OpenProcess.restype = wintypes.HANDLE
            kernel32.WaitForSingleObject.argtypes = (wintypes.HANDLE, wintypes.DWORD)
            kernel32.WaitForSingleObject.restype = wintypes.DWORD
            kernel32.CloseHandle.argtypes = (wintypes.HANDLE,)
            kernel32.CloseHandle.restype = wintypes.BOOL
            handle = kernel32.OpenProcess(0x101000, False, process_id)
            if not handle:
                return False
            try:
                return bool(kernel32.WaitForSingleObject(handle, 0) == 0x102)
            finally:
                kernel32.CloseHandle(handle)
        try:
            os.kill(process_id, 0)
            return True
        except OSError:
            return False

    def schedule(self) -> None:
        while not self.stop.is_set() and not self.worker_lock():
            self.stop.wait(0.5)
        if self.lock_file is None:
            return
        try:
            if self.stop.is_set():
                return
            with self.transaction() as db:
                for row in db.execute(
                    "SELECT id,data FROM jobs WHERE created<?", (self.started_at,)
                ).fetchall():
                    job = Job.model_validate_json(row["data"])
                    if job.status not in TERMINAL:
                        job.status, job.stage = "interrupted", "上次处理已中断，请重新创建任务"
                        db.execute(
                            "UPDATE jobs SET data=? WHERE id=?", (job.model_dump_json(), job.job_id)
                        )
            while not self.stop.is_set():
                self.cleanup()
                row = None
                with self.transaction() as db:
                    for candidate in db.execute("SELECT * FROM jobs ORDER BY created").fetchall():
                        job = Job.model_validate_json(candidate["data"])
                        if job.status == "queued":
                            job.status, job.stage = "running", "正在处理媒体"
                            db.execute(
                                "UPDATE jobs SET data=? WHERE id=?",
                                (job.model_dump_json(), job.job_id),
                            )
                            row = candidate
                            break
                if row:
                    self.perform(row, job)
                else:
                    self.stop.wait(0.25)
        finally:
            if self.lock_file:
                try:
                    marker_path = self.root / "worker.owner"
                    marker = marker_path.read_text("utf-8").strip().split(":")
                    if marker == ["mtools-worker", __version__, str(os.getpid())]:
                        marker_path.unlink(missing_ok=True)
                except (IndexError, OSError, UnicodeError):
                    pass
                finally:
                    self.lock_file.close()
                    self.lock_file = None

    def environment(self) -> MediaEnvironment:
        """同步共享调度进程保存的显卡选择，不重复执行硬件编码探测。"""
        process = self.process
        if process.acceleration:
            process.acceleration.load()
            process.environment.video_acceleration = process.acceleration.status
        return process.environment

    def perform(self, row: sqlite3.Row, job: Job) -> None:
        output: Path | None = None
        scratch: str | None = None
        result: Artifact | None = None
        self.cancel.clear()
        finished = threading.Event()

        def monitor() -> None:
            while not finished.wait(0.1):
                if (
                    self.stop.is_set()
                    or self.get_job(job.job_id, row["owner"]).status == "cancel_requested"
                ):
                    self.cancel.set()
                    return

        watcher = threading.Thread(target=monitor, daemon=True)
        watcher.start()
        try:
            parameters = MEDIA_MODELS[job.tool_id].model_validate_json(row["parameters"])
            suffix = (
                parameters.output_format
                if isinstance(parameters, (ImageEdit, AudioEdit, SpeechTranscribe, SubtitleSpeech))
                else "mp4"
            )
            output = self.file_path(uuid4().hex, suffix)
            self.reserve(output.stem)
            if isinstance(parameters, (SpeechTranscribe, SubtitleSpeech)):
                scratch = uuid4().hex
                self.reserve(scratch)
            process = self.process
            if isinstance(parameters, VideoConcat):
                inputs = [
                    self.artifact(str(source.artifact_id), row["owner"])
                    for source in parameters.sources
                ]
                job.video_processing = concatenate(
                    process,
                    parameters,
                    [(path, item.info) for item, path in inputs],
                    output,
                    self.cancel,
                )
                name = "视频拼接"
            elif isinstance(parameters, SpeechTranscribe):
                item, source = self.artifact(str(parameters.artifact_id), row["owner"])
                job.speech_processing = self.speech.transcribe(
                    process, parameters, source, output, self.cancel
                )
                name = f"{Path(item.name).stem}-字幕"
            elif isinstance(parameters, SubtitleSpeech):
                text = parameters.subtitle_text
                if text is None:
                    _, source = self.artifact(str(parameters.artifact_id), row["owner"])
                    text = source.read_text("utf-8-sig")
                job.speech_processing = self.speech.synthesize(
                    process, parameters, text, output, self.cancel
                )
                name = f"字幕配音-{job.speech_processing.engine}"
            else:
                if parameters.artifact_id is None:
                    raise AppError(422, "SOURCE_REQUIRED", "必须指定一个媒体源")
                item, source = self.artifact(parameters.artifact_id, row["owner"])
                extra, overlay = (
                    self.artifact(parameters.overlay_id, row["owner"])
                    if parameters.overlay_id
                    else (None, None)
                )
                job.video_processing = process.execute(
                    parameters,
                    source,
                    item.info,
                    overlay,
                    extra.info if extra else None,
                    output,
                    self.cancel,
                    watermarks=[
                        (mark, mark_path, mark_item.info)
                        for mark in parameters.watermarks
                        for mark_item, mark_path in [
                            self.artifact(str(mark.artifact_id), row["owner"])
                        ]
                    ]
                    if isinstance(parameters, VideoEdit)
                    else None,
                    tracks=[
                        (track, track_path, track_item.info)
                        for track in parameters.tracks
                        for track_item, track_path in [
                            self.artifact(track.artifact_id, row["owner"])
                        ]
                    ]
                    if isinstance(parameters, VideoEdit)
                    else None,
                    subtitle_path=(
                        self.artifact(parameters.subtitle_id, row["owner"])[1]
                        if isinstance(parameters, VideoEdit) and parameters.subtitle_id
                        else None
                    ),
                )
                name = f"{Path(item.name).stem}-处理结果"
            for resource_id in source_ids(json.loads(row["parameters"])):
                self.artifact(resource_id, row["owner"])
            info = process.inspect(output, self.cancel)
            result = self.register_file(output, f"{name}.{suffix}", info, row["owner"])
            job.status, job.stage, job.result = "succeeded", "处理完成", result
        except AppError as exc:
            job.status, job.stage, job.error = "failed", "处理失败", exc.message
        except Exception as exc:
            if self.logger:
                self.logger.error(
                    "media_job_unexpected_failure",
                    extra={
                        "job_id": job.job_id,
                        "tool_id": job.tool_id,
                        "exception_type": type(exc).__name__,
                    },
                )
            job.status, job.stage, job.error = (
                "failed",
                "处理失败",
                "处理发生意外错误，原文件未修改。请重试；若仍失败，请提供任务编号。",
            )
        finally:
            finished.set()
            watcher.join(timeout=2)
            with self.transaction() as db:
                current = Job.model_validate_json(
                    db.execute("SELECT data FROM jobs WHERE id=?", (job.job_id,)).fetchone()[0]
                )
                if current.status == "cancel_requested" or self.stop.is_set():
                    job.status = "interrupted" if self.stop.is_set() else "cancelled"
                    job.stage, job.error, job.result = (
                        ("处理已中断" if self.stop.is_set() else "已取消"),
                        None,
                        None,
                    )
                db.execute("UPDATE jobs SET data=? WHERE id=?", (job.model_dump_json(), job.job_id))
                if job.status != "succeeded" and result:
                    db.execute("DELETE FROM artifacts WHERE id=?", (result.artifact_id,))
            if job.status != "succeeded" and output:
                output.unlink(missing_ok=True)
            if output:
                self.release(output.stem)
            if scratch:
                self.release(scratch)

    def cleanup(self) -> None:
        cutoff = time.time() - self.retention_hours * 3600
        with self.transaction() as db:
            db.execute("DELETE FROM reservations WHERE expires<?", (time.time(),))
            jobs = db.execute("SELECT * FROM jobs").fetchall()
            protected: set[str] = set()
            for row in jobs:
                job = Job.model_validate_json(row["data"])
                if job.status not in TERMINAL:
                    parameters = json.loads(row["parameters"])
                    protected.update(source_ids(parameters))
                elif row["created"] < cutoff:
                    db.execute("DELETE FROM jobs WHERE id=?", (row["id"],))
            for row in db.execute(
                "SELECT * FROM artifacts WHERE created<? AND persistent=0",
                (cutoff,),
            ).fetchall():
                if row["id"] not in protected:
                    if not row["source_path"]:
                        self.file_path(row["id"], row["suffix"]).unlink(missing_ok=True)
                    db.execute("DELETE FROM artifacts WHERE id=?", (row["id"],))
            db.execute("DELETE FROM approvals WHERE expires<?", (time.time() - 86400,))
            for path in self.files.iterdir():
                if path.is_file() and path.stat().st_mtime < cutoff and path.stem not in protected:
                    if not db.execute(
                        "SELECT 1 FROM artifacts WHERE id=?", (path.stem,)
                    ).fetchone():
                        path.unlink(missing_ok=True)

    def close(self) -> None:
        self.stop.set()
        self.cancel.set()
        if self.thread:
            self.thread.join(timeout=25)
