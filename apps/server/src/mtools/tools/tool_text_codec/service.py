import base64
import binascii
import hashlib
import re
from urllib.parse import quote, unquote

from mtools.contracts.models import AppError
from mtools.tools.tool_text_codec.schemas import CodecParameters, CodecResult


def transform_text(parameters: CodecParameters) -> CodecResult:
    """执行明确选择的 UTF-8 编解码或 SHA-256 摘要，不访问文件或网络。"""
    try:
        data = parameters.text.encode("utf-8")
        match parameters.action:
            case "base64-encode":
                text = base64.b64encode(data).decode("ascii")
            case "base64-decode":
                text = base64.b64decode(data, validate=True).decode("utf-8")
            case "url-encode":
                text = quote(parameters.text, safe="", encoding="utf-8", errors="strict")
            case "url-decode":
                if re.search(r"%(?![0-9a-fA-F]{2})", parameters.text):
                    raise ValueError("无效转义")
                text = unquote(parameters.text, encoding="utf-8", errors="strict")
            case "sha256":
                text = hashlib.sha256(data).hexdigest()
        return CodecResult(text=text, input_bytes=len(data), output_bytes=len(text.encode("utf-8")))
    except (ValueError, UnicodeError, binascii.Error) as exc:
        raise AppError(
            422, "INVALID_ENCODING", "无法转换：请检查编码格式，解码结果必须是 UTF-8 文本"
        ) from exc
