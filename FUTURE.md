# 🗺️ Future Features

A living reference of planned and potential features. Not a commitment — a thinking tool.
Items are grouped by theme and tagged by variant where applicable.

---

## 🔒 Security & Distribution

### Code signing `[electron]`
Sign the Windows `.exe` and macOS `.dmg` so users don't see security warnings on install.
- **Windows**: requires an EV or OV certificate from a CA (e.g. DigiCert, Sectigo). Configure in `electron-builder` via `win.certificateFile` + `win.certificatePassword` as GitHub secrets.
- **macOS**: requires an Apple Developer ID certificate. Configure via `mac.identity` + `CSC_LINK` / `CSC_KEY_PASSWORD` secrets. Also requires notarization via `afterSign` hook.
- **Impact**: eliminates "Windows protected your PC" and "unidentified developer" warnings for end users.

### Auto-update `[electron]`
Notify users in-app when a new version is available and offer a one-click update.
- Use `electron-updater` (ships with `electron-builder`).
- Requires a `publish` config pointing to GitHub Releases (already set up).
- Add an `UpdateNotifier` component in the renderer that listens to `autoUpdater` IPC events.
- **Impact**: users always run the latest version without manually downloading.

---

## 🖥️ Electron UX

### Cancel button
Allow users to stop a scan mid-way on large folders.
- Add a `scan:cancel` IPC channel.
- Main process checks a cancellation flag between file detections.

### Copy to clipboard on row click
Click any row in the results table to copy the file path to the clipboard.
- Use Electron's `clipboard` API via IPC or expose via `contextBridge`.

### Column resizing
Allow users to drag column borders to resize them in the results table.

### Persistent preferences
Remember the last used folder, recursive toggle, and extension filter between sessions.
- Use `electron-store` for persistent key-value storage.

### Dark / light theme toggle
Add a theme switcher in the toolbar. Currently dark only.

---

## 🖥️ CLI (all variants)

### `--output json` to stdout (piping support)
When `--output json` is used without `--file`, write JSON to stdout instead of a file.
Enables piping: `detect . --output json | jq '.[] | select(.encoding != "UTF-8")'`
- **Applies to**: Python, Node.js (PowerShell already supports pipeline output natively)

### `--encoding` filter flag
Only report files that match a specific encoding.
Example: `detect . --recursive --encoding ISO-8859-1`
Useful for finding files that need conversion.

### `--summary` flag
Print only a summary (encoding → file count) instead of the full file list.
Example output:
```
UTF-8        142 files
ISO-8859-1    18 files
ASCII         34 files
UNKNOWN        3 files
```

### Progress bar in CLI
Show a live progress bar during large scans (Python: `tqdm`, Node.js: `cli-progress`).

---

## 🔍 Detection

### Encoding conversion
After detection, optionally convert files to a target encoding (e.g. all to UTF-8).
- Out of scope for v1 (detection only) but a natural v2 feature.
- **Applies to**: all variants.

### Archive support
Scan inside `.zip`, `.tar.gz` archives without extracting.
- Python: `zipfile` / `tarfile` stdlib modules.
- Node.js: `yauzl` or `tar-stream`.

### Real-time folder watching
Watch a folder for new/changed files and re-scan automatically.
- Python: `watchdog`
- Node.js: `chokidar`
- Electron: surface as a "watch mode" toggle in the GUI.

### Confidence threshold warnings
Flag files where confidence is below a configurable threshold (e.g. < 50%) as "uncertain" in the output.

---

## 📦 Distribution

### `brew` formula `[macos]`
Publish a Homebrew formula for the Python and Node.js variants so macOS users can install with `brew install file-encoding-detector`.

### `winget` / `choco` package `[windows]`
Publish the Electron installer to `winget` and/or Chocolatey for one-line Windows installs.

### `npm` global package `[nodejs]`
Publish to npm so users can run `npx file-encoding-detector <folder>` without cloning the repo.
- Package name: `file-encoding-detector`
- Add a `prepublishOnly` script to run tests before publishing.

### Docker image
A minimal Docker image for the Python variant, useful for CI pipelines.
```dockerfile
FROM python:3.12-slim
RUN pip install chardet
COPY . /app
ENTRYPOINT ["python", "/app/python/detect.py"]
```

---

## 📖 Docs

### `CHANGELOG.md` automation
Use `semantic-release` or `git-cliff` to auto-generate changelog entries from Conventional Commits on each release.

### Website / docs site
A simple GitHub Pages site (`docs/` folder or `gh-pages` branch) with usage examples, screenshots, and a comparison table of the four variants.

---

## 🧪 Testing

### Cross-encoding test fixtures
A `tests/fixtures/` folder with real sample files in various encodings (UTF-8, UTF-16 LE/BE, ISO-8859-1, Shift-JIS, Windows-1252, etc.) shared across all four variants for consistent regression testing.

### Performance benchmarks
A benchmark script that scans a large folder (1,000+ files) and reports scan time per variant, so regressions can be caught early.
