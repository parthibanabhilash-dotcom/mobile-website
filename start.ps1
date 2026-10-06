$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$portableNode = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portableNode) { $env:PATH = $portableNode.FullName + ';' + $env:PATH }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 or newer, then run this script again.' }
if (-not (Test-Path -LiteralPath 'node_modules')) { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' } }
if ((Test-Path -LiteralPath '.env') -and (Test-Path -LiteralPath '.tools/mysql-data')) {
    $localConfig = Get-Content -LiteralPath '.env' -Raw
    if ($localConfig -match '127\.0\.0\.1:3307/mobile_shop') { & (Join-Path $PSScriptRoot 'local-db.ps1') }
}
npm.cmd run dev
