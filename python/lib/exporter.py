"""Output formatting: console table, CSV, and JSON export."""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Sequence

from lib.detector import DetectionResult

# Column widths for console output
_COL_FILE = 50
_COL_ENCODING = 14
_COL_CONFIDENCE = 12
_COL_SIZE = 12


def _confidence_str(result: DetectionResult) -> str:
    """Format confidence as a percentage string or dash."""
    if result.error:
        return "ERROR"
    if result.confidence is None:
        return "—"
    return f"{result.confidence * 100:.0f}%"


def _size_str(size: int) -> str:
    """Human-readable file size."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 ** 2:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / 1024 ** 2:.1f} MB"


def _truncate(text: str, width: int) -> str:
    """Truncate a string to fit within `width` characters."""
    if len(text) <= width:
        return text
    return "…" + text[-(width - 1):]


def print_console(results: Sequence[DetectionResult], root: Path) -> None:
    """Print results as a formatted table to stdout.

    Args:
        results: Sequence of DetectionResult objects.
        root: The scanned root folder, used to compute relative paths.
    """
    header = (
        f"{'File':<{_COL_FILE}}  "
        f"{'Encoding':<{_COL_ENCODING}}  "
        f"{'Confidence':<{_COL_CONFIDENCE}}  "
        f"{'Size':>{_COL_SIZE}}"
    )
    separator = "  ".join([
        "-" * _COL_FILE,
        "-" * _COL_ENCODING,
        "-" * _COL_CONFIDENCE,
        "-" * _COL_SIZE,
    ])

    print(header)
    print(separator)

    for r in results:
        try:
            rel = r.path.relative_to(root)
        except ValueError:
            rel = r.path

        file_col = _truncate(str(rel), _COL_FILE)
        enc_col = r.encoding or ("ERROR" if r.error else "unknown")
        conf_col = _confidence_str(r)
        size_col = _size_str(r.size_bytes)

        print(
            f"{file_col:<{_COL_FILE}}  "
            f"{enc_col:<{_COL_ENCODING}}  "
            f"{conf_col:<{_COL_CONFIDENCE}}  "
            f"{size_col:>{_COL_SIZE}}"
        )

    print(separator)
    errors = sum(1 for r in results if r.error)
    print(f"\n{len(results)} file(s) scanned. {errors} error(s).")


def export_csv(results: Sequence[DetectionResult], output_path: Path, root: Path) -> None:
    """Write results to a CSV file.

    Args:
        results: Sequence of DetectionResult objects.
        output_path: Destination file path.
        root: The scanned root folder, used to compute relative paths.
    """
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["path", "encoding", "confidence", "size_bytes", "error"],
        )
        writer.writeheader()
        for r in results:
            try:
                rel = str(r.path.relative_to(root))
            except ValueError:
                rel = str(r.path)

            writer.writerow(
                {
                    "path": rel,
                    "encoding": r.encoding or "",
                    "confidence": f"{r.confidence:.4f}" if r.confidence is not None else "",
                    "size_bytes": r.size_bytes,
                    "error": r.error or "",
                }
            )
    print(f"CSV exported → {output_path}", file=sys.stderr)


def export_json(results: Sequence[DetectionResult], output_path: Path, root: Path) -> None:
    """Write results to a JSON file.

    Args:
        results: Sequence of DetectionResult objects.
        output_path: Destination file path.
        root: The scanned root folder, used to compute relative paths.
    """
    data = []
    for r in results:
        try:
            rel = str(r.path.relative_to(root))
        except ValueError:
            rel = str(r.path)

        data.append(
            {
                "path": rel,
                "encoding": r.encoding,
                "confidence": round(r.confidence, 4) if r.confidence is not None else None,
                "size_bytes": r.size_bytes,
                "error": r.error,
            }
        )

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"JSON exported → {output_path}", file=sys.stderr)
