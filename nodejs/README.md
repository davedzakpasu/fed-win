# 🟩 File Encoding Detector — Node.js

Detect the character encoding of every file in a folder, from the command line. Powered by `chardet` and built for npm toolchains.

---

## Requirements

- Node.js `18+`
- npm `8+`
- Windows, macOS, or Linux

---

## Install

```bash
# Clone the repo and navigate to the nodejs folder
git clone https://github.com/your-org/file-encoding-detector.git
cd file-encoding-detector/nodejs

# Install dependencies
npm install

# Optional: install globally
npm install -g .
```

Or run without installing using `npx`:
```bash
npx file-encoding-detector <folder>
```

---

## Usage

```bash
node bin/detect.js <folder> [options]
# or, if installed globally:
detect-encoding <folder> [options]
```

### Examples

```bash
# Basic scan
node bin/detect.js C:\Users\me\documents

# Recursive scan
node bin/detect.js ./src --recursive

# Only scan .txt and .csv files
node bin/detect.js ./data --ext .txt .csv

# Export to CSV
node bin/detect.js ./data --output csv

# Export to a specific JSON file
node bin/detect.js ./project --recursive --output json --file results.json

# Adjust concurrency (default: 10)
node bin/detect.js ./large-folder --recursive --concurrency 20
```

---

## Options

| Flag | Short | Default | Description |
|---|---|---|---|
| `--recursive` | `-r` | off | Scan subdirectories |
| `--output <format>` | `-o` | `console` | Output format: `console`, `csv`, `json` |
| `--file <path>` | `-f` | auto | Destination file for CSV/JSON export |
| `--hidden` | | off | Include hidden files and system folders |
| `--ext <exts...>` | | all | Only scan files with given extension(s) |
| `--min-size <bytes>` | | `0` | Skip files smaller than N bytes |
| `--max-size <bytes>` | | none | Skip files larger than N bytes |
| `--concurrency <n>` | `-c` | `10` | Number of files to process in parallel |

---

## Example output

```
File                                                Encoding        Confidence    Size
--------------------------------------------------  --------------  ------------  ------------
src/main.py                                         UTF-8           99%                 4.1 KB
data/legacy.csv                                     ISO-8859-1      87%                18.1 KB
notes/utf16.txt                                     UTF-16-LE       100%                2.3 KB
README.md                                           UTF-8           99%                 1.2 KB
broken.bin                                          ERROR           ERROR              312 B
--------------------------------------------------  --------------  ------------  ------------

5 file(s) scanned. 1 error(s).
```

---

## Running tests

```bash
npm test
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

- Detection is based on the first 64 KB of each file.
- Files smaller than 4 bytes may produce unreliable results.
- `chardet` confidence scores are statistical estimates, not guarantees.
