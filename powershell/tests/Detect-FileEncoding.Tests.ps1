# tests/Detect-FileEncoding.Tests.ps1
# Pester v5 tests for the PowerShell implementation.
#
# Run with:
#   Invoke-Pester -Path .\tests\ -Output Detailed

#Requires -Version 5.1

BeforeAll {
    $libPath = Join-Path $PSScriptRoot '..\lib'
    . (Join-Path $libPath 'Get-FileEncoding.ps1')
    . (Join-Path $libPath 'Export-Results.ps1')
}

# ---------------------------------------------------------------------------
# Get-FileEncoding tests
# ---------------------------------------------------------------------------

Describe 'Get-FileEncoding' {

    BeforeAll {
        $testDir = Join-Path $TestDrive 'files'
        New-Item -Path $testDir -ItemType Directory | Out-Null
    }

    It 'detects UTF-8 BOM' {
        $path = Join-Path $testDir 'utf8bom.txt'
        # Write UTF-8 BOM manually: EF BB BF
        $bytes = [byte[]]@(0xEF, 0xBB, 0xBF) + [System.Text.Encoding]::UTF8.GetBytes('Hello world')
        [System.IO.File]::WriteAllBytes($path, $bytes)

        $result = Get-FileEncoding -FilePath $path
        $result.Encoding   | Should -Be 'UTF-8-BOM'
        $result.Confidence | Should -Be 1.0
        $result.Error      | Should -BeNullOrEmpty
    }

    It 'detects UTF-16 LE BOM' {
        $path = Join-Path $testDir 'utf16le.txt'
        $bytes = [byte[]]@(0xFF, 0xFE) + [System.Text.Encoding]::Unicode.GetBytes('Hello')
        [System.IO.File]::WriteAllBytes($path, $bytes)

        $result = Get-FileEncoding -FilePath $path
        $result.Encoding   | Should -Be 'UTF-16-LE'
        $result.Confidence | Should -Be 1.0
    }

    It 'detects UTF-16 BE BOM' {
        $path = Join-Path $testDir 'utf16be.txt'
        $bytes = [byte[]]@(0xFE, 0xFF) + [System.Text.Encoding]::BigEndianUnicode.GetBytes('Hello')
        [System.IO.File]::WriteAllBytes($path, $bytes)

        $result = Get-FileEncoding -FilePath $path
        $result.Encoding   | Should -Be 'UTF-16-BE'
        $result.Confidence | Should -Be 1.0
    }

    It 'detects ASCII heuristically' {
        $path = Join-Path $testDir 'ascii.txt'
        [System.IO.File]::WriteAllText($path, 'Plain ASCII only, no special chars.')

        $result = Get-FileEncoding -FilePath $path
        $result.Encoding | Should -Be 'ASCII'
        $result.Error    | Should -BeNullOrEmpty
    }

    It 'handles empty file gracefully' {
        $path = Join-Path $testDir 'empty.txt'
        New-Item -Path $path -ItemType File | Out-Null

        $result = Get-FileEncoding -FilePath $path
        $result.Encoding   | Should -Be 'EMPTY'
        $result.Error      | Should -BeNullOrEmpty
        $result.SizeBytes  | Should -Be 0
    }

    It 'handles non-existent file gracefully' {
        $path = Join-Path $testDir 'does_not_exist.txt'

        $result = Get-FileEncoding -FilePath $path
        $result.Encoding | Should -BeNullOrEmpty
        $result.Error    | Should -Not -BeNullOrEmpty
    }

    It 'reports size in bytes' {
        $path = Join-Path $testDir 'sized.txt'
        $content = 'A' * 500
        [System.IO.File]::WriteAllText($path, $content)

        $result = Get-FileEncoding -FilePath $path
        $result.SizeBytes | Should -BeGreaterThan 0
    }
}

# ---------------------------------------------------------------------------
# Test-BOM helper tests
# ---------------------------------------------------------------------------

Describe 'Test-BOM' {

    It 'returns UTF-8-BOM for EF BB BF' {
        $buf = [byte[]]@(0xEF, 0xBB, 0xBF, 0x41)
        Test-BOM -Buffer $buf | Should -Be 'UTF-8-BOM'
    }

    It 'returns UTF-16-LE for FF FE' {
        $buf = [byte[]]@(0xFF, 0xFE, 0x41, 0x00)
        Test-BOM -Buffer $buf | Should -Be 'UTF-16-LE'
    }

    It 'returns UTF-16-BE for FE FF' {
        $buf = [byte[]]@(0xFE, 0xFF, 0x00, 0x41)
        Test-BOM -Buffer $buf | Should -Be 'UTF-16-BE'
    }

    It 'returns null for no BOM' {
        $buf = [byte[]]@(0x48, 0x65, 0x6C, 0x6C, 0x6F)  # 'Hello'
        Test-BOM -Buffer $buf | Should -BeNullOrEmpty
    }
}

# ---------------------------------------------------------------------------
# Export tests
# ---------------------------------------------------------------------------

Describe 'Export-ResultsCsv' {

    It 'writes a CSV file with expected columns' {
        $outPath = Join-Path $TestDrive 'out.csv'
        $results = @(
            [PSCustomObject]@{ Path = 'C:\test\a.txt'; Encoding = 'UTF-8'; Confidence = 0.99; SizeBytes = 100; Error = $null },
            [PSCustomObject]@{ Path = 'C:\test\b.txt'; Encoding = $null;    Confidence = $null; SizeBytes = 50;  Error = 'Access denied' }
        )

        Export-ResultsCsv -Results $results -OutputPath $outPath -RootPath 'C:\test'

        $outPath | Should -Exist
        $content = Get-Content $outPath -Raw
        $content | Should -Match 'UTF-8'
        $content | Should -Match 'Access denied'
    }
}

Describe 'Export-ResultsJson' {

    It 'writes a valid JSON file' {
        $outPath = Join-Path $TestDrive 'out.json'
        $results = @(
            [PSCustomObject]@{ Path = 'C:\test\a.txt'; Encoding = 'UTF-8'; Confidence = 0.99; SizeBytes = 100; Error = $null }
        )

        Export-ResultsJson -Results $results -OutputPath $outPath -RootPath 'C:\test'

        $outPath | Should -Exist
        $data = Get-Content $outPath -Raw | ConvertFrom-Json
        $data[0].encoding | Should -Be 'UTF-8'
    }
}
