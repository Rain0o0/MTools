from PyInstaller.utils.hooks import collect_all, collect_data_files
from pathlib import Path

root = Path(SPECPATH).parent
webview_data, webview_bins, webview_imports = collect_all('webview')
mcp_data = collect_data_files('mcp')
analysis = Analysis(
    [str(root / 'apps/desktop/entry.py')],
    pathex=[str(root / 'apps/server/src')],
    binaries=webview_bins,
    datas=webview_data + mcp_data + collect_data_files('mtools') + [(str(root / 'apps/web/dist'), 'web')],
    hiddenimports=webview_imports,
    excludes=['pytest', 'mypy', 'ruff'],
)
archive = PYZ(analysis.pure)
desktop = EXE(archive, analysis.scripts, [], exclude_binaries=True, name='MTools', console=False)
assistant = EXE(archive, analysis.scripts, [], exclude_binaries=True, name='MToolsAI', console=True)
bundle = COLLECT(desktop, assistant, analysis.binaries, analysis.datas, name='MTools')
