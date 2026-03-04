# 🚀 Release Guide

Releases are automated via GitHub Actions. Pushing a version tag triggers the Electron workflow to build, package, and publish installers for Windows, macOS, and Linux.

---

## How to cut a release

### 1. Update the version number

In `electron/package.json`, bump the `version` field:

```json
"version": "1.1.0"
```

Commit it:

```bash
git add electron/package.json
git commit -m "chore: bump version to 1.1.0"
```

### 2. Push a version tag

```bash
git tag v1.1.0
git push origin v1.1.0
```

This triggers the `release` job in `.github/workflows/electron.yml`.

### 3. What happens automatically

The CI will:
1. Build the app with `electron-vite build`
2. Package it with `electron-builder` on all three platforms:
   - **Windows** → `.exe` installer (NSIS)
   - **macOS** → `.dmg`
   - **Linux** → `.AppImage`
3. Create a GitHub Release at `https://github.com/davedzakpasu/fed-win/releases`
4. Attach all three installers as release assets

### 4. Add release notes

Once the release is created, go to:
`https://github.com/davedzakpasu/fed-win/releases`

Edit the release to add a changelog. Suggested format:

```markdown
## What's new in v1.1.0

### Added
- ...

### Fixed
- ...

### Changed
- ...
```

---

## Icons (required before first release)

`electron-builder` expects icons at these paths inside `electron/`:

| File | Size | Used for |
|---|---|---|
| `resources/icon.ico` | 256x256 | Windows |
| `resources/icon.icns` | 512x512 | macOS |
| `resources/icon.png` | 512x512 | Linux |

If icons are missing, the build will use Electron's default icon. To generate all three from a single PNG, use [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder):

```bash
npx electron-icon-builder --input=resources/icon.png --output=resources/
```

---

## Versioning convention

This project follows [Semantic Versioning](https://semver.org/):

- `MAJOR` — breaking changes to CLI flags or output format
- `MINOR` — new features, new flags, new output options
- `PATCH` — bug fixes, dependency updates, docs