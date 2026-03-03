/**
 * @file detector.js
 * Encoding detection wrapper using chardet.
 */

import { readFile, stat } from 'fs/promises';
import chardet from 'chardet';

/** Number of bytes sampled per file (64 KB). */
const SAMPLE_SIZE = 65_536;

/**
 * @typedef {Object} DetectionResult
 * @property {string}      path        - Absolute path to the file.
 * @property {string|null} encoding    - Detected encoding (e.g. 'UTF-8'), or null on error.
 * @property {number|null} confidence  - Confidence score 0.0–1.0, or null if unavailable.
 * @property {number}      sizeBytes   - File size in bytes.
 * @property {string|null} error       - Error message if unreadable, else null.
 */

/**
 * Detect the character encoding of a single file.
 * Never throws — errors are captured in the result's `error` field.
 *
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<DetectionResult>}
 */
export async function detectFile(filePath) {
  let sizeBytes = 0;

  // Get file size
  try {
    const info = await stat(filePath);
    sizeBytes = info.size;
  } catch (err) {
    return { path: filePath, encoding: null, confidence: null, sizeBytes: 0, error: err.message };
  }

  // Empty file
  if (sizeBytes === 0) {
    return { path: filePath, encoding: 'EMPTY', confidence: null, sizeBytes: 0, error: null };
  }

  // Read sample bytes
  let buffer;
  try {
    const full = await readFile(filePath);
    buffer = full.subarray(0, SAMPLE_SIZE);
  } catch (err) {
    return { path: filePath, encoding: null, confidence: null, sizeBytes, error: err.message };
  }

  // Run chardet
  const results = chardet.analyse(buffer);

  if (!results || results.length === 0) {
    return { path: filePath, encoding: 'UNKNOWN', confidence: null, sizeBytes, error: null };
  }

  const top = results[0];
  const encoding = top.name ? top.name.toUpperCase() : 'UNKNOWN';
  const confidence = typeof top.confidence === 'number' ? top.confidence / 100 : null;

  return { path: filePath, encoding, confidence, sizeBytes, error: null };
}
