import type { IpcRendererEvent } from 'electron';
const { contextBridge, ipcRenderer } = require('electron');
import type { NoteConfig, AppSettings, ElectronAPI } from '../types/shared';

// Note: Not all ElectronAPI methods are implemented yet.
// The app handles missing methods gracefully in browser mode.
const exposedAPI: Partial<ElectronAPI> = {
  // System operations
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings),

  // Note management
  saveNote: (noteConfig: Partial<NoteConfig>) => ipcRenderer.invoke('save-note', noteConfig),
  createStickyNote: (noteConfig?: Partial<NoteConfig>) => ipcRenderer.invoke('create-sticky-note', noteConfig),
  closeStickyNote: (noteId: string) => ipcRenderer.invoke('close-sticky-note', noteId),
  toggleAlwaysOnTop: (noteId: string) => ipcRenderer.invoke('toggle-always-on-top', noteId),
  updateNoteData: (payload: { noteId: string; updates: Partial<NoteConfig> }) => ipcRenderer.invoke('update-note-data', payload),
  getAllNotes: () => ipcRenderer.invoke('get-all-notes'),
  getNote: (noteId: string) => ipcRenderer.invoke('get-note', noteId),

  // Note data listener
  onNoteData: (callback: (data: NoteConfig) => void) => {
    const listener = (_event: IpcRendererEvent, data: NoteConfig) => callback(data);
    ipcRenderer.on('note-data', listener);
    return () => {
      ipcRenderer.removeListener('note-data', listener);
    };
  },

  // Listener for creating a new note from menu or tray
  onCreateNewNote: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('create-new-note', listener);
    return () => {
      ipcRenderer.removeListener('create-new-note', listener);
    };
  },
  deleteNote: (noteId: string) => ipcRenderer.invoke('delete-note', noteId),
  snoozeNote: (noteId: string, minutes: number) => ipcRenderer.invoke('snooze-note', { noteId, minutes }),
  openInApp: (noteId: string) => ipcRenderer.invoke('open-in-app', noteId),
  openNoteByTitle: (title: string) => ipcRenderer.invoke('open-note-by-title', title),
  onIPCReady: (callback: () => void) => {
    ipcRenderer.once('ipc-ready', () => callback());
  },
  onNavigateToNote: (callback: (noteId: string) => void) => {
    const listener = (_event: IpcRendererEvent, noteId: string) => callback(noteId);
    ipcRenderer.on('navigate-to-note', listener);
    return () => {
      ipcRenderer.removeListener('navigate-to-note', listener);
    };
  },


  onStickyWindowsUpdate: (callback: (noteIds: string[]) => void) => {
    const listener = (_event: IpcRendererEvent, noteIds: string[]) => callback(noteIds);
    ipcRenderer.on('sticky-window-list', listener);
    return () => {
      ipcRenderer.removeListener('sticky-window-list', listener);
    };
  },

  saveMedia: (workspaceId: string, dataUrl: string, name?: string) => ipcRenderer.invoke('save-media', { workspaceId, dataUrl, name }),

  // Capture system
  captureClipboard: (workspaceId: string) => ipcRenderer.invoke('capture-clipboard', workspaceId),
  captureScreenshot: (workspaceId: string) => ipcRenderer.invoke('capture-screenshot', workspaceId),
  fetchWebpageMetadata: (url: string) => ipcRenderer.invoke('fetch-webpage-metadata', url),
  clipWebpage: (url: string, workspaceId: string, captureThumbnail?: boolean) =>
    ipcRenderer.invoke('clip-webpage', { url, workspaceId, captureThumbnail }),
  getCapturedContent: () => ipcRenderer.invoke('get-captured-content'),
  clearCapturedContent: () => ipcRenderer.invoke('clear-captured-content'),

  // Google Calendar
  connectGoogleCalendar: () => ipcRenderer.invoke('connect-google-calendar'),
  disconnectGoogleCalendar: () => ipcRenderer.invoke('disconnect-google-calendar'),
  isGoogleCalendarConnected: () => ipcRenderer.invoke('is-google-calendar-connected'),
  getCalendarEvents: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('get-calendar-events', { startDate, endDate }),
  createCalendarEvent: (title: string, start: string, end: string, allDay?: boolean) =>
    ipcRenderer.invoke('create-calendar-event', { title, start, end, allDay }),
  updateCalendarEvent: (eventId: string, updates: any) =>
    ipcRenderer.invoke('update-calendar-event', { eventId, updates }),
  deleteCalendarEvent: (eventId: string) => ipcRenderer.invoke('delete-calendar-event', eventId),

  // File-system storage
  getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
  saveWorkspaces: (workspaces: any[]) => ipcRenderer.invoke('save-workspaces', workspaces),
  getWorkspace: (workspaceId: string) => ipcRenderer.invoke('get-workspace', workspaceId),
  saveWorkspace: (workspace: any) => ipcRenderer.invoke('save-workspace', workspace),
  deleteWorkspaceStorage: (workspaceId: string) => ipcRenderer.invoke('delete-workspace', workspaceId),
  getWorkspaceActivity: (workspaceId: string) => ipcRenderer.invoke('get-workspace-activity', workspaceId),
  logActivity: (workspaceId: string, entry: any) => ipcRenderer.invoke('log-activity', { workspaceId, entry }),
  clearWorkspaceActivity: (workspaceId: string) => ipcRenderer.invoke('clear-workspace-activity', workspaceId),
  getTags: () => ipcRenderer.invoke('get-tags'),
  saveTags: (tags: any[]) => ipcRenderer.invoke('save-tags', tags),

  // Storage root
  getStorageRoot: () => ipcRenderer.invoke('get-storage-root'),
  setStorageRoot: (path: string) => ipcRenderer.invoke('set-storage-root', path),
  browseForFolder: () => ipcRenderer.invoke('browse-for-folder'),
  // AI
  ai: {
      health: () => ipcRenderer.invoke('ai-health'),
      indexNotes: (notes: any[]) => ipcRenderer.invoke('ai-index', notes),
      deleteNotes: (ids: string[]) => ipcRenderer.invoke('ai-delete', ids),
      search: (query: string, topK?: number) => ipcRenderer.invoke('ai-search', { query, topK }),
      answer: (query: string, ids?: string[]) => ipcRenderer.invoke('ai-answer', { query, ids }),
      transcribe: () => Promise.resolve({ transcript: '[AI] Transcription not ported yet' }), // TODO: Port whisper logic if needed
      findSimilar: (noteId: string, topK?: number) => ipcRenderer.invoke('ai-find-similar', { noteId, topK }),
      suggestTags: (content: string, existingTagIds?: string[]) => ipcRenderer.invoke('ai-suggest-tags', { content, existingTagIds }),
  },
};

contextBridge.exposeInMainWorld('electron', exposedAPI);
