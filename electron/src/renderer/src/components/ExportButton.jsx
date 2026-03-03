/**
 * ExportButton.jsx
 * Export results to CSV or JSON via native save dialog.
 */

import { useState } from 'react';

/**
 * @param {Object}  props
 * @param {Array}   props.results   - Full results array to export.
 * @param {boolean} props.disabled  - True if no results available yet.
 */
export default function ExportButton({ results, disabled }) {
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleExport = async (format) => {
    const ext = format === 'csv' ? 'csv' : 'json';
    const filters = format === 'csv'
      ? [{ name: 'CSV files', extensions: ['csv'] }]
      : [{ name: 'JSON files', extensions: ['json'] }];

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const defaultName = `encoding_results_${timestamp}.${ext}`;

    const filePath = await window.api.saveFileDialog(defaultName, filters);
    if (!filePath) return; // user cancelled

    const fn = format === 'csv' ? window.api.exportCsv : window.api.exportJson;
    const result = await fn(results, filePath);

    if (result.success) {
      setStatus('success');
      setMessage(`Saved to ${filePath}`);
    } else {
      setStatus('error');
      setMessage(`Export failed: ${result.error}`);
    }

    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500">Export:</span>

      <button
        onClick={() => handleExport('csv')}
        disabled={disabled}
        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-600 rounded text-xs text-gray-200 transition-colors"
      >
        CSV
      </button>

      <button
        onClick={() => handleExport('json')}
        disabled={disabled}
        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-600 rounded text-xs text-gray-200 transition-colors"
      >
        JSON
      </button>

      {status === 'success' && (
        <span className="text-xs text-green-400 truncate max-w-xs" title={message}>
          ✓ {message}
        </span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-400 truncate max-w-xs" title={message}>
          ✗ {message}
        </span>
      )}
    </div>
  );
}
