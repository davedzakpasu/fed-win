/**
 * @file scanner.js
 * File scanning and encoding detection — runs in the main process.
 * Direct fs access is intentional here (no renderer-side fs).
 */

import { readFile, stat, readdir } from 'fs/promises';
import { join, relative } from 'path';
import chardet from 'chardet';

const SAMPLE_SIZE = 65_536;

const EXCLUDED_DIRS  = new Set(['.git', '.hg', '.svn', 'node_modules', '__pycache__', '.mypy_cache', '.venv', 'venv']);
const EXCLUDED_FILES = new Set(['Thumbs.db', 'desktop.ini', '.DS_Store']);
const EXCLUDED_EXTS  = new Set(['.pyc', '.pyo']);

/**
 * @typedef {Object} ScanOptions
 * @property {boolean}       [recursive=false]
 * @property {boolean}       [includeHidden=false]
 * @property {string[]|null} [extensions=null]
 * @property {number}        [minSize=0]
 * @property {number|null}   [maxSize=null]
 */

/**
 * @typedef {Object} FileResult
 * @property {string}      path
 * @property {string|null} encoding
 * @property {number|null} confidence
 * @property {number}      sizeBytes
 * @property {string|null} error
 */

/**
 * Collect all matching files under rootDir.
 *
 * @param {string}      rootDir
 * @param {ScanOptions} opts
 * @returns {Promise<string[]>}
 */
async function collectFiles(rootDir, opts = {}) {
  const { recursive = false, includeHidden = false, extensions = null, minSize = 0, maxSize = null } = opts;

  const extSet = extensions
    ? new Set(extensions.map(e => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`)))
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
        if (!includeHidden && entry.name.startsWith('.')) continue;
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      // Hidden
      if (!includeHidden && entry.name.startsWith('.')) continue;

      // Excluded names / exts
      if (EXCLUDED_FILES.has(entry.name)) continue;
      const dotIdx = entry.name.lastIndexOf('.');
      const ext = dotIdx >= 0 ? entry.name.slice(dotIdx).toLowerCase() : '';
      if (EXCLUDED_EXTS.has(ext)) continue;
      if (extSet && !extSet.has(ext)) continue;

      // Size filter
      if (minSize > 0 || maxSize !== null) {
        try {
          const info = await stat(fullPath);
          if (info.size < minSize) continue;
          if (maxSize !== null && info.size > maxSize) continue;
        } catch {
          // include anyway, detectFile will handle error
        }
      }

      results.push(fullPath);
    }
  }

  await walk(rootDir);
  return results.sort();
}

/**
 * Detect the encoding of a single file.
 *
 * @param {string} filePath
 * @returns {Promise<FileResult>}
 */
async function detectFile(filePath) {
  let sizeBytes = 0;
  try {
    const info = await stat(filePath);
    sizeBytes = info.size;
  } catch (err) {
    return { path: filePath, encoding: null, confidence: null, sizeBytes: 0, error: err.message };
  }

  if (sizeBytes === 0) {
    return { path: filePath, encoding: 'EMPTY', confidence: null, sizeBytes: 0, error: null };
  }

  let buffer;
  try {
    const full = await readFile(filePath);
    buffer = full.subarray(0, SAMPLE_SIZE);
  } catch (err) {
    return { path: filePath, encoding: null, confidence: null, sizeBytes, error: err.message };
  }

  const detected = chardet.analyse(buffer);
  if (!detected || detected.length === 0) {
    return { path: filePath, encoding: 'UNKNOWN', confidence: null, sizeBytes, error: null };
  }

  const top = detected[0];
  return {
    path:       filePath,
    encoding:   top.name ? top.name.toUpperCase() : 'UNKNOWN',
    confidence: typeof top.confidence === 'number' ? top.confidence / 100 : null,
    sizeBytes,
    error:      null,
  };
}

/**
 * Scan a folder and stream results via a progress callback.
 *
 * @param {string}                      rootDir
 * @param {ScanOptions}                 opts
 * @param {(progress: object) => void}  onProgress  - Called per file.
 * @returns {Promise<{ results: FileResult[], duration: number }>}
 */
export async function scanFolder(rootDir, opts, onProgress) {
  const start = Date.now();
  const files = await collectFiles(rootDir, opts);
  const total = files.length;
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const result = await detectFile(files[i]);
    // Make path relative for display
    result.path = relative(rootDir, result.path);
    results.push(result);
    onProgress({ file: result.path, result, done: i + 1, total });
  }

  return { results, duration: Date.now() - start };
}
