# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-04

### Added
- 🐍 **Python** implementation — CLI with `chardet`, recursive scan, CSV/JSON export
- ⚡ **PowerShell** implementation — no-install CLI with BOM + .NET + heuristic detection
- 🟩 **Node.js** implementation — CLI with `chardet`, concurrent processing, `npx` support
- 🖥️ **Electron** implementation — desktop GUI with folder picker, filters, sortable table, confidence bars, CSV/JSON export
- Shared functional spec (`docs/SPEC.md`)
- Implementation guidelines (`docs/IMPLEMENTATION.md`)
- Contributing guide (`docs/CONTRIBUTING.md`)
- Release guide (`RELEASE.md`)
- GitHub Actions CI for all four variants
- Automated release pipeline triggered on GitHub Release creation
- README badges — CI status, latest release, download count, runtime versions

### Fixed
- PowerShell: `$results` wrapped in `@()` to fix PS 5.1 array coercion bug
- PowerShell: replaced Unicode characters (`…`, `→`, `—`) with ASCII equivalents for PS 5.1 terminal compatibility
- Node.js: removed `fast-glob` dependency, replaced with Node.js built-in `fs/promises`
- Node.js: replaced `jest` with `vitest`, eliminating legacy transitive dependencies
- Node.js + Electron: fixed double dot in auto-generated export filenames
- Electron: patched 9 npm vulnerabilities by upgrading `electron`, `electron-builder`, `electron-vite`, and `vite`
- Electron: added missing `tailwind.config.js` and `postcss.config.js` to fix Tailwind CSS not loading
- Python: fixed `UnicodeEncodeError` in ISO-8859-1 test caused by em dash character

---

<!-- next release will be added above this line -->