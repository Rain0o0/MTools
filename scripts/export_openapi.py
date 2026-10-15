import argparse
import io
import json
import sys
from pathlib import Path

from mtools.bootstrap.app import create_app


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="从后端契约导出 OpenAPI，不启动服务")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    destination = Path(__file__).resolve().parents[1] / "apps/web/openapi.json"
    content = json.dumps(create_app().openapi(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not destination.exists() or destination.read_text("utf-8") != content:
            raise SystemExit("OpenAPI 不同步，请运行 uv run python scripts/export_openapi.py")
    else:
        destination.write_text(content, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
