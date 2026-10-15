import io
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path


def main() -> None:
    """递增 minor 并同步项目、后端、前端与锁文件；不自动提交或发布。"""
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parents[1]
    project = root / "pyproject.toml"
    content = project.read_text("utf-8")
    old = str(tomllib.loads(content)["project"]["version"])
    major, minor, _ = map(int, old.split("."))
    version = f"{major}.{minor + 1}.0"
    project.write_text(
        content.replace(f'version = "{old}"', f'version = "{version}"', 1),
        encoding="utf-8",
        newline="\n",
    )
    initializer = root / "apps/server/src/mtools/__init__.py"
    initializer.write_text(
        re.sub(
            r'__version__ = "[\d.]+"', f'__version__ = "{version}"', initializer.read_text("utf-8")
        ),
        encoding="utf-8",
        newline="\n",
    )
    package_file = root / "apps/web/package.json"
    package = json.loads(package_file.read_text("utf-8"))
    package["version"] = version
    package_file.write_text(
        json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    subprocess.run(["uv", "lock", "--offline"], cwd=root, check=True)
    print(f"版本已递增：{old} → {version}；请补充 CHANGELOG.md 后运行统一检查")


if __name__ == "__main__":
    main()
