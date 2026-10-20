$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$version = uv run --frozen --group desktop-build python -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])"
if ($LASTEXITCODE -ne 0) { throw '无法读取应用版本' }
$destination = Join-Path (Get-Location) "dist/desktop/v$version"
$target = Join-Path $destination 'MTools'
$running = Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -and $_.ExecutablePath.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)
}
if ($running) { throw '当前版本的目录包正在使用中，请关闭该版本软件及其 AI 连接后重新构建；其他版本不受影响。' }
pnpm --dir apps/web build
if ($LASTEXITCODE -ne 0) { throw '界面构建失败' }
uv run --frozen --group desktop-build pyinstaller --clean --noconfirm --distpath $destination --workpath build/desktop deploy/mtools.spec
if ($LASTEXITCODE -ne 0) { throw '桌面软件构建失败' }
uv run --frozen --group desktop-build python scripts/verify_windows_icon.py --directory $target
if ($LASTEXITCODE -ne 0) { throw '桌面图标校验失败' }

$packageRoot = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'dist/desktop'))
$archiveRoot = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'dist/archive/desktop'))
$runningPackages = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath })
foreach ($package in Get-ChildItem -LiteralPath $packageRoot -Directory) {
    if ($package.Name -eq "v$version" -or $package.Name -notmatch '^v\d+\.\d+\.\d+(?:-[a-z][a-z0-9-]*)?$') { continue }
    $sourcePath = [IO.Path]::GetFullPath($package.FullName)
    $archivePath = [IO.Path]::GetFullPath((Join-Path $archiveRoot $package.Name))
    if (-not $sourcePath.StartsWith($packageRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
        -not $archivePath.StartsWith($archiveRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw '历史包归档路径超出预期目录，已停止'
    }
    if ($runningPackages | Where-Object { $_.ExecutablePath.StartsWith($sourcePath + '\', [StringComparison]::OrdinalIgnoreCase) }) {
        Write-Host "旧包仍在使用，退出后下次构建归档：$($package.Name)"
        continue
    }
    if (Test-Path -LiteralPath $archivePath) {
        Write-Host "历史归档已存在，保留原目录避免覆盖：$($package.Name)"
        continue
    }
    New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null
    Move-Item -LiteralPath $sourcePath -Destination $archivePath
    Write-Host "历史包已移出当前交付目录：$($package.Name)"
}
