/**
 * @file tests/detector.test.js
 * Tests for the Node.js File Encoding Detector implementation.
 *
 * Run with:
 *   npm test
 */

// vitest globals (describe, it, expect, beforeAll, afterAll) are auto-injected
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, relative } from "path";

import { detectFile } from "../lib/detector.js";
import { exportCsv, exportJson } from "../lib/exporter.js";
import { collectFiles } from "../lib/scanner.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let tmpDir;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "fed-test-"));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// detectFile tests
// ---------------------------------------------------------------------------

describe("detectFile", () => {
  it("detects UTF-8", async () => {
    const f = join(tmpDir, "utf8.txt");
    await writeFile(f, "Hello world — こんにちは", "utf-8");
    const r = await detectFile(f);
    expect(r.error).toBeNull();
    expect(r.encoding).toMatch(/UTF/i);
    expect(r.sizeBytes).toBeGreaterThan(0);
  });

  it("detects ASCII", async () => {
    const f = join(tmpDir, "ascii.txt");
    await writeFile(f, Buffer.from("Plain ASCII only."));
    const r = await detectFile(f);
    expect(r.error).toBeNull();
    expect(r.encoding).not.toBeNull();
  });

  it("handles empty files", async () => {
    const f = join(tmpDir, "empty.txt");
    await writeFile(f, Buffer.alloc(0));
    const r = await detectFile(f);
    expect(r.error).toBeNull();
    expect(r.encoding).toBe("EMPTY");
    expect(r.sizeBytes).toBe(0);
  });

  it("handles non-existent files gracefully", async () => {
    const r = await detectFile(join(tmpDir, "ghost.txt"));
    expect(r.error).not.toBeNull();
    expect(r.encoding).toBeNull();
  });

  it("detects ISO-8859-1", async () => {
    const f = join(tmpDir, "latin1.txt");
    await writeFile(f, Buffer.from("Héllo Wörld café résumé", "latin1"));
    const r = await detectFile(f);
    expect(r.error).toBeNull();
    expect(r.encoding).not.toBeNull();
  });

  it("returns confidence between 0 and 1", async () => {
    const f = join(tmpDir, "conf_check.txt");
    await writeFile(f, "Some content to check confidence.", "utf-8");
    const r = await detectFile(f);
    if (r.confidence !== null) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// collectFiles tests
// ---------------------------------------------------------------------------

describe("collectFiles", () => {
  let scanRoot;

  beforeAll(async () => {
    scanRoot = join(tmpDir, "scan");
    await mkdir(scanRoot, { recursive: true });
    await writeFile(join(scanRoot, "a.txt"), "a");
    await writeFile(join(scanRoot, "b.csv"), "b");
    await mkdir(join(scanRoot, "sub"), { recursive: true });
    await writeFile(join(scanRoot, "sub", "c.txt"), "c");
    await writeFile(join(scanRoot, ".hidden"), "h");
    await mkdir(join(scanRoot, "node_modules"), { recursive: true });
    await writeFile(join(scanRoot, "node_modules", "pkg.js"), "pkg");
  });

  it("does flat scan by default", async () => {
    const files = await collectFiles(scanRoot);
    const names = files.map((f) => relative(scanRoot, f));
    expect(names).toContain("a.txt");
    expect(names).toContain("b.csv");
    expect(names).not.toContain(join("sub", "c.txt"));
  });

  it("scans recursively when enabled", async () => {
    const files = await collectFiles(scanRoot, { recursive: true });
    const names = files.map((f) => relative(scanRoot, f));
    expect(names).toContain("a.txt");
    // sub/c.txt or sub\c.txt depending on OS
    expect(names.some((n) => n.includes("c.txt"))).toBe(true);
  });

  it("excludes hidden files by default", async () => {
    const files = await collectFiles(scanRoot);
    const names = files.map((f) => relative(scanRoot, f));
    expect(names).not.toContain(".hidden");
  });

  it("includes hidden files when enabled", async () => {
    const files = await collectFiles(scanRoot, { includeHidden: true });
    const names = files.map((f) => relative(scanRoot, f));
    expect(names).toContain(".hidden");
  });

  it("filters by extension", async () => {
    const files = await collectFiles(scanRoot, { extensions: [".txt"] });
    expect(files.every((f) => f.endsWith(".txt"))).toBe(true);
  });

  it("excludes node_modules", async () => {
    const files = await collectFiles(scanRoot, { recursive: true });
    expect(files.every((f) => !f.includes("node_modules"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// exporter tests
// ---------------------------------------------------------------------------

describe("exportCsv", () => {
  it("writes a CSV with correct headers and data", async () => {
    const outPath = join(tmpDir, "out.csv");
    const results = [
      {
        path: join(tmpDir, "a.txt"),
        encoding: "UTF-8",
        confidence: 0.99,
        sizeBytes: 100,
        error: null,
      },
      {
        path: join(tmpDir, "b.txt"),
        encoding: "ISO-8859-1",
        confidence: 0.87,
        sizeBytes: 200,
        error: null,
      },
      {
        path: join(tmpDir, "c.bin"),
        encoding: null,
        confidence: null,
        sizeBytes: 0,
        error: "Permission denied",
      },
    ];
    await exportCsv(results, outPath, tmpDir);

    const { readFile } = await import("fs/promises");
    const content = await readFile(outPath, "utf-8");
    expect(content).toContain("path,encoding,confidence,size_bytes,error");
    expect(content).toContain("UTF-8");
    expect(content).toContain("Permission denied");
  });
});

describe("exportJson", () => {
  it("writes valid JSON with correct fields", async () => {
    const outPath = join(tmpDir, "out.json");
    const results = [
      {
        path: join(tmpDir, "a.txt"),
        encoding: "UTF-8",
        confidence: 0.99,
        sizeBytes: 100,
        error: null,
      },
    ];
    await exportJson(results, outPath, tmpDir);

    const { readFile } = await import("fs/promises");
    const data = JSON.parse(await readFile(outPath, "utf-8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].encoding).toBe("UTF-8");
    expect(data[0].confidence).toBe(0.99);
    expect(data[0].error).toBeNull();
  });
});
