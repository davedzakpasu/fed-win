/**
 * @file exporter.js
 * Output formatting: console table, CSV, and JSON export.
 */

import { writeFile } from "fs/promises";
import { relative } from "path";

// Column widths for console output
const COL_FILE = 50;
const COL_ENC = 14;
const COL_CONF = 12;
const COL_SIZE = 12;

/**
 * Format a confidence score as a percentage string.
 * @param {import('./detector.js').DetectionResult} result
 * @returns {string}
 */
function fmtConfidence(result) {
  if (result.error) return "ERROR";
  if (result.confidence === null) return "—";
  return `${Math.round(result.confidence * 100)}%`;
}

/**
 * Format byte count as human-readable size.
 * @param {number} bytes
 * @returns {string}
 */
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * Truncate a string to fit within `width` characters, with a leading ellipsis.
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function truncate(text, width) {
  if (text.length <= width) return text;
  return "\u2026" + text.slice(-(width - 1));
}

/**
 * Pad or truncate a string to an exact width (left-aligned).
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function padEnd(text, width) {
  return text.slice(0, width).padEnd(width);
}

/**
 * Print detection results as a formatted table to stdout.
 *
 * @param {import('./detector.js').DetectionResult[]} results
 * @param {string} rootDir - Scanned root directory for relative paths.
 * @param {object} [chalk]  - Optional chalk instance for colour output.
 */
export function printConsole(results, rootDir, chalk) {
  const c = chalk;

  const header = [
    padEnd("File", COL_FILE),
    padEnd("Encoding", COL_ENC),
    padEnd("Confidence", COL_CONF),
    "Size".padStart(COL_SIZE),
  ].join("  ");

  const sep = [
    "-".repeat(COL_FILE),
    "-".repeat(COL_ENC),
    "-".repeat(COL_CONF),
    "-".repeat(COL_SIZE),
  ].join("  ");

  console.log(c ? c.bold(header) : header);
  console.log(sep);

  for (const r of results) {
    const rel = relative(rootDir, r.path) || r.path;
    const file = truncate(rel, COL_FILE);
    const enc = r.error ? "ERROR" : (r.encoding ?? "unknown");
    const conf = fmtConfidence(r);
    const size = fmtSize(r.sizeBytes);

    const line = [
      padEnd(file, COL_FILE),
      padEnd(enc, COL_ENC),
      padEnd(conf, COL_CONF),
      size.padStart(COL_SIZE),
    ].join("  ");

    if (r.error && c) {
      console.log(c.red(line));
    } else {
      console.log(line);
    }
  }

  const errorCount = results.filter((r) => r.error).length;
  console.log(sep);
  console.log("");
  const summary = `${results.length} file(s) scanned. ${errorCount} error(s).`;
  console.log(c ? c.dim(summary) : summary);
}

/**
 * Write results to a CSV file.
 *
 * @param {import('./detector.js').DetectionResult[]} results
 * @param {string} outputPath - Destination file path.
 * @param {string} rootDir    - Scanned root directory for relative paths.
 */
export async function exportCsv(results, outputPath, rootDir) {
  const header = "path,encoding,confidence,size_bytes,error";
  const rows = results.map((r) => {
    const rel = relative(rootDir, r.path) || r.path;
    const enc = r.encoding ?? "";
    const conf = r.confidence !== null ? r.confidence.toFixed(4) : "";
    const err = r.error ?? "";
    // Escape fields containing commas or quotes
    const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    return [esc(rel), esc(enc), conf, r.sizeBytes, esc(err)].join(",");
  });

  const csv = [header, ...rows].join("\n");
  await writeFile(outputPath, csv, "utf-8");
  process.stderr.write(`CSV exported -> ${outputPath}\n`);
}

/**
 * Write results to a JSON file.
 *
 * @param {import('./detector.js').DetectionResult[]} results
 * @param {string} outputPath - Destination file path.
 * @param {string} rootDir    - Scanned root directory for relative paths.
 */
export async function exportJson(results, outputPath, rootDir) {
  const data = results.map((r) => ({
    path: relative(rootDir, r.path) || r.path,
    encoding: r.encoding,
    confidence:
      r.confidence !== null ? parseFloat(r.confidence.toFixed(4)) : null,
    size_bytes: r.sizeBytes,
    error: r.error,
  }));

  await writeFile(outputPath, JSON.stringify(data, null, 2), "utf-8");
  process.stderr.write(`JSON exported -> ${outputPath}\n`);
}
