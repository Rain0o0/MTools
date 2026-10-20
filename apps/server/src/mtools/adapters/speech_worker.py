"""独立语音运行环境的固定入口；仅处理平台生成的本地任务文件。"""

import asyncio
import importlib
import json
import os
import sys
import wave
from pathlib import Path
from typing import Any


def stamp(seconds: float, vtt: bool) -> str:
    value = max(0, round(seconds * 1000))
    hours, value = divmod(value, 3600000)
    minutes, value = divmod(value, 60000)
    seconds_int, milliseconds = divmod(value, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds_int:02d}{'.' if vtt else ','}{milliseconds:03d}"


def transcribe(task: dict[str, Any]) -> str:
    torch = importlib.import_module("torch")
    whisper = importlib.import_module("whisper")

    torch.set_num_threads(2)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = whisper.load_model(task["checkpoint"], device=device)
    numpy = importlib.import_module("numpy")
    with wave.open(task["audio"], "rb") as stream:
        audio = numpy.frombuffer(stream.readframes(stream.getnframes()), dtype=numpy.int16)
        audio = audio.astype(numpy.float32) / 32768.0
    result = model.transcribe(
        audio,
        language=task["language"],
        task="transcribe",
        fp16=device == "cuda",
        verbose=None,
    )
    vtt = task["format"] == "vtt"
    blocks = ["WEBVTT\n"] if vtt else []
    for index, segment in enumerate(result["segments"]):
        text = segment["text"].strip().replace("-->", "→")
        if text and segment["end"] > segment["start"]:
            blocks.append(
                f"{index + 1}\n{stamp(segment['start'], vtt)} --> "
                f"{stamp(segment['end'], vtt)}\n{text}\n"
            )
    Path(task["output"]).write_text("\n".join(blocks), encoding="utf-8", newline="\n")
    return device


async def edge(task: dict[str, Any]) -> None:
    edge_tts = importlib.import_module("edge_tts")

    for index, text in enumerate(task["texts"]):
        speech = edge_tts.Communicate(
            text,
            voice=task["voice"],
            rate=f"{task['rate']:+d}%",
            connect_timeout=15,
            receive_timeout=60,
        )
        await asyncio.wait_for(speech.save(str(Path(task["folder"]) / f"{index}.mp3")), 120)


def qwen(task: dict[str, Any]) -> str:
    soundfile = importlib.import_module("soundfile")
    torch = importlib.import_module("torch")
    Qwen3TTSModel = importlib.import_module("qwen_tts").Qwen3TTSModel

    torch.set_num_threads(2)
    cuda = torch.cuda.is_available()
    model = Qwen3TTSModel.from_pretrained(
        task["model"],
        device_map="cuda:0" if cuda else "cpu",
        dtype=torch.bfloat16 if cuda else torch.float32,
        attn_implementation="sdpa",
        local_files_only=True,
    )
    for index, text in enumerate(task["texts"]):
        with torch.inference_mode():
            waves, rate = model.generate_custom_voice(
                text=text,
                speaker=task["speaker"],
                language=task["language"],
                instruct=task["instruct"],
                max_new_tokens=32768,
            )
        soundfile.write(
            str(Path(task["folder"]) / f"{index}.wav"), waves[0], rate, subtype="PCM_16"
        )
    return "cuda" if cuda else "cpu"


def main(request: Path | None = None) -> None:
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    request = request or Path(sys.argv[1])
    task: dict[str, Any] = {}
    try:
        task = json.loads(request.read_text("utf-8"))
        if task["task"] == "whisper":
            device = transcribe(task)
        elif task["task"] == "edge":
            asyncio.run(edge(task))
            device = "online"
        elif task["task"] == "qwen":
            device = qwen(task)
        else:
            raise ValueError("unknown task")
        (request.parent / "processing.json").write_text(
            json.dumps({"engine": task["task"], "device": device}), encoding="utf-8"
        )
    except Exception as exc:
        code = "SPEECH_DEPENDENCY" if isinstance(exc, ImportError) else "SPEECH_FAILED"
        if task.get("task") == "edge" and not isinstance(exc, ImportError):
            code = "EDGE_TTS_FAILED"
        if task.get("task") == "qwen" and isinstance(exc, (OSError, ValueError, KeyError)):
            code = "QWEN_LOAD_FAILED"
        if isinstance(exc, MemoryError) or "out of memory" in str(exc).lower():
            code = "SPEECH_MEMORY"
        (request.parent / "error.json").write_text(
            json.dumps({"code": code, "exception_type": type(exc).__name__}), encoding="utf-8"
        )
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
