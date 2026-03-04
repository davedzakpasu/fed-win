#!/usr/bin/env node
/**
 * @file detect.js
 * CLI entry point for the File Encoding Detector (Node.js).
 *
 * Usage:
 *   node bin/detect.js <folder> [options]
 *   npx file-encoding-detector <folder> [options]
 */

import chalk from "chalk";
import { program } from "commander";
import { existsSync, statSync } from "fs";
import { resolve } from "path";

import { detectFile } from "../lib/detector.js";
import { exportCsv, exportJson, printConsole } from "../lib/exporter.js";
import { collectFiles } from "../lib/scanner.js";

// ---------------------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------------------

program
  .name("detect-encoding")
  .description("Detect the character encoding of every file in a folder.")
  .version("1.0.0")
  .argument("<folder>", "Path to the folder to scan")
  .option("-r, --recursive", "Scan subdirectories recursively", false)
  .option(
    "-o, --output <format>",
    "Output format: console, csv, json",
    "console",
  )
  .option(
    "-f, --file <path>",
    "Destination file for CSV/JSON export (auto-named if omitted)",
  )
  .option("--hidden", "Include hidden files and system folders", false)
  .option(
    "--ext <exts...>",
    "Only scan files with given extension(s), e.g. --ext .txt .csv",
  )
  .option(
    "--min-size <bytes>",
    "Skip files smaller than N bytes",
    (v) => parseInt(v, 10),
    0,
  )
  .option(
    "--max-size <bytes>",
    "Skip files larger than N bytes",
    (v) => parseInt(v, 10),
    null,
  )
  .option(
    "-c, --concurrency <n>",
    "Number of files to process in parallel",
    (v) => parseInt(v, 10),
    10,
  )
  .addHelpText(
    "after",
    `
Examples:
  node detect.js C:\\Users\\me\\documents
  node detect.js ./src --recursive
  node detect.js ./data --ext .csv .txt --output csv
  node detect.js ./project --recursive --output json --file results.json
`,
  );

program.parse();

const opts = program.opts();
const folder = program.args[0];

// ---------------------------------------------------------------------------
// Validate folder
// ---------------------------------------------------------------------------

const absFolder = resolve(folder);

if (!existsSync(absFolder)) {
  console.error(chalk.red(`error: folder not found: ${absFolder}`));
  process.exit(2);
}
if (!statSync(absFolder).isDirectory()) {
  console.error(chalk.red(`error: path is not a directory: ${absFolder}`));
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Validate output format
// ---------------------------------------------------------------------------

const validFormats = ["console", "csv", "json"];
if (!validFormats.includes(opts.output)) {
  console.error(
    chalk.red(
      `error: invalid output format "${opts.output}". Choose: console, csv, json`,
    ),
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Auto-name output file
// ---------------------------------------------------------------------------

function autoOutputPath(fmt) {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "_" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const stem = absFolder.split(/[\\/]/).pop() || "scan";
  return `${stem}_encoding_${ts}.${fmt}`;
}

// ---------------------------------------------------------------------------
// Concurrent processing with a semaphore
// ---------------------------------------------------------------------------

/**
 * Process an array of tasks with a capped concurrency.
 *
 * @template T
 * @param {T[]}              items
 * @param {(item: T) => Promise<unknown>} fn
 * @param {number}           limit
 */
async function withConcurrency(items, fn, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  // Collect files
  const files = await collectFiles(absFolder, {
    recursive: opts.recursive,
    includeHidden: opts.hidden,
    extensions: opts.ext ?? null,
    minSize: opts.minSize,
    maxSize: opts.maxSize,
  });

  if (files.length === 0) {
    console.error(chalk.yellow("No files found matching the given criteria."));
    process.exit(0);
  }

  process.stderr.write(
    chalk.dim(`Scanning ${files.length} file(s) in ${absFolder} …\n`),
  );

  // Detect encodings (with concurrency limit)
  const results = await withConcurrency(files, detectFile, opts.concurrency);

  // Output
  if (opts.output === "console") {
    printConsole(results, absFolder, chalk);
  }

  if (opts.output === "csv") {
    const outPath = opts.file ?? autoOutputPath("csv");
    try {
      await exportCsv(results, outPath, absFolder);
    } catch (err) {
      console.error(chalk.red(`error: could not write CSV: ${err.message}`));
      process.exit(3);
    }
    printConsole(results, absFolder, chalk);
  }

  if (opts.output === "json") {
    const outPath = opts.file ?? autoOutputPath("json");
    try {
      await exportJson(results, outPath, absFolder);
    } catch (err) {
      console.error(chalk.red(`error: could not write JSON: ${err.message}`));
      process.exit(3);
    }
    printConsole(results, absFolder, chalk);
  }

  process.exit(0);
})();
