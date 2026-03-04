/**
 * @file scanner.js
 * Folder walking and file collection using Node.js built-in fs/promises.
 * No third-party dependencies.
 */

import { readdir, stat } from "fs/promises";
import { join, resolve } from "path";

/** Directories excluded from scanning by default (see SPEC §5). */
const EXCLUDED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "__pycache__",
  ".mypy_cache",
  ".tox",
  ".venv",
  "venv",
]);

/** Filenames excluded by default. */
const EXCLUDED_FILES = new Set(["Thumbs.db", "desktop.ini", ".DS_Store"]);

/** File extensions excluded by default. */
const EXCLUDED_EXTS = new Set([".pyc", ".pyo"]);

/**
 * @typedef {Object} ScanOptions
 * @property {boolean}        [recursive=false]      - Scan subdirectories.
 * @property {boolean}        [includeHidden=false]  - Include hidden files/folders.
 * @property {string[]|null}  [extensions=null]      - Restrict to these extensions (e.g. ['.txt']).
 * @property {number}         [minSize=0]            - Skip files below this byte count.
 * @property {number|null}    [maxSize=null]         - Skip files above this byte count.
 */

/**
 * Collect all files under `rootDir` that match the given options.
 *
 * @param {string}      rootDir - Directory to scan.
 * @param {ScanOptions} [opts]  - Filter options.
 * @returns {Promise<string[]>} Sorted array of absolute file paths.
 */
export async function collectFiles(rootDir, opts = {}) {
  const {
    recursive = false,
    includeHidden = false,
    extensions = null,
    minSize = 0,
    maxSize = null,
  } = opts;

  const absRoot = resolve(rootDir);

  const extSet = extensions
    ? new Set(
        extensions.map((e) =>
          e.startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`,
        ),
      )
    : null;

  const results = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (!recursive) continue;
        if (!includeHidden && entry.name.startsWith(".")) continue;
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      // Hidden files
      if (!includeHidden && entry.name.startsWith(".")) continue;

      // Excluded filenames
      if (EXCLUDED_FILES.has(entry.name)) continue;

      // Extension
      const dotIdx = entry.name.lastIndexOf(".");
      const ext = dotIdx >= 0 ? entry.name.slice(dotIdx).toLowerCase() : "";

      if (EXCLUDED_EXTS.has(ext)) continue;
      if (extSet && !extSet.has(ext)) continue;

      // Size filters
      if (minSize > 0 || maxSize !== null) {
        try {
          const info = await stat(fullPath);
          if (info.size < minSize) continue;
          if (maxSize !== null && info.size > maxSize) continue;
        } catch {
          // include anyway; detectFile will handle the error
        }
      }

      results.push(fullPath);
    }
  }

  await walk(absRoot);
  return results.sort();
}
