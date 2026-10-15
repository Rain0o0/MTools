from typing import Literal

from pydantic import Field

from mtools.contracts.models import Contract


class CodecParameters(Contract):
    text: str = Field(
        max_length=100000, description="UTF-8 文本，最多 100000 字符；解码结果也须为 UTF-8"
    )
    action: Literal["base64-encode", "base64-decode", "url-encode", "url-decode", "sha256"] = (
        "base64-encode"
    )


class CodecExecuteRequest(Contract):
    contract_version: Literal[1] = 1
    parameters: CodecParameters


class CodecResult(Contract):
    text: str
    input_bytes: int
    output_bytes: int
