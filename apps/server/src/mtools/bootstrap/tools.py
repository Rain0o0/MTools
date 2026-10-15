from importlib.resources import files
from typing import cast

from pydantic import BaseModel

from mtools.bootstrap.config import Settings
from mtools.contracts.models import Manifest
from mtools.platform.registry import OperationHandler, ToolRegistration, ToolRegistry
from mtools.tools.tool_json_formatter.schemas import JsonParameters, JsonResult
from mtools.tools.tool_json_formatter.service import format_json
from mtools.tools.tool_json_lines.schemas import JsonLinesParameters, JsonLinesResult
from mtools.tools.tool_json_lines.service import convert_lines
from mtools.tools.tool_text_codec.schemas import CodecParameters, CodecResult
from mtools.tools.tool_text_codec.service import transform_text
from mtools.tools.tool_text_diff.schemas import DiffParameters, DiffResult
from mtools.tools.tool_text_diff.service import compare_text


def json_operation(parameters: BaseModel) -> JsonResult:
    return format_json(cast(JsonParameters, parameters))


def diff_operation(parameters: BaseModel) -> DiffResult:
    return compare_text(cast(DiffParameters, parameters))


def lines_operation(parameters: BaseModel) -> JsonLinesResult:
    return convert_lines(cast(JsonLinesParameters, parameters))


def codec_operation(parameters: BaseModel) -> CodecResult:
    return transform_text(cast(CodecParameters, parameters))


def assemble_tools(settings: Settings) -> ToolRegistry:
    bindings = [
        ("json_formatter", "format", OperationHandler(JsonParameters, JsonResult, json_operation)),
        ("text_diff", "compare", OperationHandler(DiffParameters, DiffResult, diff_operation)),
        (
            "json_lines",
            "convert",
            OperationHandler(JsonLinesParameters, JsonLinesResult, lines_operation),
        ),
        (
            "text_codec",
            "transform",
            OperationHandler(CodecParameters, CodecResult, codec_operation),
        ),
    ]
    return ToolRegistry(
        [
            ToolRegistration(
                Manifest.model_validate_json(
                    files(f"mtools.tools.tool_{package}")
                    .joinpath("manifest.json")
                    .read_text("utf-8")
                ),
                {operation: handler},
            )
            for package, operation, handler in bindings
        ],
        settings.mode,
        settings.disabled_tools,
        {"filesystem": False, "network": False, "clipboard": False},
    )
