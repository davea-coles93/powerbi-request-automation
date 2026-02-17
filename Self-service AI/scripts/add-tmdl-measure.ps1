param(
    [Parameter(Mandatory=$true)]
    [string]$TableFile,

    [Parameter(Mandatory=$true)]
    [string]$MeasureName,

    [Parameter(Mandatory=$true)]
    [string]$Expression,

    [string]$FormatString = "",
    [string]$Description = ""
)

# Read the TMDL file
$content = Get-Content $TableFile -Raw

# Generate a unique lineage tag (GUID without hyphens)
$lineageTag = (New-Guid).ToString("N")

# Build the measure block
$measureBlock = "`n`tmeasure '$MeasureName' = $Expression"

if ($FormatString) {
    $measureBlock += "`n`t`tformatString: $FormatString"
}

if ($Description) {
    $measureBlock += "`n`t`t/// $Description"
}

$measureBlock += "`n`t`tlineageTag: $lineageTag`n"

# Find the insertion point (after the last measure or after lineageTag if no measures)
# Insert before the first column definition
if ($content -match '(?s)(.*?)\s+column\s+') {
    # Insert before first column
    $insertPoint = $Matches[1].Length
    $newContent = $content.Substring(0, $insertPoint) + $measureBlock + $content.Substring($insertPoint)
} elseif ($content -match '(?s)(.*measure.*?lineageTag:.*?)(\s+partition|\s+$)') {
    # Insert after last measure
    $insertPoint = $Matches[1].Length
    $newContent = $content.Substring(0, $insertPoint) + $measureBlock + $content.Substring($insertPoint)
} else {
    # Insert after table lineageTag
    if ($content -match '(?s)(table.*?lineageTag:.*?)(\s+)') {
        $insertPoint = $Matches[1].Length
        $newContent = $content.Substring(0, $insertPoint) + "`n" + $measureBlock + $content.Substring($insertPoint)
    } else {
        Write-Error "Could not find insertion point in TMDL file"
        exit 1
    }
}

# Write back to file
$newContent | Set-Content $TableFile -NoNewline

Write-Host "SUCCESS: Added measure '$MeasureName' to $(Split-Path $TableFile -Leaf)"
