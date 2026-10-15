from importlib.resources import files
from typing import cast

from pydantic import BaseModel

from mtools.bootstrap.config import Settings
from mtools.contracts.models import Manifest
from mtools.platform.registry import OperationHandler, ToolRegistration, ToolRegistry
from mtools.tools.tool_json_formatter.schemas import JsonParameters, JsonResult
from mtools.tools.tool_json_formatter.service import format_json


def json_operation(parameters: BaseModel) -> JsonResult:
    return format_json(cast(JsonParameters, parameters))


def assemble_tools(settings: Settings) -> ToolRegistry:
    manifest = Manifest.model_validate_json(
        files("mtools.tools.tool_json_formatter").joinpath("manifest.json").read_text("utf-8")
    )
    return ToolRegistry(
        [
            ToolRegistration(
                manifest,
                {
                    "format": OperationHandler(JsonParameters, JsonResult, json_operation),
                },
            )
        ],
        settings.mode,
        settings.disabled_tools,
        {"filesystem": False, "network": False, "clipboard": False},
    )
