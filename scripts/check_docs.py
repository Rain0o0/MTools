import io
import re
import sys
from pathlib import Path
from urllib.parse import unquote


def main() -> None:
    """检查正式文档元数据、相对链接及项目文本编码与换行。"""
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parents[1]
    errors: list[str] = []
    ids: dict[str, Path] = {}
    ignored = {
        ".git",
        ".venv",
        "node_modules",
        "dist",
        "__pycache__",
        ".pytest_cache",
        ".ruff_cache",
        ".mypy_cache",
        ".runtime",
        "build",
        "test-results",
        "playwright-report",
    }
    text_suffixes = {
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".mjs",
        ".json",
        ".yaml",
        ".toml",
        ".md",
        ".css",
        ".html",
        ".ps1",
        ".lock",
        ".spec",
    }
    documents = [root / "README.md", root / "AGENTS.md", root / "CHANGELOG.md"]
    documents.extend((root / "docs").rglob("*.md"))
    for path in documents:
        text = path.read_text(encoding="utf-8")
        if path.is_relative_to(root / "docs"):
            header = text.split("---", 2)
            if len(header) != 3 or header[0] != "":
                errors.append(f"缺少元数据：{path.relative_to(root)}")
                continue
            metadata = dict(re.findall(r"^([a-z_]+): (.*)$", header[1], re.MULTILINE))
            for field in ("doc_id", "title", "kind", "status", "updated", "tags"):
                if field not in metadata:
                    errors.append(f"缺少 {field}：{path.relative_to(root)}")
            doc_id = metadata.get("doc_id", "")
            if doc_id in ids:
                errors.append(f"重复 doc_id：{doc_id}")
            ids[doc_id] = path
        for target in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text):
            target = target.split("#", 1)[0].strip("<>")
            if not target or re.match(r"^[a-z]+:", target):
                continue
            if not (path.parent / unquote(target)).exists():
                errors.append(f"断链：{path.relative_to(root)} -> {target}")
    pending = [root]
    count = 0
    while pending:
        directory = pending.pop()
        for path in directory.iterdir():
            if path.name in ignored:
                continue
            if path.is_dir():
                pending.append(path)
            elif path.suffix in text_suffixes or path.name in {
                ".editorconfig",
                ".gitattributes",
                ".gitignore",
                ".env.example",
                ".dockerignore",
                ".python-version",
                "Dockerfile",
            }:
                count += 1
                raw = path.read_bytes()
                try:
                    raw.decode("utf-8")
                except UnicodeDecodeError:
                    errors.append(f"非 UTF-8：{path.relative_to(root)}")
                if raw.startswith(b"\xef\xbb\xbf") or b"\r" in raw:
                    errors.append(f"存在 BOM 或非 LF 换行：{path.relative_to(root)}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"文档链接、元数据和 {count} 份文本编码检查通过")


if __name__ == "__main__":
    main()
