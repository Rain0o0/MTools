import argparse
import asyncio
import io
import sys

import uvicorn

from mtools.bootstrap.app import create_app
from mtools.bootstrap.config import Settings


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="MTools 工具箱")
    parser.add_argument(
        "command", nargs="?", choices=["desktop", "serve", "mcp"], default="desktop"
    )
    parser.add_argument("--host")
    parser.add_argument("--port", type=int)
    args = parser.parse_args()
    overrides = {
        key: value for key, value in vars(args).items() if key != "command" and value is not None
    }
    settings = Settings(**overrides)
    if args.command == "serve":
        uvicorn.run(create_app(settings), host=settings.host, port=settings.port, access_log=False)
    elif args.command == "mcp":
        from mtools.adapters.logging import create_logger
        from mtools.adapters.mcp_server import serve_stdio
        from mtools.bootstrap.tools import assemble_tools
        from mtools.platform.execution import ToolRuntime

        logger = create_logger(
            settings.data_dir / "logs", settings.log_max_bytes, settings.log_backup_count
        )
        try:
            asyncio.run(serve_stdio(ToolRuntime(assemble_tools(settings), logger)))
        finally:
            for handler in logger.handlers:
                handler.close()
    else:
        from mtools.adapters.desktop import bundled_web_dir, run_desktop, show_startup_error

        if web_dir := bundled_web_dir():
            settings = settings.model_copy(update={"web_dir": web_dir})
        try:
            run_desktop(settings)
        except Exception as exc:
            show_startup_error(str(exc))
            raise SystemExit(1) from exc
