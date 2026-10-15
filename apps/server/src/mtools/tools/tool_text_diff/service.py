from difflib import SequenceMatcher, unified_diff

from mtools.contracts.models import AppError
from mtools.tools.tool_text_diff.schemas import DiffParameters, DiffResult


def compare_text(parameters: DiffParameters) -> DiffResult:
    """逐行比较文本，保留换行差异并返回统一差异格式。"""
    old = parameters.old_text.splitlines(keepends=True)
    new = parameters.new_text.splitlines(keepends=True)
    if max(len(old), len(new)) > 2000:
        raise AppError(422, "TOO_MANY_LINES", "每份文本最多支持 2000 行")
    added, removed = 0, 0
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, old, new).get_opcodes():
        if tag in ("replace", "insert"):
            added += j2 - j1
        if tag in ("replace", "delete"):
            removed += i2 - i1
    chunks = []
    for line in unified_diff(
        old, new, fromfile="original", tofile="modified", n=parameters.context_lines
    ):
        chunks.append(line if line.endswith("\n") else line + "\n\\ No newline at end of file\n")
    text = "".join(chunks)
    return DiffResult(
        text=text,
        identical=parameters.old_text == parameters.new_text,
        added_lines=added,
        removed_lines=removed,
    )
