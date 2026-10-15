import json
import logging
import sys
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        value: dict[str, object] = {
            "time": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "event": record.getMessage(),
        }
        for key in (
            "request_id",
            "tool_id",
            "operation_id",
            "invocation_source",
            "status",
            "duration_ms",
        ):
            if hasattr(record, key):
                value[key] = getattr(record, key)
        if record.exc_info:
            value["exception"] = self.formatException(record.exc_info)
        return json.dumps(value, ensure_ascii=False)


def create_logger(directory: Path, max_bytes: int, backup_count: int) -> logging.Logger:
    directory.mkdir(parents=True, exist_ok=True)
    logger = logging.Logger(f"mtools.{id(directory)}", level=logging.INFO)
    handlers: list[logging.Handler] = [
        RotatingFileHandler(
            directory / "server.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
        ),
    ]
    if sys.stderr is not None:
        handlers.insert(0, logging.StreamHandler())
    for handler in handlers:
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
    return logger
