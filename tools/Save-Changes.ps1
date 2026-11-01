param([Parameter(Mandatory=$true)][string]$Message)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
 & git add --all
 if($LASTEXITCODE -ne 0){throw 'Cannot stage changes.'}
 & node (Join-Path $PSScriptRoot 'check-secrets.cjs')
 if($LASTEXITCODE -ne 0){throw 'Credential check failed. Changes have not been committed.'}
 & node (Join-Path $PSScriptRoot 'check-syntax.cjs')
 if($LASTEXITCODE -ne 0){throw 'JavaScript syntax check failed. Changes have not been committed.'}
 & git diff --cached --quiet
 if($LASTEXITCODE -eq 0){Write-Output 'Nothing to commit.';return}
 & git commit -m $Message
 if($LASTEXITCODE -ne 0){throw 'Commit failed.'}
 & git push origin main
 if($LASTEXITCODE -ne 0){throw 'Push failed. Local commit is saved; receive/merge remote changes and retry.'}
}finally{Pop-Location}
