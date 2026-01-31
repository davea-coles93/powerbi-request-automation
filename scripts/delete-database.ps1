param(
    [string]$DatabaseName,
    [string]$Server,
    [string]$Token
)

$tmsl = @"
{
  "delete": {
    "object": {
      "database": "$DatabaseName"
    }
  }
}
"@

# Import SqlServer module
Import-Module SqlServer

# Execute TMSL
try {
    $cred = New-Object PSCredential('app', (ConvertTo-SecureString $Token -AsPlainText -Force))
    Invoke-ASCmd -Query $tmsl -Server $Server -Credential $cred
    Write-Output '✅ TMDL model deleted'
} catch {
    Write-Warning "Database cleanup failed: $_"
}
