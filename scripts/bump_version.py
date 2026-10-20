import argparse
import io
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path


def main() -> None:
    """按改动范围递增版本并同步项目、后端、前端与锁文件。"""
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="同步递增 MTools 应用版本，不自动提交或发布")
    level = parser.add_mutually_exclusive_group()
    level.add_argument("--minor", action="store_true", help="新增向后兼容能力时递增 minor")
    level.add_argument("--major", action="store_true", help="破坏性变更时递增 major")
    arguments = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    project = root / "pyproject.toml"
    content = project.read_text("utf-8")
    old = str(tomllib.loads(content)["project"]["version"])
    major, minor, patch = map(int, old.split("."))
    if arguments.major:
        version = f"{major + 1}.0.0"
    elif arguments.minor:
        version = f"{major}.{minor + 1}.0"
    else:
        version = f"{major}.{minor}.{patch + 1}"
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
