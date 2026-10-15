from typing import Literal

from pydantic import Field

from mtools.contracts.models import Contract


class JsonParameters(Contract):
    text: str = Field(max_length=100_000, description="JSON 文本，最多 100000 字符")
    indent: Literal[2, 4] = 2
    sort_keys: bool = False
    compact: bool = False


class JsonExecuteRequest(Contract):
    contract_version: Literal[1] = 1
    parameters: JsonParameters


class JsonResult(Contract):
    text: str
    input_bytes: int
    output_bytes: int
