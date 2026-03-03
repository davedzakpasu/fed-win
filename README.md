### fed-win
# 🔍 File Encoding Detector

> Detect the character encoding of every file in a folder — your way.

This repository provides **four independent implementations** of the same tool, each targeting a different stack and user profile. Pick the one that fits your environment, workflow, or preference.

---

## What it does

Given a folder path, the tool:
- Recursively scans all files (or a single level, configurable)
- Detects the character encoding of each file (e.g. `UTF-8`, `ISO-8859-1`, `UTF-16`)
- Reports confidence scores where available
- Outputs results to the console and/or exports to CSV/JSON

---

## Implementations

| Variant | Stack | Best for | Folder |
|---|---|---|---|
| 🐍 **Python** | Python 3 + `chardet` | Scripting, automation, data pipelines | [`/python`](./python/) |
| ⚡ **PowerShell** | PowerShell 5.1+ | Windows-native, no install needed | [`/powershell`](./powershell/) |
| 🟩 **Node.js** | Node.js + `chardet` | JS devs, npm toolchains | [`/nodejs`](./nodejs/) |
| 🖥️ **Electron** | Electron + React | GUI users, non-technical audience | [`/electron`](./electron/) |

Each implementation lives in its own self-contained folder with its own `README.md`, install steps, and usage instructions.

---

## Shared Behavior (across all implementations)

All four variants conform to the same functional spec. See [`docs/SPEC.md`](./docs/SPEC.md) for details.

The short version:
- **Input**: a folder path (via argument, prompt, or GUI picker)
- **Output**: file path + detected encoding + confidence (where available)
- **Recursion**: optional, off by default
- **Export**: optional CSV or JSON output
- **Exclusions**: hidden files/folders (`.git`, `node_modules`, etc.) skipped by default

---

## Contributing

See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) to understand how to contribute to any of the four implementations.

---

## License

MIT — see [`LICENSE`](./LICENSE).