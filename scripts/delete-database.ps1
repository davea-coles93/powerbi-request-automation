param(
    [string]$DatabaseName,
    [string]$Server,
    [string]$Token
)

# Delete database using .NET validator
try {
    $validatorPath = Join-Path $PSScriptRoot "..\aas-validator\AasValidator"

    $result = dotnet run --project $validatorPath --no-build --configuration Release -- `
        --server $Server `
        --token $Token `
        --command deletedb `
        --database $DatabaseName

    # Check if deletion was successful
    $response = $result | ConvertFrom-Json
    if ($response.success) {
        Write-Output '✅ TMDL model deleted'
    } else {
        Write-Warning "Database cleanup failed: $($response.error)"
    }
} catch {
    Write-Warning "Database cleanup failed: $_"
}
