import argparse
import io
import subprocess
import wave
from pathlib import Path

from mtools.adapters.media_process import MediaProcess, process_options


def main() -> None:
    """在指定测试目录生成无私人内容的短媒体，供界面和成品验收。"""
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    media = MediaProcess()
    if not media.available:
        raise RuntimeError(media.environment.message)
    for name, color, size, duration in (
        ("source.png", "blue", "320x240", None),
        ("overlay.png", "red", "48x32", None),
        ("source.mp4", "blue", "320x240", 2),
    ):
        source = f"color={color}:s={size}:r=10" + (f":d={duration}" if duration else "")
        extra = (
            ["-frames:v", "1"] if duration is None else ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
        )
        subprocess.run(
            [
                str(media.ffmpeg),
                "-nostdin",
                "-v",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                source,
                *extra,
                str(args.output / name),
            ],
            check=True,
            capture_output=True,
            **process_options(),
        )
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(44100)
        stream.writeframes(b"\x00\x04" * 88200)
    (args.output / "source.wav").write_bytes(buffer.getvalue())


if __name__ == "__main__":
    main()
