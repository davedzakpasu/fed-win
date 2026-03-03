/**
 * FilterBar.jsx
 * Filters: by encoding, confidence threshold, extension, and search string.
 */

/**
 * @param {Object}   props
 * @param {string[]} props.encodings          - Unique encoding values in results.
 * @param {string}   props.filterEncoding     - Currently selected encoding filter.
 * @param {Function} props.onFilterEncoding
 * @param {number}   props.filterConfidence   - Min confidence 0–100.
 * @param {Function} props.onFilterConfidence
 * @param {string}   props.filterText         - Free-text search string.
 * @param {Function} props.onFilterText
 * @param {number}   props.totalResults
 * @param {number}   props.filteredCount
 */
export default function FilterBar({
  encodings,
  filterEncoding,
  onFilterEncoding,
  filterConfidence,
  onFilterConfidence,
  filterText,
  onFilterText,
  totalResults,
  filteredCount,
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
      {/* Text search */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Search:</span>
        <input
          type="text"
          value={filterText}
          onChange={e => onFilterText(e.target.value)}
          placeholder="filename or path…"
          className="w-44 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Encoding filter */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Encoding:</span>
        <select
          value={filterEncoding}
          onChange={e => onFilterEncoding(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All</option>
          {encodings.map(enc => (
            <option key={enc} value={enc}>{enc}</option>
          ))}
        </select>
      </div>

      {/* Confidence threshold */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Min confidence:</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={filterConfidence}
          onChange={e => onFilterConfidence(Number(e.target.value))}
          className="w-24 accent-blue-500"
        />
        <span className="w-10 text-xs text-gray-300">{filterConfidence}%</span>
      </div>

      {/* Result count */}
      <div className="ml-auto text-xs text-gray-500">
        {filteredCount === totalResults
          ? `${totalResults} file(s)`
          : `${filteredCount} / ${totalResults} file(s)`}
      </div>
    </div>
  );
}
