from typing import Literal

from pydantic import Field

from mtools.contracts.models import Contract


class JsonLinesParameters(Contract):
    text: str = Field(max_length=100000, description="JSON 数组或每行一个 JSON 值的 JSONL 文本")
    direction: Literal["json-to-jsonl", "jsonl-to-json"] = "json-to-jsonl"


class JsonLinesExecuteRequest(Contract):
    contract_version: Literal[1] = 1
    parameters: JsonLinesParameters


class JsonLinesResult(Contract):
    text: str
    records: int
