# ⚡ File Encoding Detector — PowerShell

Detect the character encoding of every file in a folder. No installs required — runs on any Windows machine with PowerShell 5.1+.

---

## Requirements

- PowerShell `5.1+` (built into Windows 10/11)
- No external dependencies
- No admin privileges required

---

## Usage

```powershell
.\Detect-FileEncoding.ps1 -Folder <path> [options]
```

> **First run:** If you get an execution policy error, run:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

### Examples

```powershell
# Basic scan
.\Detect-FileEncoding.ps1 -Folder "C:\Users\me\documents"

# Recursive scan
.\Detect-FileEncoding.ps1 -Folder .\src -Recursive

# Only scan .txt and .log files
.\Detect-FileEncoding.ps1 -Folder .\logs -Ext .txt,.log

# Export to CSV
.\Detect-FileEncoding.ps1 -Folder .\data -Output csv

# Export to a specific JSON file
.\Detect-FileEncoding.ps1 -Folder .\project -Recursive -Output json -File results.json

# Preview what would be exported (dry run)
.\Detect-FileEncoding.ps1 -Folder .\data -Output csv -WhatIf
```

---

## Options

| Parameter | Default | Description |
|---|---|---|
| `-Folder` | *(required)* | Path to the folder to scan |
| `-Recursive` | off | Scan subdirectories |
| `-Output` | `console` | Output format: `console`, `csv`, `json` |
| `-File` | auto | Destination file for CSV/JSON export |
| `-Hidden` | off | Include hidden files and system folders |
| `-Ext` | all | Only scan files with given extension(s) |
| `-MinSize` | `0` | Skip files smaller than N bytes |
| `-MaxSize` | `0` (no limit) | Skip files larger than N bytes |
| `-Verbose` | off | Show per-file detection method used |
| `-WhatIf` | off | Preview export without writing files |

---

## Example output

```
File                                                Encoding        Confidence    Size
--------------------------------------------------  --------------  ------------  ------------
src\main.py                                         ASCII           95%                 4.1 KB
data\legacy.csv                                     ISO-8859-1      80%                18.1 KB
notes\utf16.txt                                     UTF-16-LE       100%                2.3 KB
README.md                                           ASCII           95%                 1.2 KB
broken.bin                                          ERROR           ERROR              312 B
--------------------------------------------------  --------------  ------------  ------------

5 file(s) scanned. 1 error(s).
```

---

## Detection method

PowerShell uses a three-tier strategy (no third-party libraries needed):

1. **BOM inspection** — checks the first bytes for known byte order marks. Confidence: 100%.
2. **.NET StreamReader** — uses .NET's built-in encoding detection. Confidence: ~80%.
3. **Heuristic** — classifies content as ASCII, UTF-8, or unknown based on byte patterns. Confidence: ~60–95%.

> ⚠️ Without a BOM, confidence scores are coarser than the Python/Node.js variants which use `chardet`.

---

## Running tests

Requires [Pester v5](https://pester.dev/):

```powershell
Install-Module -Name Pester -Force -Scope CurrentUser
Invoke-Pester -Path .\tests\ -Output Detailed
```

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Invalid arguments |
| `2` | Folder not found or not accessible |
| `3` | Output file could not be written |

---

## Known limitations

- Confidence scores are coarser than `chardet`-based variants (Python/Node.js).
- Files without a BOM that are not pure ASCII may be misidentified — use Python or Node.js variants when high accuracy is required.
- PowerShell 5.1's `ConvertTo-Json` has limited depth; complex nested structures are flattened (not a concern for this tool's output).
