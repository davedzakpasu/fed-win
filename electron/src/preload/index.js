/**
 * @file preload/index.js
 * Exposes a safe IPC bridge to the renderer via contextBridge.
 * The renderer has NO direct access to Node.js or Electron APIs.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // -------------------------------------------------------------------------
  // Scanning
  // -------------------------------------------------------------------------

  /** Start a folder scan. Progress and completion come via onProgress / onComplete. */
  startScan: (path, options) => {
    ipcRenderer.send('scan:start', { path, options });
  },

  /** Register a callback for per-file progress updates. */
  onProgress: (callback) => {
    ipcRenderer.on('scan:progress', (_event, data) => callback(data));
  },

  /** Register a callback for scan completion. */
  onComplete: (callback) => {
    ipcRenderer.on('scan:complete', (_event, data) => callback(data));
  },

  /** Register a callback for scan errors. */
  onError: (callback) => {
    ipcRenderer.on('scan:error', (_event, data) => callback(data));
  },

  /** Remove all scan-related listeners (call before re-scanning). */
  removeAllScanListeners: () => {
    ipcRenderer.removeAllListeners('scan:progress');
    ipcRenderer.removeAllListeners('scan:complete');
    ipcRenderer.removeAllListeners('scan:error');
  },

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  /** Export results as CSV. Returns { success, error }. */
  exportCsv: (results, filePath) =>
    ipcRenderer.invoke('export:csv', { results, filePath }),

  /** Export results as JSON. Returns { success, error }. */
  exportJson: (results, filePath) =>
    ipcRenderer.invoke('export:json', { results, filePath }),

  // -------------------------------------------------------------------------
  // Dialogs
  // -------------------------------------------------------------------------

  /** Open the native folder picker. Returns selected path or null. */
  openFolderDialog: () =>
    ipcRenderer.invoke('dialog:openFolder'),

  /** Open the native save dialog. Returns chosen file path or null. */
  saveFileDialog: (defaultName, filters) =>
    ipcRenderer.invoke('dialog:saveFile', { defaultName, filters }),
});
