# 🐍 File Encoding Detector — Python

Detect the character encoding of every file in a folder, from the command line.

---

## Requirements

- Python `3.9+`
- Works on Windows, macOS, and Linux

---

## Install

```bash
# 1. Clone the repo (or download just this folder)
git clone https://github.com/your-org/file-encoding-detector.git
cd file-encoding-detector/python

# 2. (Recommended) Create a virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Usage

```bash
python detect.py <folder> [options]
```

### Examples

```bash
# Basic scan of a folder
python detect.py C:\Users\me\documents

# Recursive scan
python detect.py ./src --recursive

# Only scan .txt and .csv files
python detect.py ./data --ext .txt .csv

# Export results to JSON
python detect.py ./project --recursive --output json

# Export to a specific file
python detect.py ./project --output csv --file results.csv
```

---

## Options

| Flag | Short | Default | Description |
|---|---|---|---|
| `--recursive` | `-r` | off | Scan subdirectories |
| `--output` | `-o` | `console` | Output format: `console`, `csv`, `json` |
| `--file` | `-f` | auto | Output file path for CSV/JSON |
| `--hidden` | | off | Include hidden files and system folders |
| `--ext` | | all | Only scan files with given extension(s) |
| `--min-size` | | `0` | Skip files smaller than N bytes |
| `--max-size` | | none | Skip files larger than N bytes |

---

## Example output

```
File                                Encoding        Confidence    Size
--------------------------------------------------  --------------  ------------  ------------
src/main.py                         UTF-8           99%                  4.1 KB
data/legacy.csv                     ISO-8859-1      87%                 18.1 KB
notes/old_notes.txt                 UTF-16          100%                 2.3 KB
README.md                           UTF-8           99%                  1.2 KB
broken.bin                          ERROR           ERROR               312 B
--------------------------------------------------  --------------  ------------  ------------

5 file(s) scanned. 1 error(s).
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

## Running tests

```bash
pip install pytest
pytest tests/ -v
```

---

## Known limitations

- Detection is based on the first 64 KB of each file. Very large files with unusual encodings in later sections may not be detected correctly.
- The PowerShell variant offers more reliable BOM detection on Windows. Consider using it if BOM accuracy is critical.
- Files smaller than 4 bytes may return unreliable results.
- Confidence scores come from `chardet` and reflect statistical likelihood, not certainty.
