# Export-Results.ps1
# Output formatting: console table, CSV, and JSON export.
# Part of the File Encoding Detector project.

<#
.SYNOPSIS
    Prints detection results as a formatted console table.

.PARAMETER Results
    Array of result objects (as returned by Get-FileEncoding).

.PARAMETER RootPath
    The scanned root folder, used to compute relative paths.
#>
function Write-ResultsTable {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [object[]]$Results,

        [Parameter(Mandatory)]
        [string]$RootPath
    )

    $colFile = 50
    $colEnc = 14
    $colConf = 12
    $colSize = 12

    $header = '{0,-50}  {1,-14}  {2,-12}  {3,12}' -f 'File', 'Encoding', 'Confidence', 'Size'
    $sep = '{0}  {1}  {2}  {3}' -f ('-' * $colFile), ('-' * $colEnc), ('-' * $colConf), ('-' * $colSize)

    Write-Host $header
    Write-Host $sep

    foreach ($r in $Results) {
        # Compute relative path
        $rel = Get-RelativePath -FullPath $r.Path -Root $RootPath

        # Truncate long paths
        if ($rel.Length -gt $colFile) {
            $rel = [char]0x2026 + $rel.Substring($rel.Length - ($colFile - 1))
        }

        $enc = if ($r.Error) { 'ERROR' } elseif ($r.Encoding) { $r.Encoding } else { 'unknown' }
        $conf = Format-Confidence -Result $r
        $size = Format-Size -Bytes $r.SizeBytes

        # Colour-code errors
        if ($r.Error) {
            Write-Host ('{0,-50}  {1,-14}  {2,-12}  {3,12}' -f $rel, $enc, $conf, $size) -ForegroundColor Red
        }
        else {
            Write-Host ('{0,-50}  {1,-14}  {2,-12}  {3,12}' -f $rel, $enc, $conf, $size)
        }
    }

    $errorCount = @($Results | Where-Object { $_.Error }).Count
    Write-Host $sep
    Write-Host ""
    Write-Host "$(@($Results).Count) file(s) scanned. $errorCount error(s)."
}


<#
.SYNOPSIS
    Exports detection results to a CSV file.

.PARAMETER Results
    Array of result objects.

.PARAMETER OutputPath
    Destination CSV file path.

.PARAMETER RootPath
    Root folder for relative path computation.
#>
function Export-ResultsCsv {
    [CmdletBinding(SupportsShouldProcess)]
    param (
        [Parameter(Mandatory)]
        [object[]]$Results,

        [Parameter(Mandatory)]
        [string]$OutputPath,

        [Parameter(Mandatory)]
        [string]$RootPath
    )

    $rows = foreach ($r in $Results) {
        $rel = Get-RelativePath -FullPath $r.Path -Root $RootPath
        [PSCustomObject]@{
            path       = $rel
            encoding   = if ($r.Encoding) { $r.Encoding } else { '' }
            confidence = if ($null -ne $r.Confidence) { [Math]::Round($r.Confidence, 4) } else { '' }
            size_bytes = $r.SizeBytes
            error      = if ($r.Error) { $r.Error } else { '' }
        }
    }

    if ($PSCmdlet.ShouldProcess($OutputPath, 'Export CSV')) {
        $rows | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding UTF8
        Write-Host "CSV exported -> $OutputPath" -ForegroundColor Cyan
    }
}


<#
.SYNOPSIS
    Exports detection results to a JSON file.

.PARAMETER Results
    Array of result objects.

.PARAMETER OutputPath
    Destination JSON file path.

.PARAMETER RootPath
    Root folder for relative path computation.
#>
function Export-ResultsJson {
    [CmdletBinding(SupportsShouldProcess)]
    param (
        [Parameter(Mandatory)]
        [object[]]$Results,

        [Parameter(Mandatory)]
        [string]$OutputPath,

        [Parameter(Mandatory)]
        [string]$RootPath
    )

    $data = foreach ($r in $Results) {
        $rel = Get-RelativePath -FullPath $r.Path -Root $RootPath
        [ordered]@{
            path       = $rel
            encoding   = $r.Encoding
            confidence = if ($null -ne $r.Confidence) { [Math]::Round($r.Confidence, 4) } else { $null }
            size_bytes = $r.SizeBytes
            error      = $r.Error
        }
    }

    if ($PSCmdlet.ShouldProcess($OutputPath, 'Export JSON')) {
        $data | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
        Write-Host "JSON exported -> $OutputPath" -ForegroundColor Cyan
    }
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

function Get-RelativePath {
    param ([string]$FullPath, [string]$Root)
    $root = $Root.TrimEnd('\', '/')
    if ($FullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $FullPath.Substring($root.Length).TrimStart('\', '/')
    }
    return $FullPath
}

function Format-Confidence {
    param ([object]$Result)
    if ($Result.Error) { return 'ERROR' }
    if ($null -eq $Result.Confidence) { return '-' }
    return '{0:P0}' -f $Result.Confidence
}

function Format-Size {
    param ([long]$Bytes)
    if ($Bytes -lt 1KB) { return "$Bytes B" }
    if ($Bytes -lt 1MB) { return '{0:N1} KB' -f ($Bytes / 1KB) }
    return '{0:N1} MB' -f ($Bytes / 1MB)
}