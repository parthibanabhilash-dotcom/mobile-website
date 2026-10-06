$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pgControl = Join-Path $PSScriptRoot '.tools/pg-runtime/pgsql/bin/pg_ctl.exe'
$pgData = Join-Path $PSScriptRoot '.tools/pg-data'
if (-not (Test-Path -LiteralPath $pgControl) -or -not (Test-Path -LiteralPath $pgData)) {
    throw 'This workspace does not have the portable PostgreSQL installation. Use docker compose up -d, as described in README.md.'
}
$pgReady = Join-Path $PSScriptRoot '.tools/pg-runtime/pgsql/bin/pg_isready.exe'
& $pgReady -h 127.0.0.1 -p 55432 -U mobile -d mobile_shop -q
if ($LASTEXITCODE -ne 0) {
    $pgLog = Join-Path $PSScriptRoot '.tools/postgres.log'
    # Start-Process -Wait also waits for the PostgreSQL server child, which stays running.
    # Wait for pg_ctl itself instead; its -w flag already waits for database readiness.
    $process = Start-Process -FilePath $pgControl -ArgumentList @('start', '-D', ('"' + $pgData + '"'), '-l', ('"' + $pgLog + '"'), '-o', '"-h 127.0.0.1 -p 55432"', '-w') -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(90000)) { throw 'PostgreSQL startup timed out. See .tools/postgres.log.' }
    $process.Refresh()
    if ($process.ExitCode -ne 0) { throw 'PostgreSQL did not start. See .tools/postgres.log.' }
}
Write-Host 'Local PostgreSQL is available on 127.0.0.1:55432.'
