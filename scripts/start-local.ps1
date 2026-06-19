param(
  [int]$FrontendPort = 3000,
  [int]$BackendPort = 8000
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logDir = Join-Path $root ".codex-logs"
$statePath = Join-Path $logDir "local-services.json"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Import-EnvFile([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $name, $value = $line.Split('=', 2)
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"'), "Process")
  }
}

function Assert-PortAvailable([int]$Port) {
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($listener) { throw "Port $Port is already in use." }
}

Import-EnvFile (Join-Path $root "backend\.env.local")
Assert-PortAvailable $BackendPort
Assert-PortAvailable $FrontendPort

$backend = Start-Process -FilePath "py" `
  -ArgumentList @("-3.12", "-m", "uvicorn", "backend.api.main:app", "--host", "127.0.0.1", "--port", "$BackendPort") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir "backend-local.log") `
  -RedirectStandardError (Join-Path $logDir "backend-local.err.log") `
  -PassThru

$env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:$BackendPort"
$frontend = Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--hostname", "127.0.0.1", "--port", "$FrontendPort") `
  -WorkingDirectory (Join-Path $root "frontend") `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir "frontend-local.log") `
  -RedirectStandardError (Join-Path $logDir "frontend-local.err.log") `
  -PassThru

$deadline = (Get-Date).AddSeconds(60)
do {
  Start-Sleep -Seconds 1
  try {
    $ready = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2
    $page = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort/" -UseBasicParsing -TimeoutSec 2
    if ($ready.status -eq "ok" -and $page.StatusCode -eq 200) {
      $backendListener = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction Stop | Select-Object -First 1
      $frontendListener = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction Stop | Select-Object -First 1
      @{
        backendPid = $backendListener.OwningProcess
        frontendPid = $frontendListener.OwningProcess
        backendLauncherPid = $backend.Id
        frontendLauncherPid = $frontend.Id
        backendUrl = "http://127.0.0.1:$BackendPort"
        frontendUrl = "http://127.0.0.1:$FrontendPort"
      } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
      Write-Output "Frontend: http://127.0.0.1:$FrontendPort"
      Write-Output "Backend:  http://127.0.0.1:$BackendPort"
      exit 0
    }
  } catch {
    # Services are still starting.
  }
} while ((Get-Date) -lt $deadline)

Stop-Process -Id $backend.Id, $frontend.Id -Force -ErrorAction SilentlyContinue
throw "Local services did not become ready. Check .codex-logs."
