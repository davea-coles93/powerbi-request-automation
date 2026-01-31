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
    Write-Output '✅ TMDL model deleted'
} catch {
    Write-Warning "Database cleanup failed: $_"
}
