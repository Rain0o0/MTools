import html
import re
from dataclasses import dataclass

from mtools.contracts.models import AppError

TIMING = re.compile(
    r"^(\d{1,2}:)?(\d{2}):(\d{2})[,.](\d{3})\s+-->\s+"
    r"(\d{1,2}:)?(\d{2}):(\d{2})[,.](\d{3})(?:\s+.*)?$"
)


@dataclass(frozen=True)
class Cue:
    start: float
    end: float
    text: str


def parse_subtitles(text: str, *, speech: bool = False) -> list[Cue]:
    """解析有限长度的 UTF-8 SRT/WebVTT，配音时拒绝重叠时间轴。"""
    if len(text.encode("utf-8")) > 300000 or "\x00" in text:
        raise AppError(422, "SUBTITLE_LIMIT", "字幕须为 UTF-8，大小不超过 300 KB")
    blocks = re.split(r"\n\s*\n", text.lstrip("\ufeff").replace("\r\n", "\n").strip())
    cues: list[Cue] = []
    for block in blocks:
        lines = block.splitlines()
        if not lines or lines[0].startswith(("WEBVTT", "NOTE", "STYLE", "REGION")):
            continue
        index = 0 if "-->" in lines[0] else 1
        match = TIMING.fullmatch(lines[index]) if len(lines) > index else None
        if not match:
            raise AppError(422, "INVALID_SUBTITLE", "字幕格式无效，请提供带时间轴的 SRT 或 WebVTT")
        values = match.groups()
        times = []
        for offset in (0, 4):
            hours = int((values[offset] or "0:")[:-1])
            minutes, seconds, milliseconds = map(int, values[offset + 1 : offset + 4])
            if minutes >= 60 or seconds >= 60:
                raise AppError(422, "INVALID_SUBTITLE", "字幕时间格式无效")
            times.append(hours * 3600 + minutes * 60 + seconds + milliseconds / 1000)
        body = html.unescape(re.sub(r"<[^>]*>", "", " ".join(lines[index + 1 :]))).strip()
        start, end = times
        if not body or not 0 <= start < end <= 3600 or len(body) > 2000:
            raise AppError(
                422, "INVALID_SUBTITLE", "字幕正文不能为空，单条最多 2000 字，时间范围不超过 1 小时"
            )
        if cues and (start < cues[-1].start or (speech and start < cues[-1].end)):
            raise AppError(422, "SUBTITLE_OVERLAP", "字幕须按时间排序；配音字幕的时间段不能重叠")
        cues.append(Cue(start, end, body))
    if not cues or len(cues) > (200 if speech else 5000):
        raise AppError(
            422, "SUBTITLE_LIMIT", "字幕须包含有效条目；配音最多 200 条，转写最多 5000 条"
        )
    if speech and sum(len(cue.text) for cue in cues) > 20000:
        raise AppError(422, "SUBTITLE_LIMIT", "单次配音正文最多 20000 字")
    return cues
