param([switch]$Once,[int]$IntervalSeconds=60)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$env:GIT_TERMINAL_PROMPT='0';$env:GCM_INTERACTIVE='Never'
$logDirectory=Join-Path $projectRoot '.git-sync'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
function Write-SyncLog([string]$Message){Add-Content -LiteralPath (Join-Path $logDirectory 'sync.log') -Value ((Get-Date -Format s)+' '+$Message)}
function Receive-Changes {
 Push-Location -LiteralPath $projectRoot
 try {
  $remote=& git remote get-url origin 2>$null
  if($LASTEXITCODE -ne 0){Write-SyncLog 'Remote is not configured.';return}
  $changes=& git status --porcelain
  if($LASTEXITCODE -ne 0){throw 'Cannot inspect Git status.'}
  if($changes){Write-SyncLog 'Local edits present: automatic update skipped.';return}
  & git fetch --quiet --prune origin main 2>$null
  if($LASTEXITCODE -ne 0){Write-SyncLog 'Fetch failed: check network or GitHub login.';return}
  & git merge --ff-only --quiet origin/main 2>$null
  if($LASTEXITCODE -ne 0){Write-SyncLog 'History diverged: manual merge required.';return}
  Write-SyncLog 'Project up to date.'
 }finally{Pop-Location}
}
do {try{Receive-Changes}catch{Write-SyncLog $_.Exception.Message};if(-not $Once){Start-Sleep -Seconds ([Math]::Max(30,$IntervalSeconds))}}while(-not $Once)
