/**
 * @file scanner.js
 * Folder walking and file collection using fast-glob.
 */

import { stat } from 'fs/promises';
import { resolve, relative } from 'path';
import fg from 'fast-glob';

/** Directories excluded from scanning by default (see SPEC §5). */
const EXCLUDED_DIRS = new Set([
  '.git', '.hg', '.svn', 'node_modules', '__pycache__',
  '.mypy_cache', '.tox', '.venv', 'venv',
]);

/** Filenames excluded by default. */
const EXCLUDED_FILES = new Set(['Thumbs.db', 'desktop.ini', '.DS_Store']);

/** File extensions excluded by default. */
const EXCLUDED_EXTS = new Set(['.pyc', '.pyo']);

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

  // Build fast-glob pattern
  const depth = recursive ? Infinity : 1;
  const pattern = recursive ? '**/*' : '*';

  const extSet = extensions
    ? new Set(extensions.map(e => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`)))
    : null;

  // fast-glob options
  const entries = await fg(pattern, {
    cwd: absRoot,
    onlyFiles: true,
    dot: includeHidden,           // dot=true includes hidden files
    deep: depth,
    followSymbolicLinks: false,
    absolute: true,
  });

  // Apply remaining filters
  const filtered = [];

  for (const filePath of entries) {
    const relParts = relative(absRoot, filePath).split(/[\\/]/);

    // Skip excluded directories anywhere in the path
    if (relParts.slice(0, -1).some(part => EXCLUDED_DIRS.has(part))) continue;

    // Skip hidden dirs in path (when includeHidden is false)
    if (!includeHidden && relParts.slice(0, -1).some(p => p.startsWith('.'))) continue;

    const filename = relParts[relParts.length - 1];

    // Skip excluded filenames
    if (EXCLUDED_FILES.has(filename)) continue;

    // Get extension
    const dotIdx = filename.lastIndexOf('.');
    const ext = dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : '';

    // Skip excluded extensions
    if (EXCLUDED_EXTS.has(ext)) continue;

    // Apply extension filter
    if (extSet && !extSet.has(ext)) continue;

    // Apply size filters
    if (minSize > 0 || maxSize !== null) {
      try {
        const info = await stat(filePath);
        if (info.size < minSize) continue;
        if (maxSize !== null && info.size > maxSize) continue;
      } catch {
        // Include the file anyway; detector will handle the error
      }
    }

    filtered.push(filePath);
  }

  return filtered.sort();
}
