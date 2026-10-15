from typing import Literal

from pydantic import Field

from mtools.contracts.models import Contract


class DiffParameters(Contract):
    old_text: str = Field(max_length=50000, description="原始文本，最多 50000 字符、2000 行")
    new_text: str = Field(max_length=50000, description="修改后文本，最多 50000 字符、2000 行")
    context_lines: int = Field(default=3, ge=0, le=10, description="差异周围保留的上下文行数")


class DiffExecuteRequest(Contract):
    contract_version: Literal[1] = 1
    parameters: DiffParameters


class DiffResult(Contract):
    text: str
    identical: bool
    added_lines: int
    removed_lines: int
