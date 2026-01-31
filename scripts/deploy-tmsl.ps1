param(
    [string]$TmslFile,
    [string]$Server,
    [string]$Token
)

$tmsl = Get-Content $TmslFile -Raw

# Execute TMSL via REST API
try {
    # Extract server region and name from connection string
    # Format: asazure://region.asazure.windows.net/servername
    if ($Server -match 'asazure://([^/]+)/(.+)') {
        $endpoint = $matches[1]
        $serverName = $matches[2]
    } else {
        throw "Invalid server format: $Server"
    }

    # Build REST API endpoint
    $apiUrl = "https://$endpoint/servers/$serverName/models/`$system/tmsl"

    # Execute TMSL command
    $headers = @{
        'Authorization' = "Bearer $Token"
        'Content-Type' = 'application/json'
    }

    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $tmsl
    Write-Output '✅ TMDL model deployed successfully'
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}
