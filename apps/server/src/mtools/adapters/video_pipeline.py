from pathlib import Path

from mtools.contracts.media import MediaInfo, VideoEdit, VideoTrack, VideoWatermark
from mtools.contracts.models import AppError

WatermarkInput = tuple[VideoWatermark, Path, MediaInfo]
TrackInput = tuple[VideoTrack, Path, MediaInfo]


def video_arguments(
    parameters: VideoEdit,
    source: Path,
    info: MediaInfo,
    watermarks: list[WatermarkInput],
    *,
    formats: str,
    input_options: list[str],
    upload_filter: str,
    output_options: list[str],
    tracks: list[TrackInput] | None = None,
    subtitle_path: Path | None = None,
) -> list[str]:
    """把有界剪辑、画面、水印和音频组合为一次编码，按片段定位避免解码无用区间。"""
    p = parameters
    intervals = [(s.start_seconds, s.end_seconds) for s in p.segments] or [
        (p.start_seconds, p.end_seconds if p.end_seconds is not None else info.duration)
    ]
    if any(start >= info.duration or end > info.duration + 0.05 for start, end in intervals):
        raise AppError(422, "INVALID_INTERVAL", "截取时间超出文件时长")
    duration = sum(end - start for start, end in intervals) / p.speed
    if not 0 < duration <= 3600:
        raise AppError(422, "MEDIA_LIMIT", "变速后的视频总时长必须在 0–3600 秒以内")
    audio = info.has_audio and not p.muted
    if audio and max(p.fade_in_seconds, p.fade_out_seconds) > duration:
        raise AppError(422, "INVALID_FADE", "音频淡入淡出不能超过输出时长")
    args: list[str] = list(input_options)
    filters: list[str] = []
    for index, (start, end) in enumerate(intervals):
        length = end - start
        args.extend(
            [
                "-threads",
                "2",
                "-ss",
                str(start),
                "-t",
                str(length),
                "-protocol_whitelist",
                "file,pipe",
                "-format_whitelist",
                formats,
                "-i",
                str(source),
            ]
        )
        filters.append(f"[{index}:v]trim=duration={length},setpts=PTS-STARTPTS[v{index}]")
        if audio:
            filters.append(
                f"[{index}:a:0]asetpts=PTS-STARTPTS,apad,atrim=duration={length}[a{index}]"
            )
    if len(intervals) > 1:
        streams = "".join(f"[v{i}]" + (f"[a{i}]" if audio else "") for i in range(len(intervals)))
        filters.append(
            f"{streams}concat=n={len(intervals)}:v=1:a={int(audio)}[joined]"
            + ("[sound]" if audio else "")
        )
        visual = "joined"
    else:
        visual = "v0"
    width, height = info.width, info.height
    transforms = [f"setpts=(PTS-STARTPTS)/{p.speed}"]
    if p.crop:
        c = p.crop
        if c.x + c.width > width or c.y + c.height > height:
            raise AppError(422, "INVALID_CROP", "裁剪区域超出画面，请调整位置和大小")
        width, height = c.width, c.height
        transforms.append(f"crop={width}:{height}:{c.x}:{c.y}:exact=1")
    if p.rotate:
        transforms.append({90: "transpose=1", 180: "hflip,vflip", 270: "transpose=2"}[p.rotate])
        if p.rotate != 180:
            width, height = height, width
    if p.flip_horizontal:
        transforms.append("hflip")
    if p.flip_vertical:
        transforms.append("vflip")
    if p.resize_width:
        height = max(1, round(height * p.resize_width / width))
        width = p.resize_width
        if height > 4096:
            raise AppError(422, "MEDIA_LIMIT", "缩放后最长边不能超过 4096 像素")
        transforms.append(f"scale={width}:{height}")
    if p.brightness != 0 or p.contrast != 1 or p.saturation != 1 or p.grayscale:
        saturation = 0 if p.grayscale else p.saturation
        transforms.append(
            f"eq=brightness={p.brightness}:contrast={p.contrast}:saturation={saturation}"
        )
    transforms.extend(
        [
            f"tpad=stop_mode=clone:stop_duration={duration}",
            f"fps=fps={info.frame_rate or 30}:start_time=0",
            f"trim=duration={duration}",
        ]
    )
    filters.append(f"[{visual}]" + ",".join(transforms) + "[picture]")
    visual = "picture"
    for index, (mark, path, mark_info) in enumerate(watermarks):
        mark_width = mark.width or mark_info.width
        mark_height = max(1, round(mark_info.height * mark_width / mark_info.width))
        if mark.x + mark_width > width or mark.y + mark_height > height:
            raise AppError(422, "INVALID_OVERLAY", f"第 {index + 1} 个水印超出处理后画面")
        if mark.start_seconds >= duration or (
            mark.end_seconds is not None and mark.end_seconds > duration + 0.05
        ):
            raise AppError(422, "INVALID_OVERLAY_INTERVAL", "水印显示时间超出输出视频时长")
        args.extend(
            [
                "-threads",
                "1",
                "-protocol_whitelist",
                "file,pipe",
                "-format_whitelist",
                formats,
                "-i",
                str(path),
            ]
        )
        filters.append(
            f"[{len(intervals) + index}:v]setpts=PTS-STARTPTS,scale={mark_width}:{mark_height},"
            f"format=rgba,colorchannelmixer=aa={mark.opacity}[mark{index}]"
        )
        window = f"gte(t,{mark.start_seconds})"
        if mark.end_seconds is not None:
            window += f"*lt(t,{mark.end_seconds})"
        filters.append(
            f"[{visual}][mark{index}]overlay={mark.x}:{mark.y}:eof_action=repeat:"
            f"format=auto:enable='{window}'[layer{index}]"
        )
        visual = f"layer{index}"
    track_inputs = tracks or []
    audio_labels = ["sound"] if audio else []
    track_base = len(intervals) + len(watermarks)
    for index, (track, path, track_info) in enumerate(track_inputs):
        length = track.source_end_seconds - track.source_start_seconds
        if track.timeline_start_seconds + length > duration + 0.001:
            raise AppError(422, "INVALID_TRACK_INTERVAL", "轨道片段超出成片时长")
        input_index = track_base + sum(
            not (p.muted and previous[0].kind == "audio") for previous in track_inputs[:index]
        )
        if track.kind != "image" and track.source_end_seconds > track_info.duration + 0.05:
            raise AppError(422, "INVALID_TRACK_INTERVAL", "轨道素材起止时间超出素材时长")
        if track.kind == "audio" and p.muted:
            continue
        if track.kind == "image":
            args.extend(
                [
                    "-threads",
                    "1",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    formats,
                    "-loop",
                    "1",
                    "-t",
                    str(length),
                    "-i",
                    str(path),
                ]
            )
            track_width = track.width or track_info.width
            if track_width > width or track.x + track_width > width or track.y >= height:
                raise AppError(422, "INVALID_TRACK_POSITION", "图片轨道超出处理后画面")
            filters.append(
                f"[{input_index}:v]scale={track_width}:-2,format=rgba,"
                f"colorchannelmixer=aa={track.opacity},setpts=PTS-STARTPTS+"
                f"{track.timeline_start_seconds}/TB[track{index}]"
            )
            filters.append(
                f"[{visual}][track{index}]overlay={track.x}:{track.y}:eof_action=pass:"
                f"format=auto:enable='between(t,{track.timeline_start_seconds},"
                f"{track.timeline_start_seconds + length})'[tracklayer{index}]"
            )
            visual = f"tracklayer{index}"
        elif track.kind == "video":
            args.extend(
                [
                    "-threads",
                    "1",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    formats,
                    "-ss",
                    str(track.source_start_seconds),
                    "-t",
                    str(length),
                    "-i",
                    str(path),
                ]
            )
            track_width = track.width or width
            if track_width > width or track.x + track_width > width or track.y >= height:
                raise AppError(422, "INVALID_TRACK_POSITION", "视频轨道超出处理后画面")
            filters.append(
                f"[{input_index}:v]setpts=PTS-STARTPTS,scale={track_width}:-2,format=rgba,"
                f"colorchannelmixer=aa={track.opacity},setpts=PTS-STARTPTS+"
                f"{track.timeline_start_seconds}/TB[track{index}]"
            )
            filters.append(
                f"[{visual}][track{index}]overlay={track.x}:{track.y}:eof_action=pass:"
                f"format=auto:enable='between(t,{track.timeline_start_seconds},"
                f"{track.timeline_start_seconds + length})'[tracklayer{index}]"
            )
            visual = f"tracklayer{index}"
        else:
            args.extend(
                [
                    "-threads",
                    "1",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    formats,
                    "-ss",
                    str(track.source_start_seconds),
                    "-t",
                    str(length),
                    "-i",
                    str(path),
                ]
            )
            delay = round(track.timeline_start_seconds * 1000)
            filters.append(
                f"[{input_index}:a:0]atrim=duration={length},asetpts=PTS-STARTPTS,"
                f"volume={track.volume},adelay={delay}|{delay},apad,atrim=duration={duration}"
                f"[trackaudio{index}]"
            )
            audio_labels.append(f"trackaudio{index}")
    if subtitle_path:
        escaped = (
            subtitle_path.resolve()
            .as_posix()
            .replace("\\", "\\\\")
            .replace(":", "\\:")
            .replace("'", "\\'")
            .replace(",", "\\,")
        )
        filters.append(f"[{visual}]subtitles=filename='{escaped}'[captioned]")
        visual = "captioned"
    filters.append(f"[{visual}]pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1{upload_filter}[out]")
    if audio:
        tempo: list[str] = []
        remaining = p.speed
        while remaining > 2:
            tempo.append("atempo=2")
            remaining /= 2
        while remaining < 0.5:
            tempo.append("atempo=0.5")
            remaining /= 0.5
        tempo.extend([f"atempo={remaining}", f"volume={p.volume}"])
        if p.fade_in_seconds:
            tempo.append(f"afade=t=in:st=0:d={p.fade_in_seconds}")
        if p.fade_out_seconds:
            tempo.append(f"afade=t=out:st={duration - p.fade_out_seconds}:d={p.fade_out_seconds}")
        tempo.extend(["apad", f"atrim=duration={duration}"])
        filters.append("[sound]" + ",".join(tempo) + "[mainaudio]")
        audio_labels[0] = "mainaudio"
    if len(audio_labels) > 1:
        filters.append(
            "".join(f"[{label}]" for label in audio_labels)
            + f"amix=inputs={len(audio_labels)}:duration=first:normalize=0[audio]"
        )
    elif audio_labels:
        filters.append(f"[{audio_labels[0]}]anull[audio]")
    has_output_audio = bool(audio_labels)
    args.extend(["-filter_complex", ";".join(filters), "-map", "[out]"])
    args.extend(["-map", "[audio]", "-c:a", "aac", "-b:a", "192k"] if has_output_audio else ["-an"])
    args.extend([*output_options, "-movflags", "+faststart", "-t", str(duration)])
    return args
