$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Invoke-Check([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "检查失败：$Program $Arguments" }
}

Invoke-Check uv @('run', '--frozen', 'ruff', 'check')
Invoke-Check uv @('run', '--frozen', 'ruff', 'format', '--check')
Invoke-Check uv @('run', '--frozen', 'mypy')
Invoke-Check uv @('run', '--frozen', 'python', 'scripts/check_version.py')
Invoke-Check uv @('run', '--frozen', 'pytest', '-q')
Invoke-Check uv @('run', '--frozen', 'python', 'scripts/export_openapi.py', '--check')
Invoke-Check uv @('run', '--frozen', 'python', 'scripts/check_docs.py')
Push-Location apps/web
try {
    Invoke-Check pnpm @('generate:check')
    Invoke-Check pnpm @('lint')
    Invoke-Check pnpm @('format:check')
    Invoke-Check pnpm @('build')
    Invoke-Check pnpm @('test:e2e')
} finally { Pop-Location }
