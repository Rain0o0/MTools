from importlib.resources import files

import pytest
from mtools.contracts.models import AppError, Dependency, Manifest, ToolUI
from mtools.platform.registry import OperationHandler, ToolRegistration, ToolRegistry
from mtools.tools.tool_json_formatter.schemas import JsonParameters, JsonResult
from pydantic import BaseModel, ValidationError


def manifest(tool_id: str = "json-formatter") -> Manifest:
    result = Manifest.model_validate_json(
        files("mtools.tools.tool_json_formatter").joinpath("manifest.json").read_text("utf-8")
    )
    result.tool_id = tool_id
    result.ui = ToolUI(route=f"/tools/{tool_id}")
    return result


def identity(value: BaseModel) -> BaseModel:
    return value


def binding() -> OperationHandler:
    return OperationHandler(JsonParameters, JsonResult, identity)


def test_duplicate_ids_and_cycle_rejected() -> None:
    item = ToolRegistration(manifest(), {"format": binding()})
    with pytest.raises(ValueError, match="重复工具"):
        ToolRegistry([item, item], "source-web", [], {})
    a, b = manifest("first"), manifest("second")
    a.dependencies = [Dependency(tool_id="second", version="1.0.0")]
    b.dependencies = [Dependency(tool_id="first", version="1.0.0")]
    with pytest.raises(ValueError, match="循环"):
        ToolRegistry(
            [
                ToolRegistration(a, {"format": binding()}),
                ToolRegistration(b, {"format": binding()}),
            ],
            "source-web",
            [],
            {},
        )


def test_missing_version_and_capability_are_isolated() -> None:
    a, b, c = manifest("first"), manifest("second"), manifest("third")
    a.dependencies = [Dependency(tool_id="missing", version="1.0.0")]
    b.dependencies = [Dependency(tool_id="third", version="2.0.0")]
    registry = ToolRegistry(
        [ToolRegistration(item, {"format": binding()}) for item in [a, b, c]], "source-web", [], {}
    )
    assert registry.entries["first"].status == "unavailable"
    assert registry.entries["second"].status == "incompatible"
    assert registry.entries["third"].status == "available"
    with pytest.raises(AppError):
        registry.require("first", "format")
    c.required_capabilities = ["filesystem"]
    registry = ToolRegistry([ToolRegistration(c, {"format": binding()})], "source-web", [], {})
    assert registry.entries["third"].status == "unavailable"


def test_manifest_unknown_version_and_id_rejected() -> None:
    value = manifest().model_dump()
    value["manifest_version"] = 2
    with pytest.raises(ValidationError):
        Manifest.model_validate(value)
    value["manifest_version"] = 1
    value["tool_id"] = "invalid_id"
    with pytest.raises(ValidationError):
        Manifest.model_validate(value)


def test_operation_registration_must_match_manifest() -> None:
    with pytest.raises(ValueError, match="操作入口不一致"):
        ToolRegistry([ToolRegistration(manifest(), {})], "source-web", [], {})
    registry = ToolRegistry(
        [ToolRegistration(manifest(), {"format": binding()})], "source-web", [], {}
    )
    assert registry.require("json-formatter", "format").handler is identity


def test_ai_contracts_checked_during_registration() -> None:
    item = manifest()
    item.operations[0].input_schema = "#/components/schemas/Unknown"
    with pytest.raises(ValueError, match="输入模型"):
        ToolRegistry([ToolRegistration(item, {"format": binding()})], "desktop", [], {})
    item = manifest("a" * 60)
    with pytest.raises(ValueError, match="MCP 操作名"):
        ToolRegistry([ToolRegistration(item, {"format": binding()})], "desktop", [], {})
