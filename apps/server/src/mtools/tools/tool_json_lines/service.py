from mtools.contracts.models import AppError
from mtools.shared.json_text import encode_bounded, parse_strict
from mtools.tools.tool_json_lines.schemas import JsonLinesParameters, JsonLinesResult


def convert_lines(parameters: JsonLinesParameters) -> JsonLinesResult:
    """互转 JSON 数组与 JSONL；空白行忽略，记录数和总输出均有界。"""
    if parameters.direction == "json-to-jsonl":
        value = parse_strict(parameters.text)
        if not isinstance(value, list):
            raise AppError(422, "ARRAY_REQUIRED", "转为 JSONL 时，请输入 JSON 数组")
        records = value
    else:
        lines = [
            (index, line)
            for index, line in enumerate(parameters.text.splitlines(), 1)
            if line.strip()
        ]
        if len(lines) > 2000:
            raise AppError(422, "TOO_MANY_RECORDS", "最多支持 2000 条记录")
        records = []
        for index, line in lines:
            try:
                record = parse_strict(line)
                encode_bounded(record, compact=True)
                records.append(record)
            except AppError as exc:
                raise AppError(
                    422, exc.code, f"第 {index} 行无效，请检查 JSON 格式、字符与数值"
                ) from exc
    if len(records) > 2000:
        raise AppError(422, "TOO_MANY_RECORDS", "最多支持 2000 条记录")
    if parameters.direction == "json-to-jsonl":
        text = "\n".join(encode_bounded(record, compact=True) for record in records)
        if text:
            text += "\n"
    else:
        text = encode_bounded(records, compact=False)
    if len(text.encode("utf-8")) > 1_000_000:
        raise AppError(422, "OUTPUT_TOO_LARGE", "结果超过 1000000 字节限制")
    return JsonLinesResult(text=text, records=len(records))
