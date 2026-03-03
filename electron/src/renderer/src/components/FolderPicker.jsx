/**
 * FolderPicker.jsx
 * Folder path input + native dialog button + scan options.
 */

import { useState } from 'react';

/**
 * @param {Object}   props
 * @param {Function} props.onScan        - Called with (folderPath, options) to start a scan.
 * @param {boolean}  props.isScanning    - True while a scan is in progress.
 */
export default function FolderPicker({ onScan, isScanning }) {
  const [folderPath, setFolderPath] = useState('');
  const [recursive, setRecursive]   = useState(false);
  const [hidden, setHidden]         = useState(false);
  const [extFilter, setExtFilter]   = useState('');

  const handleBrowse = async () => {
    const path = await window.api.openFolderDialog();
    if (path) setFolderPath(path);
  };

  const handleScan = () => {
    if (!folderPath.trim()) return;
    const extensions = extFilter.trim()
      ? extFilter.split(/[,\s]+/).filter(Boolean).map(e => e.startsWith('.') ? e : `.${e}`)
      : null;

    onScan(folderPath.trim(), { recursive, includeHidden: hidden, extensions });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      {/* Path input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={folderPath}
          onChange={e => setFolderPath(e.target.value)}
          placeholder="C:\path\to\folder  or  /home/user/project"
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          onKeyDown={e => e.key === 'Enter' && handleScan()}
        />
        <button
          onClick={handleBrowse}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm text-gray-200 transition-colors"
        >
          Browse…
        </button>
        <button
          onClick={handleScan}
          disabled={!folderPath.trim() || isScanning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-semibold transition-colors"
        >
          {isScanning ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {/* Options row */}
      <div className="flex flex-wrap gap-6 text-sm text-gray-400">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={recursive}
            onChange={e => setRecursive(e.target.checked)}
            className="accent-blue-500"
          />
          Recursive
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hidden}
            onChange={e => setHidden(e.target.checked)}
            className="accent-blue-500"
          />
          Include hidden
        </label>

        <div className="flex items-center gap-2">
          <span className="text-gray-500">Extensions:</span>
          <input
            type="text"
            value={extFilter}
            onChange={e => setExtFilter(e.target.value)}
            placeholder=".txt .csv .log"
            className="w-36 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
