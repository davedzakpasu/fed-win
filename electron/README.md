# 🖥️ File Encoding Detector — Electron

A desktop GUI to detect character encodings of files in a folder. Built with Electron + React + Tailwind.

---

## Requirements

- Node.js `18+`
- npm `8+`
- Windows 10/11, macOS, or Linux

---

## Install & run (development)

```bash
git clone https://github.com/your-org/file-encoding-detector.git
cd file-encoding-detector/electron

npm install
npm run dev
```

---

## Build a distributable

```bash
npm run build     # Compile with electron-vite
npm run package   # Package with electron-builder → dist/
```

Outputs:
- **Windows**: `.exe` installer (NSIS) in `dist/`
- **macOS**: `.dmg` in `dist/`
- **Linux**: `.AppImage` in `dist/`

---

## Features

- 📂 Native folder picker dialog
- 🔁 Optional recursive scan
- 🔍 Filter results by encoding, confidence threshold, or filename search
- 📊 Sortable results table (click any column header)
- 📈 Per-file confidence visualised as a coloured progress bar
- 💾 Export to CSV or JSON via native save dialog
- ⚡ Live progress bar during scan

---

## Architecture

The app follows Electron's main/renderer process split:

```
Main process  →  file system access, chardet detection, IPC handlers
Preload       →  contextBridge exposes a safe window.api interface
Renderer      →  React UI, zero direct fs access
```

### IPC channels

| Channel | Direction | Description |
|---|---|---|
| `scan:start` | renderer → main | Start folder scan |
| `scan:progress` | main → renderer | Per-file progress update |
| `scan:complete` | main → renderer | Scan finished with full results |
| `scan:error` | main → renderer | Scan failed |
| `export:csv` | renderer → main | Write CSV file |
| `export:json` | renderer → main | Write JSON file |
| `dialog:openFolder` | renderer → main | Open native folder picker |
| `dialog:saveFile` | renderer → main | Open native save dialog |

---

## Known limitations

- Detection is based on the first 64 KB of each file.
- Files smaller than 4 bytes may produce unreliable results.
- Very large folders (10,000+ files) may take 30+ seconds. A cancel button is not implemented in v1.0.