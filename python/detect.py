#!/usr/bin/env python3
"""File Encoding Detector — Python implementation.

Detects the character encoding of every file in a given folder.

Usage:
    python detect.py <folder> [options]

See README.md or run with --help for full usage.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from lib.detector import detect_file
from lib.exporter import export_csv, export_json, print_console
from lib.scanner import iter_files


# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        prog="detect",
        description="Detect the character encoding of files in a folder.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  python detect.py C:\\Users\\me\\documents
  python detect.py ./src --recursive
  python detect.py ./data --ext .csv .txt --output csv
  python detect.py ./project --recursive --output json --file results.json
""",
    )

    parser.add_argument(
        "folder",
        type=Path,
        help="Path to the folder to scan.",
    )
    parser.add_argument(
        "--recursive", "-r",
        action="store_true",
        default=False,
        help="Scan subdirectories recursively (default: off).",
    )
    parser.add_argument(
        "--output", "-o",
        choices=["console", "csv", "json"],
        default="console",
        help="Output format (default: console).",
    )
    parser.add_argument(
        "--file", "-f",
        type=Path,
        default=None,
        help="Destination file for CSV/JSON export. Auto-named if not specified.",
    )
    parser.add_argument(
        "--hidden",
        action="store_true",
        default=False,
        help="Include hidden files and system folders (default: off).",
    )
    parser.add_argument(
        "--ext",
        nargs="+",
        metavar="EXT",
        default=None,
        help="Only scan files with these extension(s), e.g. --ext .txt .csv",
    )
    parser.add_argument(
        "--min-size",
        type=int,
        default=0,
        metavar="BYTES",
        help="Skip files smaller than N bytes (default: 0).",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=None,
        metavar="BYTES",
        help="Skip files larger than N bytes (default: no limit).",
    )

    return parser


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auto_output_path(folder: Path, fmt: str) -> Path:
    """Generate an auto-named output file path in the current directory."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = folder.resolve().name or "scan"
    return Path(f"{stem}_encoding_{timestamp}.{fmt}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    """Entry point. Returns an exit code."""
    parser = build_parser()
    args = parser.parse_args()

    # Validate folder
    folder: Path = args.folder.expanduser().resolve()
    if not folder.exists():
        print(f"error: folder not found: {folder}", file=sys.stderr)
        return 2
    if not folder.is_dir():
        print(f"error: path is not a directory: {folder}", file=sys.stderr)
        return 2

    # Collect files
    files = list(
        iter_files(
            folder,
            recursive=args.recursive,
            include_hidden=args.hidden,
            extensions=args.ext,
            min_size=args.min_size,
            max_size=args.max_size,
        )
    )

    if not files:
        print("No files found matching the given criteria.", file=sys.stderr)
        return 0

    print(f"Scanning {len(files)} file(s) in {folder} …", file=sys.stderr)

    # Detect encodings
    results = [detect_file(f) for f in files]

    # Output
    if args.output == "console":
        print_console(results, root=folder)

    elif args.output == "csv":
        out_path = args.file or _auto_output_path(folder, "csv")
        try:
            export_csv(results, out_path, root=folder)
        except OSError as e:
            print(f"error: could not write CSV: {e}", file=sys.stderr)
            return 3
        # Also print a summary to console
        print_console(results, root=folder)

    elif args.output == "json":
        out_path = args.file or _auto_output_path(folder, "json")
        try:
            export_json(results, out_path, root=folder)
        except OSError as e:
            print(f"error: could not write JSON: {e}", file=sys.stderr)
            return 3
        print_console(results, root=folder)

    return 0


if __name__ == "__main__":
    sys.exit(main())
