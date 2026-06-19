$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$statePath = Join-Path $root ".codex-logs\local-services.json"

if (-not (Test-Path $statePath)) {
  Write-Output "No local service state file was found."
  exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
foreach ($processId in @($state.backendPid, $state.frontendPid, $state.backendLauncherPid, $state.frontendLauncherPid)) {
  if ($processId) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}
Remove-Item -LiteralPath $statePath -Force
Write-Output "Local AdFlow-AI services stopped."
