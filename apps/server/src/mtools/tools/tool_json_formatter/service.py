import json
from typing import NoReturn

from mtools.contracts.models import AppError
from mtools.tools.tool_json_formatter.schemas import JsonParameters, JsonResult


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


def format_json(parameters: JsonParameters) -> JsonResult:
    """严格解析 JSON，保留中文并拒绝重复键与非标准数值。"""
    try:
        input_bytes = len(parameters.text.encode("utf-8"))
        if input_bytes > 400_000:
            raise AppError(422, "INPUT_TOO_LARGE", "输入超过 400000 字节限制")
        check_depth(parameters.text)
        value = json.loads(
            parameters.text, parse_constant=reject_constant, object_pairs_hook=unique_object
        )
        encoder = json.JSONEncoder(
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=parameters.sort_keys,
            indent=None if parameters.compact else parameters.indent,
            separators=(",", ":") if parameters.compact else None,
        )
        chunks: list[str] = []
        length = 0
        for chunk in encoder.iterencode(value):
            length += len(chunk)
            if length > 1_000_000:
                raise AppError(422, "OUTPUT_TOO_LARGE", "结果过大，请使用压缩模式")
            chunks.append(chunk)
        text = "".join(chunks)
        return JsonResult(
            text=text, input_bytes=input_bytes, output_bytes=len(text.encode("utf-8"))
        )
    except json.JSONDecodeError as exc:
        raise AppError(
            422, "INVALID_JSON", f"JSON 格式错误：第 {exc.lineno} 行，第 {exc.colno} 列"
        ) from exc
    except (ValueError, OverflowError, RecursionError, UnicodeError) as exc:
        raise AppError(
            422, "INVALID_JSON", "无法处理此 JSON：请检查重复键、数值、字符或嵌套深度"
        ) from exc
