param(
    [string]$TmslFile,
    [string]$Server,
    [string]$Token
)

# Execute TMSL using .NET validator
try {
    $validatorPath = Join-Path $PSScriptRoot "..\aas-validator\AasValidator"

    $result = dotnet run --project $validatorPath --no-build --configuration Release -- `
        --server $Server `
        --token $Token `
        --command executetmsl `
        --file $TmslFile

    # Check if execution was successful
    $response = $result | ConvertFrom-Json
    if ($response.success) {
        Write-Output '✅ TMDL model deployed successfully'
    } else {
        throw $response.error
    }
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}
