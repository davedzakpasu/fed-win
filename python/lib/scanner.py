"""Folder walking and file collection."""

from __future__ import annotations

from pathlib import Path
from typing import Generator

# Folders and files excluded by default (see SPEC §5)
DEFAULT_EXCLUDED_DIRS: frozenset[str] = frozenset(
    {".git", ".hg", ".svn", "node_modules", "__pycache__", ".mypy_cache", ".tox", ".venv", "venv"}
)

DEFAULT_EXCLUDED_FILES: frozenset[str] = frozenset(
    {"Thumbs.db", "desktop.ini", ".DS_Store"}
)

DEFAULT_EXCLUDED_SUFFIXES: frozenset[str] = frozenset({".pyc", ".pyo"})


def iter_files(
    root: Path,
    *,
    recursive: bool = False,
    include_hidden: bool = False,
    extensions: list[str] | None = None,
    min_size: int = 0,
    max_size: int | None = None,
) -> Generator[Path, None, None]:
    """Yield file paths under `root` that match the given filters.

    Args:
        root: Directory to scan.
        recursive: If True, descend into subdirectories.
        include_hidden: If True, include hidden files and system folders.
        extensions: If provided, only yield files with these extensions (e.g. ['.txt', '.csv']).
            Extensions are matched case-insensitively.
        min_size: Skip files smaller than this many bytes.
        max_size: Skip files larger than this many bytes. None means no limit.

    Yields:
        Path objects for each matching file.
    """
    extensions_lower = {ext.lower() if ext.startswith(".") else f".{ext.lower()}" for ext in extensions} if extensions else None

    def _should_skip_dir(d: Path) -> bool:
        name = d.name
        if not include_hidden and name.startswith("."):
            return True
        if name in DEFAULT_EXCLUDED_DIRS:
            return True
        return False

    def _should_skip_file(f: Path) -> bool:
        name = f.name
        if not include_hidden and name.startswith("."):
            return True
        if name in DEFAULT_EXCLUDED_FILES:
            return True
        if f.suffix.lower() in DEFAULT_EXCLUDED_SUFFIXES:
            return True
        if extensions_lower and f.suffix.lower() not in extensions_lower:
            return True
        return False

    def _walk(directory: Path) -> Generator[Path, None, None]:
        try:
            entries = sorted(directory.iterdir(), key=lambda p: (p.is_dir(), p.name.lower()))
        except PermissionError:
            return

        for entry in entries:
            if entry.is_symlink():
                continue
            if entry.is_dir():
                if recursive and not _should_skip_dir(entry):
                    yield from _walk(entry)
            elif entry.is_file():
                if _should_skip_file(entry):
                    continue
                try:
                    size = entry.stat().st_size
                except OSError:
                    yield entry  # Let detector handle the error
                    continue
                if size < min_size:
                    continue
                if max_size is not None and size > max_size:
                    continue
                yield entry

    yield from _walk(root)
