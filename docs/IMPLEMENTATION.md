# 🏗️ Implementation Guidelines

> This document defines how each of the four variants should be structured, coded, and maintained.
> All implementations must conform to [`SPEC.md`](./SPEC.md) for behavior.
> This document covers **how to build**, not what to build.

---

## General Principles (all variants)

1. **Self-contained** — each variant lives in its own folder and can be used independently.
2. **No shared runtime code** — variants do not import from each other.
3. **Minimal dependencies** — only add a dependency if it genuinely simplifies the core problem.
4. **Fail gracefully** — never crash on a single bad file; log the error and continue.
5. **Readable code** — prioritize clarity over cleverness. This is a reference tool.
6. **Consistent output** — all variants produce structurally identical results (see SPEC §4).

---

## 🐍 Python

### Environment
- Python `3.9+`
- Package manager: `pip` (a `requirements.txt` must be provided)
- Virtual environment recommended but not required

### Dependencies
| Package | Purpose |
|---|---|
| `chardet` | Encoding detection |
| `charset-normalizer` | Optional alternative/fallback |

### File structure
```
python/
├── README.md
├── requirements.txt
├── detect.py          # Main entry point
└── lib/
    ├── scanner.py     # Folder walking & file reading
    ├── detector.py    # Encoding detection wrapper
    └── exporter.py    # CSV/JSON/console output
```

### Code conventions
- Use `argparse` for CLI arguments
- Use `pathlib.Path` — not `os.path`
- Use type hints throughout
- Follow PEP 8; format with `black` (line length 100)
- Docstrings on all public functions (Google style)

### Error handling
- Catch `OSError`, `PermissionError`, `UnicodeDecodeError` per file
- Propagate unexpected errors (don't silence them silently)

---

## ⚡ PowerShell

### Environment
- PowerShell `5.1+` (ships with Windows 10/11)
- No external dependencies required
- Must work without elevated (admin) privileges

### Detection strategy
Since PowerShell has no third-party encoding library equivalent, use a layered approach:
1. **BOM detection** — check the first bytes for known byte order marks (UTF-8 BOM, UTF-16 LE/BE, UTF-32)
2. **.NET fallback** — use `[System.IO.StreamReader]` with `detectEncodingFromByteOrderMarks = $true`
3. **Heuristic fallback** — for files without BOM, attempt to classify as ASCII, UTF-8 (valid multi-byte), or binary

> ⚠️ PowerShell cannot match the confidence scoring of `chardet`. Confidence output is coarse:
> `BOM` → 100%, `.NET detected` → ~80%, `heuristic` → ~60%, `unknown` → null.

### File structure
```
powershell/
├── README.md
├── Detect-FileEncoding.ps1     # Main script
└── lib/
    ├── Get-FileEncoding.ps1    # Detection logic
    └── Export-Results.ps1      # Output formatting
```

### Code conventions
- Use `[CmdletBinding()]` and `param()` blocks with proper types
- Use `Verb-Noun` naming for all functions
- Support `-WhatIf` on destructive operations (e.g. file overwrite)
- Use `Write-Verbose` for debug-level output
- Use `Write-Error` for non-terminating errors; `throw` for terminating ones
- Comment all non-obvious logic

### Compatibility
- Must run on PowerShell 5.1 (Windows built-in) without modification
- PowerShell 7+ compatibility is a bonus, not a requirement

---

## 🟩 Node.js

### Environment
- Node.js `18+`
- Package manager: `npm` (a `package.json` must be provided)
- Designed to be installed globally via `npm install -g` or run via `npx`

### Dependencies
| Package | Purpose |
|---|---|
| `chardet` | Encoding detection |
| `commander` | CLI argument parsing |
| `chalk` | Terminal color output |
| `fast-glob` | Fast recursive file globbing |

### File structure
```
nodejs/
├── README.md
├── package.json
├── bin/
│   └── detect.js       # CLI entry point (shebang)
└── lib/
    ├── scanner.js      # Folder walking
    ├── detector.js     # Encoding detection wrapper
    └── exporter.js     # Output formatting
```

### Code conventions
- Use ES modules (`"type": "module"` in `package.json`)
- Use `async/await` — no raw callbacks
- Process files concurrently using `Promise.all` with a concurrency limit (default: 10)
- Use JSDoc comments on all exported functions
- Follow Standard JS style (or ESLint with `eslint:recommended`)

### CLI entry
- Add `"bin"` to `package.json` for `npx` support
- Shebang: `#!/usr/bin/env node`

---

## 🖥️ Electron + React

### Environment
- Node.js `18+`
- Electron `28+`
- React `18+`
- Build tool: `Vite` with `electron-vite`

### Dependencies
| Package | Purpose |
|---|---|
| `chardet` | Encoding detection (Node.js side) |
| `react` | UI framework |
| `electron` | Desktop shell |
| `electron-vite` | Build toolchain |
| `tailwindcss` | Styling |

### Architecture
Electron's **main/renderer process split** must be respected:
- **Main process** (`src/main/`): file system access, encoding detection, IPC handlers
- **Renderer process** (`src/renderer/`): React UI, no direct `fs` access
- **Preload** (`src/preload/`): exposes a safe IPC bridge via `contextBridge`

```
electron/
├── README.md
├── package.json
├── electron.vite.config.js
└── src/
    ├── main/
    │   ├── index.js        # Electron app entry
    │   ├── scanner.js      # File scanning + detection
    │   └── ipc.js          # IPC handler registration
    ├── preload/
    │   └── index.js        # contextBridge exposure
    └── renderer/
        ├── index.html
        └── src/
            ├── App.jsx
            ├── main.jsx
            └── components/
                ├── FolderPicker.jsx
                ├── ResultsTable.jsx
                ├── FilterBar.jsx
                └── ExportButton.jsx
```

### IPC API surface (main ↔ renderer)

| Channel | Direction | Payload | Response |
|---|---|---|---|
| `scan:start` | renderer → main | `{ path, options }` | — |
| `scan:progress` | main → renderer | `{ file, result, total, done }` | — |
| `scan:complete` | main → renderer | `{ results, duration }` | — |
| `scan:error` | main → renderer | `{ message }` | — |
| `export:csv` | renderer → main | `{ results, filePath }` | `{ success, error }` |
| `export:json` | renderer → main | `{ results, filePath }` | `{ success, error }` |

### UI requirements
- Folder picker using Electron's native `dialog.showOpenDialog`
- Results shown in a **virtualized table** (use `@tanstack/react-virtual` if list > 500 rows)
- Progress indicator during scan
- Filters: by encoding, by confidence threshold, by file extension
- Export button available once results are loaded
- Must be usable at `1280×720` minimum window size

### Code conventions
- React components: functional + hooks only
- No Redux; use React context for shared state if needed
- Tailwind for all styling (no CSS modules)
- ESLint + Prettier enforced

---

## 🔄 Shared Guidelines

### Git conventions

- Branch naming: `feat/<variant>-<description>`, `fix/<variant>-<description>`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  ```
  feat(python): add --ext filter flag
  fix(electron): handle permission errors in IPC
  docs: update SPEC with size limits
  ```

### Testing

Each variant should include at minimum:
- A `tests/` folder (or equivalent)
- Tests covering: valid UTF-8 file, ISO-8859-1 file, empty file, unreadable file, recursive scan
- PowerShell: use `Pester`; Python: use `pytest`; Node.js + Electron: use `vitest` or `jest`

### README per variant

Each `/<variant>/README.md` must include:
1. One-line description
2. Requirements (runtime version, OS)
3. Install steps
4. Usage with examples
5. All supported flags/options (table)
6. Example output
7. Known limitations