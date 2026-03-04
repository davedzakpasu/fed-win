"""Tests for the Python implementation of File Encoding Detector.

Run with:
    pytest tests/ -v
"""

from __future__ import annotations

import json
import os
import stat
import sys
from pathlib import Path

import pytest

# Ensure lib is importable when running tests from python/
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.detector import detect_file, DetectionResult
from lib.scanner import iter_files
from lib.exporter import export_csv, export_json


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_folder(tmp_path: Path) -> Path:
    """Provide a clean temp folder for each test."""
    return tmp_path


# ---------------------------------------------------------------------------
# detector.py tests
# ---------------------------------------------------------------------------

class TestDetectFile:
    def test_utf8_file(self, tmp_folder: Path) -> None:
        f = tmp_folder / "utf8.txt"
        f.write_text("Hello, world! こんにちは", encoding="utf-8")
        result = detect_file(f)
        assert result.error is None
        assert result.encoding is not None
        assert "UTF" in result.encoding
        assert result.size_bytes > 0

    def test_ascii_file(self, tmp_folder: Path) -> None:
        f = tmp_folder / "ascii.txt"
        f.write_bytes(b"Hello world, plain ASCII text only.")
        result = detect_file(f)
        assert result.error is None
        assert result.encoding is not None

    def test_empty_file(self, tmp_folder: Path) -> None:
        f = tmp_folder / "empty.txt"
        f.write_bytes(b"")
        result = detect_file(f)
        assert result.error is None
        assert result.encoding == "empty"
        assert result.size_bytes == 0

    def test_nonexistent_file(self, tmp_folder: Path) -> None:
        f = tmp_folder / "does_not_exist.txt"
        result = detect_file(f)
        assert result.error is not None
        assert result.encoding is None

    @pytest.mark.skipif(sys.platform == "win32", reason="chmod not reliable on Windows")
    def test_unreadable_file(self, tmp_folder: Path) -> None:
        f = tmp_folder / "locked.txt"
        f.write_text("secret", encoding="utf-8")
        f.chmod(0o000)
        try:
            result = detect_file(f)
            assert result.error is not None
            assert result.encoding is None
        finally:
            f.chmod(stat.S_IRUSR | stat.S_IWUSR)

    def test_latin1_file(self, tmp_folder: Path) -> None:
        f = tmp_folder / "latin1.txt"
        # Write bytes that are valid ISO-8859-1 but not valid UTF-8
        f.write_bytes("Héllo Wörld - café résumé".encode("iso-8859-1"))
        result = detect_file(f)
        assert result.error is None
        assert result.encoding is not None


# ---------------------------------------------------------------------------
# scanner.py tests
# ---------------------------------------------------------------------------

class TestIterFiles:
    def test_flat_scan(self, tmp_folder: Path) -> None:
        (tmp_folder / "a.txt").write_text("a")
        (tmp_folder / "b.txt").write_text("b")
        sub = tmp_folder / "sub"
        sub.mkdir()
        (sub / "c.txt").write_text("c")

        files = list(iter_files(tmp_folder, recursive=False))
        names = {f.name for f in files}
        assert "a.txt" in names
        assert "b.txt" in names
        assert "c.txt" not in names  # sub not included

    def test_recursive_scan(self, tmp_folder: Path) -> None:
        (tmp_folder / "a.txt").write_text("a")
        sub = tmp_folder / "sub"
        sub.mkdir()
        (sub / "b.txt").write_text("b")

        files = list(iter_files(tmp_folder, recursive=True))
        names = {f.name for f in files}
        assert "a.txt" in names
        assert "b.txt" in names

    def test_hidden_files_excluded_by_default(self, tmp_folder: Path) -> None:
        (tmp_folder / ".hidden").write_text("x")
        (tmp_folder / "visible.txt").write_text("y")

        files = list(iter_files(tmp_folder))
        names = {f.name for f in files}
        assert ".hidden" not in names
        assert "visible.txt" in names

    def test_hidden_files_included_when_flag_set(self, tmp_folder: Path) -> None:
        (tmp_folder / ".hidden").write_text("x")
        files = list(iter_files(tmp_folder, include_hidden=True))
        names = {f.name for f in files}
        assert ".hidden" in names

    def test_extension_filter(self, tmp_folder: Path) -> None:
        (tmp_folder / "a.txt").write_text("a")
        (tmp_folder / "b.csv").write_text("b")
        (tmp_folder / "c.py").write_text("c")

        files = list(iter_files(tmp_folder, extensions=[".txt", ".csv"]))
        names = {f.name for f in files}
        assert "a.txt" in names
        assert "b.csv" in names
        assert "c.py" not in names

    def test_min_size_filter(self, tmp_folder: Path) -> None:
        small = tmp_folder / "small.txt"
        small.write_bytes(b"hi")
        large = tmp_folder / "large.txt"
        large.write_bytes(b"x" * 100)

        files = list(iter_files(tmp_folder, min_size=50))
        names = {f.name for f in files}
        assert "small.txt" not in names
        assert "large.txt" in names

    def test_node_modules_excluded(self, tmp_folder: Path) -> None:
        nm = tmp_folder / "node_modules"
        nm.mkdir()
        (nm / "pkg.js").write_text("module")
        (tmp_folder / "app.js").write_text("app")

        files = list(iter_files(tmp_folder, recursive=True))
        names = {f.name for f in files}
        assert "pkg.js" not in names
        assert "app.js" in names


# ---------------------------------------------------------------------------
# exporter.py tests
# ---------------------------------------------------------------------------

class TestExporters:
    def _make_results(self, tmp_folder: Path) -> list[DetectionResult]:
        f1 = tmp_folder / "a.txt"
        f1.write_text("hello", encoding="utf-8")
        f2 = tmp_folder / "b.txt"
        f2.write_text("world", encoding="utf-8")
        return [
            DetectionResult(path=f1, encoding="UTF-8", confidence=0.99, size_bytes=5),
            DetectionResult(path=f2, encoding="ISO-8859-1", confidence=0.87, size_bytes=5),
            DetectionResult(path=tmp_folder / "err.bin", encoding=None, confidence=None, size_bytes=0, error="Permission denied"),
        ]

    def test_csv_export(self, tmp_folder: Path) -> None:
        results = self._make_results(tmp_folder)
        out = tmp_folder / "out.csv"
        export_csv(results, out, root=tmp_folder)
        assert out.exists()
        text = out.read_text(encoding="utf-8")
        assert "UTF-8" in text
        assert "ISO-8859-1" in text
        assert "Permission denied" in text

    def test_json_export(self, tmp_folder: Path) -> None:
        results = self._make_results(tmp_folder)
        out = tmp_folder / "out.json"
        export_json(results, out, root=tmp_folder)
        assert out.exists()
        data = json.loads(out.read_text(encoding="utf-8"))
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["encoding"] == "UTF-8"
        assert data[2]["error"] == "Permission denied"