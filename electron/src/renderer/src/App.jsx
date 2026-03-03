/**
 * App.jsx
 * Root component. Wires together FolderPicker, FilterBar, ResultsTable, and ExportButton.
 * Manages all scan state and IPC communication.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import FolderPicker from './components/FolderPicker';
import FilterBar    from './components/FilterBar';
import ResultsTable from './components/ResultsTable';
import ExportButton from './components/ExportButton';

// ---------------------------------------------------------------------------
// Sorting helper
// ---------------------------------------------------------------------------

function sortResults(results, key, dir) {
  return [...results].sort((a, b) => {
    let av = a[key] ?? '';
    let bv = b[key] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  // Scan state
  const [isScanning, setIsScanning]   = useState(false);
  const [progress, setProgress]       = useState(null); // { done, total }
  const [results, setResults]         = useState([]);
  const [scanError, setScanError]     = useState(null);
  const [scanDuration, setScanDuration] = useState(null);

  // Filter state
  const [filterText, setFilterText]           = useState('');
  const [filterEncoding, setFilterEncoding]   = useState('');
  const [filterConfidence, setFilterConfidence] = useState(0);

  // Sort state
  const [sortKey, setSortKey] = useState('path');
  const [sortDir, setSortDir] = useState('asc');

  // -------------------------------------------------------------------------
  // IPC listeners (set up once)
  // -------------------------------------------------------------------------

  useEffect(() => {
    window.api.onProgress(({ done, total }) => {
      setProgress({ done, total });
    });

    window.api.onComplete(({ results: newResults, duration }) => {
      setResults(newResults);
      setScanDuration(duration);
      setIsScanning(false);
      setProgress(null);
    });

    window.api.onError(({ message }) => {
      setScanError(message);
      setIsScanning(false);
      setProgress(null);
    });

    return () => window.api.removeAllScanListeners();
  }, []);

  // -------------------------------------------------------------------------
  // Start scan
  // -------------------------------------------------------------------------

  const handleScan = useCallback((folderPath, options) => {
    setResults([]);
    setScanError(null);
    setScanDuration(null);
    setFilterText('');
    setFilterEncoding('');
    setFilterConfidence(0);
    setIsScanning(true);
    window.api.removeAllScanListeners();

    // Re-register listeners before starting (in case of re-scan)
    window.api.onProgress(({ done, total }) => setProgress({ done, total }));
    window.api.onComplete(({ results: r, duration }) => {
      setResults(r);
      setScanDuration(duration);
      setIsScanning(false);
      setProgress(null);
    });
    window.api.onError(({ message }) => {
      setScanError(message);
      setIsScanning(false);
      setProgress(null);
    });

    window.api.startScan(folderPath, options);
  }, []);

  // -------------------------------------------------------------------------
  // Sort handler
  // -------------------------------------------------------------------------

  const handleSort = useCallback((key) => {
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const uniqueEncodings = useMemo(() => {
    const set = new Set(results.map(r => r.encoding).filter(Boolean));
    return [...set].sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filterText) {
      const q = filterText.toLowerCase();
      filtered = filtered.filter(r => r.path.toLowerCase().includes(q));
    }
    if (filterEncoding) {
      filtered = filtered.filter(r => r.encoding === filterEncoding);
    }
    if (filterConfidence > 0) {
      filtered = filtered.filter(r =>
        r.confidence !== null && r.confidence * 100 >= filterConfidence
      );
    }

    return sortResults(filtered, sortKey, sortDir);
  }, [results, filterText, filterEncoding, filterConfidence, sortKey, sortDir]);

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const errorCount = results.filter(r => r.error).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen gap-3 p-4 bg-gray-950 select-none">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-300 tracking-widest uppercase">
          🔍 File Encoding Detector
        </h1>
        {scanDuration !== null && (
          <span className="text-xs text-gray-500">
            {results.length} file(s) · {errorCount} error(s) · {(scanDuration / 1000).toFixed(2)}s
          </span>
        )}
      </div>

      {/* Folder picker + options */}
      <FolderPicker onScan={handleScan} isScanning={isScanning} />

      {/* Progress bar */}
      {isScanning && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Scanning…</span>
            <span>{progress.done} / {progress.total}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error banner */}
      {scanError && (
        <div className="bg-red-900/40 border border-red-700 rounded px-4 py-2 text-sm text-red-300">
          ✗ {scanError}
        </div>
      )}

      {/* Filter bar — only visible when there are results */}
      {results.length > 0 && (
        <FilterBar
          encodings={uniqueEncodings}
          filterEncoding={filterEncoding}
          onFilterEncoding={setFilterEncoding}
          filterConfidence={filterConfidence}
          onFilterConfidence={setFilterConfidence}
          filterText={filterText}
          onFilterText={setFilterText}
          totalResults={results.length}
          filteredCount={filteredResults.length}
        />
      )}

      {/* Results table — grows to fill remaining space */}
      {results.length > 0 && (
        <ResultsTable
          results={filteredResults}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}

      {/* Empty state */}
      {!isScanning && results.length === 0 && !scanError && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 text-sm gap-2">
          <span className="text-4xl">📂</span>
          <span>Select a folder and press Scan to get started.</span>
        </div>
      )}

      {/* Bottom bar with export */}
      {results.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
          <ExportButton results={results} disabled={isScanning || results.length === 0} />
          <span className="text-xs text-gray-600">
            Showing {filteredResults.length} of {results.length}
          </span>
        </div>
      )}
    </div>
  );
}
