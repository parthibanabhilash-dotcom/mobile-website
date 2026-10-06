$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$mysqlConfig = Join-Path $PSScriptRoot '.tools/mysql.ini'
$mysqlRuntime = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools/mysql-runtime') -Directory -Filter 'mysql-*-winx64' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $mysqlRuntime -or -not (Test-Path -LiteralPath $mysqlConfig)) { throw 'Portable MySQL is not configured. Use the Docker MySQL setup in setup.md.' }
function Test-LocalMysql {
    $client = New-Object Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', 3307); return $client.Connected } catch { return $false } finally { $client.Dispose() }
}
if (-not (Test-LocalMysql)) {
    Start-Process -FilePath (Join-Path $mysqlRuntime.FullName 'bin/mysqld.exe') -ArgumentList ('--defaults-file="' + $mysqlConfig + '"') -WindowStyle Hidden
    for ($i=0; $i -lt 40; $i++) { if (Test-LocalMysql) { break }; Start-Sleep -Milliseconds 500 }
    if (-not (Test-LocalMysql)) { throw 'MySQL startup timed out. See .tools/mysql.log.' }
}
Write-Host 'Local MySQL is available on 127.0.0.1:3307.'
