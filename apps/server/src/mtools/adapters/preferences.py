import os
import tempfile
from pathlib import Path

from pydantic import ValidationError

from mtools.contracts.models import Preferences


class PreferenceStore:
    """将非敏感偏好原子保存于应用数据目录，独立于窗口随机端口。"""

    def __init__(self, directory: Path) -> None:
        self.path = directory / "preferences.json"
        try:
            self.value = Preferences.model_validate_json(self.path.read_text("utf-8"))
        except (FileNotFoundError, ValidationError):
            self.value = Preferences()

    def save(self, value: Preferences) -> None:
        descriptor, name = tempfile.mkstemp(dir=self.path.parent, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
                stream.write(value.model_dump_json() + "\n")
            os.replace(name, self.path)
            self.value = value
        finally:
            Path(name).unlink(missing_ok=True)
