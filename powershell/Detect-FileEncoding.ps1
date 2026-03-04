# Detect-FileEncoding.ps1
# File Encoding Detector — PowerShell implementation.
# Detects the character encoding of every file in a folder.
#
# Usage:
#   .\Detect-FileEncoding.ps1 -Folder "C:\Users\me\documents"
#   .\Detect-FileEncoding.ps1 -Folder .\src -Recursive
#   .\Detect-FileEncoding.ps1 -Folder .\data -Output csv
#
# See README.md or run with -? for full help.

#Requires -Version 5.1

[CmdletBinding(SupportsShouldProcess)]
param (
    # Path to the folder to scan.
    [Parameter(Mandatory, Position = 0)]
    [string]$Folder,

    # Scan subdirectories recursively.
    [switch]$Recursive,

    # Output format: console (default), csv, or json.
    [ValidateSet('console', 'csv', 'json')]
    [string]$Output = 'console',

    # Destination file for CSV/JSON export. Auto-named if not specified.
    [string]$File,

    # Include hidden files and system folders.
    [switch]$Hidden,

    # Only scan files with these extensions, e.g. -Ext .txt,.csv
    [string[]]$Ext,

    # Skip files smaller than N bytes.
    [int]$MinSize = 0,

    # Skip files larger than N bytes. 0 = no limit.
    [int]$MaxSize = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Load library scripts
# ---------------------------------------------------------------------------

$libPath = Join-Path $PSScriptRoot 'lib'
. (Join-Path $libPath 'Get-FileEncoding.ps1')
. (Join-Path $libPath 'Export-Results.ps1')

# ---------------------------------------------------------------------------
# Validate folder
# ---------------------------------------------------------------------------

$resolvedFolder = Resolve-Path -LiteralPath $Folder -ErrorAction SilentlyContinue
if (-not $resolvedFolder) {
    Write-Error "Folder not found: $Folder"
    exit 2
}
if (-not (Test-Path -LiteralPath $resolvedFolder -PathType Container)) {
    Write-Error "Path is not a directory: $resolvedFolder"
    exit 2
}

$rootPath = $resolvedFolder.Path

# ---------------------------------------------------------------------------
# Excluded dirs & files (see SPEC §5)
# ---------------------------------------------------------------------------

$excludedDirs = @('.git', '.hg', '.svn', 'node_modules', '__pycache__', '.mypy_cache', '.tox', '.venv', 'venv')
$excludedFiles = @('Thumbs.db', 'desktop.ini', '.DS_Store')
$excludedExts = @('.pyc', '.pyo')

# Normalise requested extensions
$extFilter = @()
if ($Ext) {
    $extFilter = $Ext | ForEach-Object {
        $e = $_.Trim().ToLower()
        if (-not $e.StartsWith('.')) { ".$e" } else { $e }
    }
}

# ---------------------------------------------------------------------------
# Collect files
# ---------------------------------------------------------------------------

function Get-TargetFiles {
    [CmdletBinding()]
    param ([string]$Path, [bool]$Recurse)

    $getChildParams = @{
        LiteralPath = $Path
        File        = $true
        ErrorAction = 'SilentlyContinue'
    }
    if ($Recurse) { $getChildParams['Recurse'] = $true }

    Get-ChildItem @getChildParams | Where-Object {
        $f = $_

        # Hidden files
        if (-not $Hidden -and $f.Name.StartsWith('.')) { return $false }
        if (-not $Hidden -and ($f.Attributes -band [System.IO.FileAttributes]::Hidden)) { return $false }

        # Excluded filenames
        if ($excludedFiles -contains $f.Name) { return $false }

        # Excluded extensions
        if ($excludedExts -contains $f.Extension.ToLower()) { return $false }

        # Extension filter
        if ($extFilter.Count -gt 0 -and $extFilter -notcontains $f.Extension.ToLower()) { return $false }

        # Size filters
        if ($f.Length -lt $MinSize) { return $false }
        if ($MaxSize -gt 0 -and $f.Length -gt $MaxSize) { return $false }

        # Excluded dirs (check if any ancestor matches)
        if ($Recurse) {
            $parent = $f.DirectoryName
            foreach ($excl in $excludedDirs) {
                if ($parent -match [regex]::Escape("\$excl\") -or $parent -match [regex]::Escape("\$excl$")) {
                    return $false
                }
            }
            if (-not $Hidden) {
                $segments = $parent.Substring($rootPath.Length).TrimStart('\').Split('\')
                foreach ($seg in $segments) {
                    if ($seg.StartsWith('.')) { return $false }
                }
            }
        }

        return $true
    }
}

$files = @(Get-TargetFiles -Path $rootPath -Recurse:$Recursive.IsPresent)

if ($files.Count -eq 0) {
    Write-Host 'No files found matching the given criteria.' -ForegroundColor Yellow
    exit 0
}

Write-Host "Scanning $($files.Count) file(s) in $rootPath ..." -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# Detect encodings
# ---------------------------------------------------------------------------

$results = @($files | ForEach-Object {
        Get-FileEncoding -FilePath $_.FullName
    })

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

function Get-AutoOutputPath {
    param ([string]$Fmt)
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $stem = Split-Path $rootPath -Leaf
    return Join-Path (Get-Location) "${stem}_encoding_${timestamp}.${Fmt}"
}

switch ($Output) {
    'console' {
        Write-ResultsTable -Results $results -RootPath $rootPath
    }
    'csv' {
        $outPath = if ($File) { $File } else { Get-AutoOutputPath -Fmt 'csv' }
        try {
            Export-ResultsCsv -Results $results -OutputPath $outPath -RootPath $rootPath
        }
        catch {
            Write-Error "Could not write CSV: $_"
            exit 3
        }
        Write-ResultsTable -Results $results -RootPath $rootPath
    }
    'json' {
        $outPath = if ($File) { $File } else { Get-AutoOutputPath -Fmt 'json' }
        try {
            Export-ResultsJson -Results $results -OutputPath $outPath -RootPath $rootPath
        }
        catch {
            Write-Error "Could not write JSON: $_"
            exit 3
        }
        Write-ResultsTable -Results $results -RootPath $rootPath
    }
}

exit 0