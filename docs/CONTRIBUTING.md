# 🤝 Contributing

Thanks for your interest in contributing! This project welcomes improvements to any of the four implementations.

---

## Before you start

- Read [`docs/SPEC.md`](./SPEC.md) — all variants must conform to it.
- Read [`docs/IMPLEMENTATION.md`](./IMPLEMENTATION.md) — it defines conventions per variant.
- Check open issues and pull requests to avoid duplicate work.

---

## How to contribute

### Reporting a bug
Open an issue with:
- Which variant is affected (`python`, `powershell`, `nodejs`, `electron`)
- Your OS and runtime version
- Steps to reproduce
- Expected vs actual behavior

### Suggesting a feature
Open an issue tagged `enhancement`. Describe:
- What you want the tool to do
- Which variant(s) it applies to (or all)
- Whether it requires a SPEC change

### Submitting a pull request
1. Fork the repo and create a branch: `feat/<variant>-<short-description>`
2. Make your changes — stay within your variant's folder unless touching shared docs
3. Add or update tests
4. Update the relevant `README.md` if behavior changes
5. Open a PR with a clear description and link to any related issue

---

## Scope rules

- Changes inside `/python`, `/powershell`, `/nodejs`, `/electron` are **variant-scoped** and only affect that implementation.
- Changes to `docs/SPEC.md` affect **all variants** and require discussion before merging.
- Do not introduce cross-variant dependencies or shared runtime code.

---

## Code style

Follow the conventions in [`docs/IMPLEMENTATION.md`](./IMPLEMENTATION.md) for your variant. In short:
- Python: PEP 8, `black`, type hints
- PowerShell: `Verb-Noun`, `[CmdletBinding()]`, `Write-Verbose`
- Node.js: ES modules, `async/await`, JSDoc
- Electron: functional React, Tailwind, IPC via contextBridge

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).