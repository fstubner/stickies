import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './preload.d';

const electronAPI: ElectronAPI = {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  toggleDevTools: () => ipcRenderer.send('window:toggle-devtools'),

  // Note operations
  createNote: (note) => ipcRenderer.invoke('note:create', note),
  updateNote: (id, note) => ipcRenderer.invoke('note:update', { id, note }),
  deleteNote: (id) => ipcRenderer.invoke('note:delete', id),
  getNotes: () => ipcRenderer.invoke('note:get-all'),
  getNote: (id) => ipcRenderer.invoke('note:get', id),

  // File operations
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (content, filename) => ipcRenderer.invoke('file:save', { content, filename }),

  // Calendar operations
  getCalendarEvents: (timeMin, timeMax) =>
    ipcRenderer.invoke('calendar:get-events', { timeMin, timeMax }),
  createCalendarEvent: (event) => ipcRenderer.invoke('calendar:create-event', event),
  syncWithCalendar: () => ipcRenderer.invoke('calendar:sync'),

  // AI operations
  getRelatedNotes: (noteId) => ipcRenderer.invoke('ai:get-related', noteId),
  getSimilarNotes: (content) => ipcRenderer.invoke('ai:get-similar', content),
  generateTags: (content) => ipcRenderer.invoke('ai:generate-tags', content),
  generateSummary: (content) => ipcRenderer.invoke('ai:generate-summary', content),

  // App operations
  getAppVersion: () => ipcRenderer.sendSync('app:version'),
  getAppPath: (name) => ipcRenderer.sendSync('app:path', name),
  openInExplorer: (path) => ipcRenderer.invoke('app:open-explorer', path),
  onWindowResize: (callback) => {
    ipcRenderer.on('window:resize', (event, size) => callback(size));
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
