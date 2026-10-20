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
    """核验版本来源一致；提交时要求相对上一提交恰好递增一个级别。"""

    def read(path: str) -> str:
        return git_text(path, "") if staged else (ROOT / path).read_text("utf-8")

    version = str(tomllib.loads(read("pyproject.toml"))["project"]["version"])
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("项目版本须为 major.minor.patch")
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
        prior = tuple(map(int, previous.split(".")))
        current = tuple(map(int, version.split(".")))
        if current <= prior:
            raise ValueError(f"本次提交版本须高于上一提交：{previous}")
        sections = re.findall(r"^## \[(\d+\.\d+\.\d+)\]", read("CHANGELOG.md"), re.MULTILINE)
        if not sections or sections[0] != version:
            raise ValueError("CHANGELOG.md 顶部版本必须与项目版本一致")
        history = sorted(
            {
                tuple(map(int, item.split(".")))
                for item in sections
                if prior < tuple(map(int, item.split("."))) <= current
            }
        )
        for candidate in history:
            major, minor, patch = prior
            allowed = {
                (major, minor, patch + 1),
                (major, minor + 1, 0),
                (major + 1, 0, 0),
            }
            if candidate not in allowed:
                raise ValueError("CHANGELOG.md 的版本历史须由连续的 patch/minor/major 递增组成")
            prior = candidate
        if prior != current:
            raise ValueError("CHANGELOG.md 未包含从上一提交到本版本的完整递增历史")
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
