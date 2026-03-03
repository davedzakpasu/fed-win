# Get-FileEncoding.ps1
# Encoding detection logic: BOM → .NET StreamReader → heuristic fallback.
# Part of the File Encoding Detector project.

<#
.SYNOPSIS
    Returns the detected encoding of a single file.

.DESCRIPTION
    Uses a three-tier detection strategy:
      1. BOM (Byte Order Mark) inspection — 100% confidence
      2. .NET StreamReader with detectEncodingFromByteOrderMarks — ~80% confidence
      3. Heuristic UTF-8 / ASCII / binary classification — ~60% confidence

.PARAMETER FilePath
    Full path to the file to inspect.

.OUTPUTS
    PSCustomObject with: Path, Encoding, Confidence, SizeBytes, Error
#>
function Get-FileEncoding {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$FilePath
    )

    process {
        $result = [PSCustomObject]@{
            Path       = $FilePath
            Encoding   = $null
            Confidence = $null
            SizeBytes  = 0
            Error      = $null
        }

        # --- File accessibility check ---
        try {
            $fileInfo = Get-Item -LiteralPath $FilePath -ErrorAction Stop
            $result.SizeBytes = $fileInfo.Length
        }
        catch {
            $result.Error = $_.Exception.Message
            return $result
        }

        # --- Empty file ---
        if ($result.SizeBytes -eq 0) {
            $result.Encoding   = 'EMPTY'
            $result.Confidence = $null
            return $result
        }

        # --- Read first bytes for BOM detection (up to 64 KB) ---
        $sampleSize = [Math]::Min(65536, $result.SizeBytes)
        try {
            $stream = [System.IO.File]::OpenRead($FilePath)
            $buffer = New-Object byte[] $sampleSize
            $bytesRead = $stream.Read($buffer, 0, $sampleSize)
            $stream.Close()
            $buffer = $buffer[0..($bytesRead - 1)]
        }
        catch {
            $result.Error = $_.Exception.Message
            return $result
        }

        # --- Tier 1: BOM detection ---
        $bomResult = Test-BOM -Buffer $buffer
        if ($bomResult) {
            $result.Encoding   = $bomResult
            $result.Confidence = 1.0
            Write-Verbose "BOM detected: $bomResult for $FilePath"
            return $result
        }

        # --- Tier 2: .NET StreamReader detection ---
        try {
            $reader = New-Object System.IO.StreamReader($FilePath, $true)
            [void]$reader.Peek()   # Forces encoding detection
            $dotNetEncoding = $reader.CurrentEncoding.WebName.ToUpper()
            $reader.Close()

            # StreamReader defaults to UTF-8 when no BOM is found, which is unreliable.
            # Only trust it for non-default results.
            if ($dotNetEncoding -ne 'UTF-8') {
                $result.Encoding   = $dotNetEncoding
                $result.Confidence = 0.80
                Write-Verbose ".NET detected: $dotNetEncoding for $FilePath"
                return $result
            }
        }
        catch {
            Write-Verbose ".NET detection failed for ${FilePath}: $_"
        }

        # --- Tier 3: Heuristic (ASCII / UTF-8 / binary) ---
        $heuristicResult = Get-HeuristicEncoding -Buffer $buffer
        $result.Encoding   = $heuristicResult.Encoding
        $result.Confidence = $heuristicResult.Confidence
        Write-Verbose "Heuristic detected: $($heuristicResult.Encoding) for $FilePath"
        return $result
    }
}


<#
.SYNOPSIS
    Checks the buffer for known Byte Order Marks.

.PARAMETER Buffer
    Byte array to inspect.

.OUTPUTS
    Encoding name string if a BOM is found, otherwise $null.
#>
function Test-BOM {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [byte[]]$Buffer
    )

    $len = $Buffer.Length

    # UTF-32 LE: FF FE 00 00
    if ($len -ge 4 -and $Buffer[0] -eq 0xFF -and $Buffer[1] -eq 0xFE -and
        $Buffer[2] -eq 0x00 -and $Buffer[3] -eq 0x00) {
        return 'UTF-32-LE'
    }

    # UTF-32 BE: 00 00 FE FF
    if ($len -ge 4 -and $Buffer[0] -eq 0x00 -and $Buffer[1] -eq 0x00 -and
        $Buffer[2] -eq 0xFE -and $Buffer[3] -eq 0xFF) {
        return 'UTF-32-BE'
    }

    # UTF-8 BOM: EF BB BF
    if ($len -ge 3 -and $Buffer[0] -eq 0xEF -and $Buffer[1] -eq 0xBB -and $Buffer[2] -eq 0xBF) {
        return 'UTF-8-BOM'
    }

    # UTF-16 LE: FF FE
    if ($len -ge 2 -and $Buffer[0] -eq 0xFF -and $Buffer[1] -eq 0xFE) {
        return 'UTF-16-LE'
    }

    # UTF-16 BE: FE FF
    if ($len -ge 2 -and $Buffer[0] -eq 0xFE -and $Buffer[1] -eq 0xFF) {
        return 'UTF-16-BE'
    }

    return $null
}


<#
.SYNOPSIS
    Classifies encoding heuristically by inspecting byte patterns.

.DESCRIPTION
    Checks whether the content is pure ASCII, valid UTF-8 multi-byte,
    or likely binary/unknown.

.PARAMETER Buffer
    Byte array sample to inspect.

.OUTPUTS
    PSCustomObject with Encoding and Confidence properties.
#>
function Get-HeuristicEncoding {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [byte[]]$Buffer
    )

    $isAscii    = $true
    $isUtf8     = $true
    $i          = 0
    $len        = $Buffer.Length

    while ($i -lt $len) {
        $b = $Buffer[$i]

        if ($b -gt 0x7F) {
            $isAscii = $false

            # Determine expected continuation bytes
            if ($b -ge 0xC2 -and $b -le 0xDF) { $extra = 1 }
            elseif ($b -ge 0xE0 -and $b -le 0xEF) { $extra = 2 }
            elseif ($b -ge 0xF0 -and $b -le 0xF4) { $extra = 3 }
            else {
                # Invalid UTF-8 lead byte
                $isUtf8 = $false
                break
            }

            # Validate continuation bytes
            for ($j = 1; $j -le $extra; $j++) {
                if (($i + $j) -ge $len) { $isUtf8 = $false; break }
                $cont = $Buffer[$i + $j]
                if (($cont -band 0xC0) -ne 0x80) { $isUtf8 = $false; break }
            }

            if (-not $isUtf8) { break }
            $i += $extra
        }

        $i++
    }

    if ($isAscii) {
        return [PSCustomObject]@{ Encoding = 'ASCII'; Confidence = 0.95 }
    }
    if ($isUtf8) {
        return [PSCustomObject]@{ Encoding = 'UTF-8'; Confidence = 0.60 }
    }
    return [PSCustomObject]@{ Encoding = 'UNKNOWN'; Confidence = $null }
}
