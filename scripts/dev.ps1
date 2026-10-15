param([switch]$Web)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
Set-Location (Split-Path -Parent $PSScriptRoot)
if ($Web) {
    Set-Location apps/web
    pnpm dev
    exit $LASTEXITCODE
}
$env:MTOOLS_ALLOWED_ORIGINS = '["http://127.0.0.1:8000","http://localhost:8000","http://127.0.0.1:5173","http://localhost:5173"]'
uv run --frozen mtools serve
exit $LASTEXITCODE
