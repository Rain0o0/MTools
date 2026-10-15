$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
pnpm --dir apps/web build
if ($LASTEXITCODE -ne 0) { throw '界面构建失败' }
uv run --frozen --group desktop-build pyinstaller --noconfirm --distpath dist/desktop --workpath build/desktop deploy/mtools.spec
if ($LASTEXITCODE -ne 0) { throw '桌面软件构建失败' }
