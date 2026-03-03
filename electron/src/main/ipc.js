/**
 * @file ipc.js
 * IPC handler registration for the main process.
 * All file system work happens here — never in the renderer.
 *
 * IPC channels (see IMPLEMENTATION.md §Electron IPC API surface):
 *   scan:start      renderer → main  { path, options }
 *   scan:progress   main → renderer  { file, result, done, total }
 *   scan:complete   main → renderer  { results, duration }
 *   scan:error      main → renderer  { message }
 *   export:csv      renderer → main  { results, filePath }  → { success, error }
 *   export:json     renderer → main  { results, filePath }  → { success, error }
 */

import { ipcMain, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import { scanFolder } from './scanner.js';

/**
 * Register all IPC handlers.
 * Must be called after the BrowserWindow is created.
 *
 * @param {import('electron').BrowserWindow} win - The main window.
 */
export function registerIpcHandlers(win) {

  // -------------------------------------------------------------------------
  // scan:start — begin folder scan, stream progress events back to renderer
  // -------------------------------------------------------------------------
  ipcMain.on('scan:start', async (_event, { path: folderPath, options }) => {
    try {
      const { results, duration } = await scanFolder(
        folderPath,
        options ?? {},
        (progress) => {
          // Fire-and-forget progress update to renderer
          if (!win.isDestroyed()) {
            win.webContents.send('scan:progress', progress);
          }
        }
      );

      if (!win.isDestroyed()) {
        win.webContents.send('scan:complete', { results, duration });
      }
    } catch (err) {
      if (!win.isDestroyed()) {
        win.webContents.send('scan:error', { message: err.message });
      }
    }
  });

  // -------------------------------------------------------------------------
  // export:csv
  // -------------------------------------------------------------------------
  ipcMain.handle('export:csv', async (_event, { results, filePath }) => {
    try {
      const header = 'path,encoding,confidence,size_bytes,error';
      const rows = results.map(r => {
        const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
        return [
          esc(r.path),
          esc(r.encoding ?? ''),
          r.confidence !== null ? r.confidence.toFixed(4) : '',
          r.sizeBytes,
          esc(r.error ?? ''),
        ].join(',');
      });
      await writeFile(filePath, [header, ...rows].join('\n'), 'utf-8');
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // -------------------------------------------------------------------------
  // export:json
  // -------------------------------------------------------------------------
  ipcMain.handle('export:json', async (_event, { results, filePath }) => {
    try {
      const data = results.map(r => ({
        path:       r.path,
        encoding:   r.encoding,
        confidence: r.confidence !== null ? parseFloat(r.confidence.toFixed(4)) : null,
        size_bytes: r.sizeBytes,
        error:      r.error,
      }));
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // -------------------------------------------------------------------------
  // dialog:openFolder — native folder picker
  // -------------------------------------------------------------------------
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select a folder to scan',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // -------------------------------------------------------------------------
  // dialog:saveFile — native save dialog for exports
  // -------------------------------------------------------------------------
  ipcMain.handle('dialog:saveFile', async (_event, { defaultName, filters }) => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled) return null;
    return result.filePath;
  });
}
