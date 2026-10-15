import json
from typing import NoReturn

from mtools.contracts.models import AppError


def reject_constant(value: str) -> NoReturn:
    raise ValueError("不支持非有限数值")


def unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("JSON 对象包含重复键")
        result[key] = value
    return result


def check_depth(text: str) -> None:
    """在解析前限制结构深度，忽略字符串内的括号和转义字符。"""
    depth, quoted, escaped = 0, False, False
    for char in text:
        if quoted:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
        elif char in "[{":
            depth += 1
            if depth > 64:
                raise AppError(422, "JSON_TOO_DEEP", "JSON 嵌套最多支持 64 层")
        elif char in "]}":
            depth -= 1


def parse_strict(text: str) -> object:
    """解析有界 JSON 文本，不向调用方回显输入。"""
    check_depth(text)
    try:
        return json.loads(text, parse_constant=reject_constant, object_pairs_hook=unique_object)
    except (ValueError, OverflowError, RecursionError) as exc:
        raise AppError(422, "INVALID_JSON", "JSON 无效，请检查格式、重复键与数值") from exc


def encode_bounded(value: object, *, compact: bool) -> str:
    """限制编码结果体积并拒绝非有限数值和无效 Unicode。"""
    encoder = json.JSONEncoder(
        ensure_ascii=False,
        allow_nan=False,
        indent=None if compact else 2,
        separators=(",", ":") if compact else None,
    )
    chunks: list[str] = []
    length = 0
    try:
        for chunk in encoder.iterencode(value):
            length += len(chunk.encode("utf-8"))
            if length > 1_000_000:
                raise AppError(422, "OUTPUT_TOO_LARGE", "结果超过 1000000 字节限制")
            chunks.append(chunk)
    except (ValueError, OverflowError, RecursionError, UnicodeError) as exc:
        raise AppError(422, "INVALID_JSON", "JSON 包含无法处理的数值、字符或结构") from exc
    return "".join(chunks)
