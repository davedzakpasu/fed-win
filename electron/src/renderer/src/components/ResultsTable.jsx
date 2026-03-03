/**
 * ResultsTable.jsx
 * Virtualized results table. Uses manual windowing for large lists.
 */

import { useState, useRef, useCallback } from 'react';

const ROW_HEIGHT = 34; // px
const BUFFER     = 5;  // extra rows above/below viewport

/** Confidence bar colour by value */
function confColor(conf) {
  if (conf === null) return 'bg-gray-600';
  if (conf >= 0.9)   return 'bg-green-500';
  if (conf >= 0.7)   return 'bg-yellow-500';
  return 'bg-red-500';
}

function ConfidenceBadge({ confidence, error }) {
  if (error)              return <span className="text-red-400 text-xs">ERROR</span>;
  if (confidence === null) return <span className="text-gray-500 text-xs">—</span>;
  const pct = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-700 rounded overflow-hidden">
        <div className={`h-full ${confColor(confidence)} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300">{pct}%</span>
    </div>
  );
}

function SizeCell({ bytes }) {
  if (bytes < 1024)        return <span>{bytes} B</span>;
  if (bytes < 1024 ** 2)   return <span>{(bytes / 1024).toFixed(1)} KB</span>;
  return <span>{(bytes / 1024 ** 2).toFixed(1)} MB</span>;
}

const HEADERS = [
  { label: 'File',       key: 'path',       flex: 'flex-1 min-w-0' },
  { label: 'Encoding',   key: 'encoding',   flex: 'w-32' },
  { label: 'Confidence', key: 'confidence', flex: 'w-36' },
  { label: 'Size',       key: 'sizeBytes',  flex: 'w-24 text-right' },
];

/**
 * @param {Object}   props
 * @param {Array}    props.results      - Filtered results array.
 * @param {string}   props.sortKey
 * @param {string}   props.sortDir
 * @param {Function} props.onSort
 */
export default function ResultsTable({ results, sortKey, sortDir, onSort }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(e => setScrollTop(e.currentTarget.scrollTop), []);

  // Viewport height estimate (fallback to 500)
  const viewportH = containerRef.current?.clientHeight ?? 500;
  const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + BUFFER * 2;
  const startIndex  = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIndex    = Math.min(results.length, startIndex + visibleCount);

  const totalHeight = results.length * ROW_HEIGHT;
  const offsetY     = startIndex * ROW_HEIGHT;
  const visibleRows = results.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs font-semibold text-gray-400 select-none">
        {HEADERS.map(h => (
          <button
            key={h.key}
            onClick={() => onSort(h.key)}
            className={`${h.flex} flex items-center gap-1 hover:text-gray-200 transition-colors text-left`}
          >
            {h.label}
            {sortKey === h.key && (
              <span className="text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Virtual scroll container */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto"
      >
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No results match the current filters.
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleRows.map((r, i) => (
                <div
                  key={startIndex + i}
                  className={`flex items-center gap-3 px-4 text-sm border-b border-gray-800
                    ${r.error ? 'text-red-400' : 'text-gray-200'}
                    hover:bg-gray-800 transition-colors`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* File path */}
                  <span className="flex-1 min-w-0 truncate font-mono text-xs" title={r.path}>
                    {r.path}
                  </span>
                  {/* Encoding */}
                  <span className="w-32 text-xs font-mono">
                    {r.error ? <span className="text-red-500">ERROR</span> : (r.encoding ?? 'unknown')}
                  </span>
                  {/* Confidence */}
                  <div className="w-36">
                    <ConfidenceBadge confidence={r.confidence} error={r.error} />
                  </div>
                  {/* Size */}
                  <span className="w-24 text-right text-xs text-gray-400">
                    <SizeCell bytes={r.sizeBytes} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
