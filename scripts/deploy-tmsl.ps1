param(
    [string]$TmslFile,
    [string]$Server,
    [string]$Token
)

$tmsl = Get-Content $TmslFile -Raw

# Import SqlServer module
Import-Module SqlServer

# Execute TMSL
try {
    $cred = New-Object PSCredential('app', (ConvertTo-SecureString $Token -AsPlainText -Force))
    Invoke-ASCmd -Query $tmsl -Server $Server -Credential $cred
    Write-Output '✅ TMDL model deployed successfully'
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}
