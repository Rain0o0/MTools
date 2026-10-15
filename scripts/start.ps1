$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
Set-Location (Split-Path -Parent $PSScriptRoot)
uv run --frozen mtools desktop
exit $LASTEXITCODE
