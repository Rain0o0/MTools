import json
import logging
from collections.abc import Callable
from typing import Literal
from uuid import uuid4

from anyio import CapacityLimiter, fail_after, to_thread
from pydantic import BaseModel, ValidationError

from mtools.contracts.models import AppError
from mtools.platform.invocation import actor
from mtools.platform.registry import ToolRegistry


class ToolRuntime:
    """让界面和 AI 共用入参、权限、资源上限、结果契约与审计边界。"""

    def __init__(
        self,
        registry: ToolRegistry,
        logger: logging.Logger,
        authorize: Callable[[str, str, dict[str, object]], None] | None = None,
    ) -> None:
        self.registry, self.logger = registry, logger
        self.limiter = CapacityLimiter(4)
        self.authorize = authorize
        self.ai_actor = f"ai:{uuid4().hex}"

    async def execute(
        self,
        tool_id: str,
        operation_id: str,
        arguments: object,
        source: Literal["ui", "ai"],
        request_id: str,
        owner: str | None = None,
    ) -> BaseModel:
        handler = self.registry.require(tool_id, operation_id)
        metadata = next(
            item
            for item in self.registry.tools[tool_id].manifest.operations
            if item.operation_id == operation_id
        )
        if source == "ai" and metadata.effects != "read-only" and self.authorize is None:
            raise AppError(
                403, "AI_APPROVAL_REQUIRED", "此操作需要在软件中完成授权后才能由 AI 执行"
            )
        try:
            budget = min(1_048_576, metadata.max_input_bytes)
            if len(json.dumps(arguments, ensure_ascii=False).encode("utf-8")) > budget:
                raise AppError(413, "REQUEST_TOO_LARGE", "输入内容过大，请减少后重试")
            parameters = handler.input_model.model_validate(arguments)
        except (ValidationError, ValueError, TypeError, UnicodeError) as exc:
            raise AppError(
                422, "VALIDATION_ERROR", "输入参数不符合要求，请检查字段及大小限制"
            ) from exc
        self.logger.info(
            "tool_execute",
            extra={
                "tool_id": tool_id,
                "operation_id": operation_id,
                "request_id": request_id,
                "invocation_source": source,
            },
        )
        identity = owner or (self.ai_actor if source == "ai" else "ui:test")
        token = actor.set(identity)
        try:
            conversation_consent = (
                metadata.ai_authorization == "conversation"
                and bool(
                    getattr(parameters, "source_path", None)
                    or getattr(parameters, "overlay_source_path", None)
                    or any(
                        getattr(item, "source_path", None)
                        for item in getattr(parameters, "sources", [])
                    )
                    or any(
                        getattr(item, "source_path", None)
                        for item in getattr(parameters, "watermarks", [])
                    )
                )
                and bool(getattr(parameters, "user_authorization", None))
            )
            if (
                source == "ai"
                and metadata.effects != "read-only"
                and self.authorize
                and not conversation_consent
            ):
                await to_thread.run_sync(
                    self.authorize,
                    identity,
                    f"{tool_id}/{operation_id}",
                    parameters.model_dump(mode="json"),
                )
            with fail_after(metadata.timeout_seconds):
                async with self.limiter:
                    result = await to_thread.run_sync(handler, parameters, abandon_on_cancel=True)
            return handler.output_model.model_validate(result.model_dump())
        except TimeoutError as exc:
            raise AppError(504, "SYNC_TIMEOUT", "处理超时，请减少输入后重试") from exc
        except AppError:
            raise
        except Exception as exc:
            self.logger.error("operation_failed", extra={"request_id": request_id})
            raise AppError(500, "INTERNAL_ERROR", "处理未完成，请凭问题编号联系支持") from exc
        finally:
            actor.reset(token)
