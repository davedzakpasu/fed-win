# 📋 Functional Specification — File Encoding Detector

> Version: `1.0`
> Status: `Draft`
> Applies to: all four implementations (Python, PowerShell, Node.js, Electron)

---

## 1. Purpose

Detect the character encoding of files within a given directory. Results must be presented clearly and optionally exportable for downstream use.

---

## 2. Inputs

### 2.1 Folder path
- Provided as a **CLI argument**, **interactive prompt**, or **GUI folder picker** depending on the implementation.
- Must be an existing, readable directory. If invalid, the tool must exit with a clear error message.

### 2.2 Options / Flags

All implementations must support the following options (via CLI flags or GUI toggles):

| Option | Flag (CLI) | Default | Description |
|---|---|---|---|
| Recursive scan | `--recursive` / `-r` | `false` | Scan subdirectories |
| Output format | `--output` / `-o` | `console` | `console`, `csv`, or `json` |
| Output file | `--file` / `-f` | auto-named | Destination path for CSV/JSON export |
| Include hidden | `--hidden` | `false` | Include hidden files and system folders |
| File filter | `--ext` | none | Only scan files with given extension(s) |
| Min file size | `--min-size` | `0` | Skip files below N bytes |
| Max file size | `--max-size` | none | Skip files above N bytes |

---

## 3. Encoding Detection

### 3.1 Library per implementation

| Implementation | Detection library |
|---|---|
| Python | [`chardet`](https://pypi.org/project/chardet/) or [`charset-normalizer`](https://pypi.org/project/charset-normalizer/) |
| PowerShell | .NET `StreamReader` with `DetectEncodingFromByteOrderMarks` + custom BOM sniffing |
| Node.js | [`chardet`](https://www.npmjs.com/package/chardet) |
| Electron | Same as Node.js (`chardet`) |

### 3.2 Result fields

Each file in the result must include:

| Field | Type | Description |
|---|---|---|
| `path` | `string` | Absolute or relative path to the file |
| `encoding` | `string` | Detected encoding (e.g. `UTF-8`, `ISO-8859-1`) |
| `confidence` | `float \| null` | Confidence score between 0.0 and 1.0, or `null` if unavailable |
| `size_bytes` | `integer` | File size in bytes |
| `error` | `string \| null` | Error message if the file could not be read, else `null` |

### 3.3 Unreadable files

- Files that cannot be opened (permissions, binary-only, etc.) must **not crash** the tool.
- They must appear in results with `encoding: null` and a descriptive `error` field.

### 3.4 Detection scope

- Detection is performed on the **first 64 KB** of each file (sufficient for most encoding detection libraries).
- Files smaller than 4 bytes may return unreliable results — this should be noted in output.

---

## 4. Output

### 4.1 Console output

Tabular format, human-readable. Minimum columns: `File`, `Encoding`, `Confidence`.

Example:
```
File                          Encoding     Confidence
----------------------------  -----------  ----------
src/main.py                   UTF-8        99%
data/legacy.csv               ISO-8859-1   87%
notes/old.txt                 UTF-16       100%
README.md                     UTF-8        99%
broken.bin                    ERROR        —
```

### 4.2 CSV export

```
path,encoding,confidence,size_bytes,error
"src/main.py","UTF-8",0.99,4200,
"data/legacy.csv","ISO-8859-1",0.87,18500,
"broken.bin",,,320,"Permission denied"
```

### 4.3 JSON export

```json
[
  {
    "path": "src/main.py",
    "encoding": "UTF-8",
    "confidence": 0.99,
    "size_bytes": 4200,
    "error": null
  },
  {
    "path": "broken.bin",
    "encoding": null,
    "confidence": null,
    "size_bytes": 320,
    "error": "Permission denied"
  }
]
```

---

## 5. Excluded paths (default)

The following are skipped by default unless `--hidden` is passed:

- Any file or folder starting with `.` (e.g. `.git`, `.env`)
- `node_modules/`
- `__pycache__/`
- `*.pyc`, `*.pyo`
- System files: `Thumbs.db`, `desktop.ini`

---

## 6. Exit codes (CLI implementations)

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Invalid arguments |
| `2` | Folder not found or not accessible |
| `3` | Output file could not be written |

---

## 7. Performance expectations

| Files | Expected time |
|---|---|
| < 100 | < 1 second |
| 100 – 1,000 | < 5 seconds |
| 1,000 – 10,000 | < 30 seconds |

These are indicative targets on average hardware. Implementations may process files concurrently where idiomatic.

---

## 8. Out of scope (v1.0)

- Encoding **conversion** (this tool detects only)
- Network/remote paths
- Archives (`.zip`, `.tar`, etc.)
- Real-time folder watching