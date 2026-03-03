"""Encoding detection wrapper using chardet."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import chardet

# Number of bytes read for detection (64 KB is sufficient for most files)
SAMPLE_SIZE = 65_536


@dataclass
class DetectionResult:
    """Result of encoding detection for a single file.

    Attributes:
        path: Absolute path to the file.
        encoding: Detected encoding name, or None if detection failed.
        confidence: Confidence score between 0.0 and 1.0, or None if unavailable.
        size_bytes: File size in bytes.
        error: Error message if the file could not be read, else None.
    """

    path: Path
    encoding: str | None
    confidence: float | None
    size_bytes: int
    error: str | None = None


def detect_file(path: Path) -> DetectionResult:
    """Detect the character encoding of a single file.

    Reads up to SAMPLE_SIZE bytes and runs chardet detection.
    Never raises — errors are captured in the result's `error` field.

    Args:
        path: Path to the file to analyse.

    Returns:
        A DetectionResult with encoding, confidence, size, and any error.
    """
    try:
        size_bytes = path.stat().st_size
    except OSError as e:
        return DetectionResult(path=path, encoding=None, confidence=None, size_bytes=0, error=str(e))

    try:
        with path.open("rb") as f:
            raw = f.read(SAMPLE_SIZE)
    except (OSError, PermissionError) as e:
        return DetectionResult(path=path, encoding=None, confidence=None, size_bytes=size_bytes, error=str(e))

    if not raw:
        return DetectionResult(
            path=path,
            encoding="empty",
            confidence=None,
            size_bytes=size_bytes,
            error=None,
        )

    detected = chardet.detect(raw)
    encoding = detected.get("encoding")
    confidence = detected.get("confidence")

    # Normalise encoding name to uppercase for consistency
    if encoding:
        encoding = encoding.upper()

    return DetectionResult(
        path=path,
        encoding=encoding,
        confidence=confidence,
        size_bytes=size_bytes,
        error=None,
    )
