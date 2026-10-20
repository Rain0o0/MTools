from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mtools.adapters.media_tasks import QWEN_URL, SpeechProcess
from mtools.contracts.media_tasks import MediaSource, SpeechTranscribe, SubtitleSpeech, VideoConcat
from mtools.contracts.models import AppError
from mtools.platform.media_workspace import source_ids
from mtools.shared.subtitles import parse_subtitles
from pydantic import ValidationError

SRT = "1\n00:00:01,000 --> 00:00:04,000\n你好，字幕。\n"


def test_subtitles_preserve_timing_and_unicode() -> None:
    for text in (SRT, "WEBVTT\n\n提示\n00:01.000 --> 00:04.000\n<b>你好，字幕。</b>\n"):
        cues = parse_subtitles(text, speech=True)
        assert (cues[0].start, cues[0].end, cues[0].text) == (1, 4, "你好，字幕。")


@pytest.mark.parametrize(
    "text",
    [
        "没有时间轴",
        "1\n00:00:04,000 --> 00:00:01,000\n倒序\n",
        "1\n00:61:00,000 --> 01:02:00,000\n时间无效\n",
        SRT + "\n2\n00:00:03,000 --> 00:00:05,000\n重叠\n",
    ],
)
def test_invalid_or_overlapping_speech_subtitles(text: str) -> None:
    with pytest.raises(AppError):
        parse_subtitles(text, speech=True)


def test_path_consent_and_multiple_sources() -> None:
    with pytest.raises(ValidationError):
        SpeechTranscribe(source_path="C:/sample.wav")
    with pytest.raises(ValidationError):
        SubtitleSpeech(subtitle_text=SRT, artifact_id="a" * 32)
    with pytest.raises(ValidationError):
        VideoConcat(
            sources=[MediaSource(source_path="C:/one.mp4"), MediaSource(artifact_id="b" * 32)]
        )
    parameters = VideoConcat(
        sources=[MediaSource(artifact_id="a" * 32), MediaSource(artifact_id="b" * 32)]
    )
    assert source_ids(parameters.model_dump()) == {"a" * 32, "b" * 32}


def test_missing_models_and_online_consent(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MTOOLS_QWEN_TTS_DIR", str(tmp_path / "missing-qwen"))
    monkeypatch.setenv("MTOOLS_WHISPER_MODEL_DIR", str(tmp_path / "missing-whisper"))
    speech = SpeechProcess(tmp_path)
    with pytest.raises(AppError) as qwen:
        speech.select(SubtitleSpeech(subtitle_text=SRT, engine="qwen"))
    assert qwen.value.code == "QWEN_MODEL_MISSING" and QWEN_URL in qwen.value.message
    with pytest.raises(AppError) as edge:
        speech.select(SubtitleSpeech(subtitle_text=SRT, engine="edge"))
    assert edge.value.code == "NETWORK_CONSENT_REQUIRED"
    with pytest.raises(AppError) as whisper:
        speech.require_whisper(SpeechTranscribe(artifact_id="a" * 32))
    assert whisper.value.code == "WHISPER_MODEL_MISSING"


def test_subtitle_upload_ownership_and_utf8(authenticated: TestClient) -> None:
    response = authenticated.post(
        "/api/v1/artifacts/upload", params={"name": "字幕.srt"}, content=SRT.encode("utf-8")
    )
    assert response.status_code == 201
    assert response.json()["info"]["kind"] == "subtitle"
    resource = response.json()["artifact_id"]
    assert authenticated.get(f"/api/v1/artifacts/{resource}/content").content.decode("utf-8") == SRT
    invalid = authenticated.post(
        "/api/v1/artifacts/upload", params={"name": "字幕.srt"}, content=SRT.encode("gbk")
    )
    assert invalid.status_code == 422 and invalid.json()["error"]["code"] == "INVALID_SUBTITLE"
