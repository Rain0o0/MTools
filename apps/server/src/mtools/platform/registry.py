from collections.abc import Callable
from dataclasses import dataclass

from pydantic import BaseModel

from mtools.contracts.models import AppError, CatalogEntry, Manifest, RunMode


def operation_name(tool_id: str, operation_id: str, version: int) -> str:
    return f"mtools_{tool_id.replace('-', '_')}__{operation_id.replace('-', '_')}_v{version}"


@dataclass(frozen=True)
class OperationHandler:
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    handler: Callable[[BaseModel], BaseModel]

    def __call__(self, parameters: BaseModel) -> BaseModel:
        return self.handler(parameters)


@dataclass(frozen=True)
class ToolRegistration:
    manifest: Manifest
    operations: dict[str, OperationHandler]


class ToolRegistry:
    """校验受信任工具和依赖，并提供实际可用目录。"""

    def __init__(
        self,
        tools: list[ToolRegistration],
        mode: RunMode,
        disabled: list[str],
        capabilities: dict[str, bool],
    ) -> None:
        self.tools: dict[str, ToolRegistration] = {}
        self.entries: dict[str, CatalogEntry] = {}
        for tool in tools:
            manifest = tool.manifest
            if manifest.tool_id in self.tools:
                raise ValueError(f"重复工具 ID：{manifest.tool_id}")
            if manifest.ui.route != f"/tools/{manifest.tool_id}":
                raise ValueError("工具路由与 ID 不一致")
            operation_ids = [operation.operation_id for operation in manifest.operations]
            if len(operation_ids) != len(set(operation_ids)):
                raise ValueError("操作 ID 重复")
            if set(operation_ids) != tool.operations.keys():
                raise ValueError("工具清单与受信任操作入口不一致")
            for operation in manifest.operations:
                name = operation_name(
                    manifest.tool_id, operation.operation_id, operation.contract_version
                )
                if len(name) > 64:
                    raise ValueError("MCP 操作名超过 64 字符")
                handler = tool.operations[operation.operation_id]
                if operation.input_schema != f"#/components/schemas/{handler.input_model.__name__}":
                    raise ValueError("操作输入模型与清单不一致")
                if (
                    operation.output_schema
                    != f"#/components/schemas/{handler.output_model.__name__}"
                ):
                    raise ValueError("操作输出模型与清单不一致")
            self.tools[manifest.tool_id] = tool
        unknown = set(disabled) - self.tools.keys()
        if unknown:
            raise ValueError(f"禁用配置包含未知工具：{sorted(unknown)}")
        visiting: set[str] = set()

        def resolve(tool_id: str) -> CatalogEntry:
            if tool_id in self.entries:
                return self.entries[tool_id]
            if tool_id in visiting:
                raise ValueError("工具依赖存在循环")
            visiting.add(tool_id)
            manifest = self.tools[tool_id].manifest
            entry = CatalogEntry(manifest=manifest, status="available", available_operations=[])
            for dependency in manifest.dependencies:
                target = self.tools.get(dependency.tool_id)
                if target is not None:
                    dependency_entry = resolve(dependency.tool_id)
                if not dependency.optional:
                    if target is None:
                        entry.status, entry.reason = "unavailable", "必需工具未安装"
                    elif dependency.version != target.manifest.version:
                        entry.status, entry.reason = "incompatible", "依赖工具版本不兼容"
                    elif dependency_entry.status != "available":
                        entry.status, entry.reason = "unavailable", "依赖工具当前不可用"
            if mode not in manifest.supported_modes:
                entry.status, entry.reason = "incompatible", "当前运行环境不受支持"
            if any(not capabilities.get(cap, False) for cap in manifest.required_capabilities):
                entry.status, entry.reason = "unavailable", "当前环境缺少所需能力"
            if tool_id in disabled:
                entry.status, entry.reason = "disabled", "此工具已由配置停用"
            if entry.status == "available":
                entry.available_operations = [op.operation_id for op in manifest.operations]
            visiting.remove(tool_id)
            self.entries[tool_id] = entry
            return entry

        for tool_id in self.tools:
            resolve(tool_id)

    def require(self, tool_id: str, operation_id: str) -> OperationHandler:
        if tool_id not in self.tools:
            raise AppError(404, "TOOL_NOT_FOUND", "找不到此工具")
        entry = self.entries[tool_id]
        if entry.status != "available":
            raise AppError(503, "TOOL_UNAVAILABLE", entry.reason or "工具暂不可用")
        if operation_id not in entry.available_operations:
            if operation_id in self.tools[tool_id].operations:
                raise AppError(
                    503, "OPERATION_UNAVAILABLE", "此操作的媒体组件不可用，请重新检测环境"
                )
            raise AppError(404, "OPERATION_NOT_FOUND", "找不到此操作")
        return self.tools[tool_id].operations[operation_id]
