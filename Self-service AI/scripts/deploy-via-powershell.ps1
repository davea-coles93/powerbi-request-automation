param(
    [string]$Server,
    [string]$Token,
    [string]$TmslFile
)

# Read TMSL from file
$tmsl = Get-Content $TmslFile -Raw

# Build connection string with token
$connectionString = "Data Source=$Server;Password=$Token;"

try {
    # Try using Invoke-ASCmd if SqlServer module is available
    if (Get-Command Invoke-ASCmd -ErrorAction SilentlyContinue) {
        Write-Host "Using Invoke-ASCmd..."
        Invoke-ASCmd -Query $tmsl -Server $Server -ServicePrincipal -Credential (New-Object System.Management.Automation.PSCredential("app", (ConvertTo-SecureString $Token -AsPlainText -Force)))
        Write-Output '{"success":true,"message":"TMSL executed successfully"}'
    } else {
        Write-Host "SqlServer module not found, trying direct ADOMD approach..."

        # Load ADOMD.NET assembly
        Add-Type -Path "C:\Program Files\Microsoft.NET\ADOMD.NET\160\Microsoft.AnalysisServices.AdomdClient.dll" -ErrorAction Stop

        $connection = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection($connectionString)
        $connection.Open()

        $cmd = $connection.CreateCommand()
        $cmd.CommandText = $tmsl
        $cmd.CommandType = [System.Data.CommandType]::Text

        # Try different execution methods
        try {
            $cmd.ExecuteNonQuery()
        } catch {
            # If ExecuteNonQuery doesn't work, try ExecuteReader
            $reader = $cmd.ExecuteReader()
            $reader.Close()
        }

        $connection.Close()
        Write-Output '{"success":true,"message":"TMSL executed successfully"}'
    }
} catch {
    $errorObj = @{
        success = $false
        error = $_.Exception.Message
        type = $_.Exception.GetType().Name
    }
    Write-Output ($errorObj | ConvertTo-Json)
    exit 1
}
