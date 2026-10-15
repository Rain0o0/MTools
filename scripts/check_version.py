import argparse
import io
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git_text(path: str, revision: str) -> str:
    return subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=ROOT).decode("utf-8")


def check(staged: bool = False) -> str:
    """核验版本来源一致；提交时要求相对上一提交递增一个小版本。"""

    def read(path: str) -> str:
        return git_text(path, "") if staged else (ROOT / path).read_text("utf-8")

    version = str(tomllib.loads(read("pyproject.toml"))["project"]["version"])
    if not re.fullmatch(r"\d+\.\d+\.0", version):
        raise ValueError("项目版本须为 major.minor.0；每批更新递增 minor")
    python_match = re.search(
        r'__version__ = "([\d.]+)"', read("apps/server/src/mtools/__init__.py")
    )
    locked = tomllib.loads(read("uv.lock"))
    versions = [
        json.loads(read("apps/web/package.json"))["version"],
        python_match[1] if python_match else "",
        next(package["version"] for package in locked["package"] if package["name"] == "mtools"),
    ]
    if any(value != version for value in versions):
        raise ValueError("项目、Python、前端与 uv.lock 版本不同步，请运行 scripts/bump_version.py")
    if f"## [{version}]" not in read("CHANGELOG.md"):
        raise ValueError("CHANGELOG.md 缺少本版本更新记录")
    if staged:
        previous = str(tomllib.loads(git_text("pyproject.toml", "HEAD"))["project"]["version"])
        major, minor, _ = map(int, previous.split("."))
        if version != f"{major}.{minor + 1}.0":
            raise ValueError(f"本次提交必须从 {previous} 递增为 {major}.{minor + 1}.0")
    return version


def main() -> None:
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="校验 MTools 版本一致与迭代规则")
    parser.add_argument("--staged", action="store_true")
    arguments = parser.parse_args()
    print(f"版本检查通过：{check(arguments.staged)}")


if __name__ == "__main__":
    main()
