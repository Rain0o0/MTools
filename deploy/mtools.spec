from PyInstaller.utils.hooks import collect_all, collect_data_files
from pathlib import Path
import tomllib
from PyInstaller.utils.win32.versioninfo import (
    VSVersionInfo, FixedFileInfo, StringFileInfo, StringTable,
    StringStruct, VarFileInfo, VarStruct,
)

root = Path(SPECPATH).parent
version = tomllib.loads((root / 'pyproject.toml').read_text('utf-8'))['project']['version']
if Path(DISTPATH).resolve() != (root / 'dist/desktop' / f'v{version}').resolve():
    raise SystemExit('桌面包必须输出标准版本目录，请使用 scripts/build-desktop.ps1；禁止功能后缀目录。')
version_tuple = tuple(int(part) for part in version.split('.')) + (0,)
version_info = VSVersionInfo(
    ffi=FixedFileInfo(filevers=version_tuple, prodvers=version_tuple, mask=0x3f, flags=0,
                     OS=0x40004, fileType=1, subtype=0, date=(0, 0)),
    kids=[
        StringFileInfo([StringTable('080404b0', [
            StringStruct('FileVersion', version), StringStruct('ProductVersion', version),
            StringStruct('ProductName', 'MTools'), StringStruct('FileDescription', 'MTools 工具箱'),
        ])]),
        VarFileInfo([VarStruct('Translation', [2052, 1200])]),
    ],
)
webview_data, webview_bins, webview_imports = collect_all('webview')
edge_data, edge_bins, edge_imports = collect_all('edge_tts')
mcp_data = collect_data_files('mcp')
analysis = Analysis(
    [str(root / 'apps/desktop/entry.py')],
    pathex=[str(root / 'apps/server/src')],
    binaries=webview_bins + edge_bins,
    datas=webview_data + edge_data + mcp_data + collect_data_files('mtools') + [(str(root / 'apps/web/dist'), 'web'), (str(root / 'assets/mtools.ico'), 'branding'), (str(root / 'apps/server/src/mtools/adapters/speech_worker.py'), 'mtools/adapters')],
    hiddenimports=webview_imports + edge_imports,
    excludes=['pytest', 'mypy', 'ruff'],
)
archive = PYZ(analysis.pure)
desktop = EXE(archive, analysis.scripts, [], exclude_binaries=True, name='MTools', console=False, icon=str(root / 'assets/mtools.ico'), version=version_info)
assistant = EXE(archive, analysis.scripts, [], exclude_binaries=True, name='MToolsAI', console=True, icon=str(root / 'assets/mtools.ico'), version=version_info)
bundle = COLLECT(desktop, assistant, analysis.binaries, analysis.datas, name='MTools')
