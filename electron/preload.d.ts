export interface ElectronAPI {
  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  toggleDevTools: () => void;

  // Note operations
  createNote: (note: any) => Promise<any>;
  updateNote: (id: string, note: any) => Promise<any>;
  deleteNote: (id: string) => Promise<void>;
  getNotes: () => Promise<any[]>;
  getNote: (id: string) => Promise<any>;

  // File operations
  openFile: () => Promise<string | null>;
  saveFile: (content: string, filename: string) => Promise<boolean>;

  // Calendar operations
  getCalendarEvents: (timeMin: string, timeMax: string) => Promise<any[]>;
  createCalendarEvent: (event: any) => Promise<any>;
  syncWithCalendar: () => Promise<void>;

  // AI operations
  getRelatedNotes: (noteId: string) => Promise<any[]>;
  getSimilarNotes: (content: string) => Promise<any[]>;
  generateTags: (content: string) => Promise<string[]>;
  generateSummary: (content: string) => Promise<string>;

  // App operations
  getAppVersion: () => string;
  getAppPath: (name: 'appData' | 'userData' | 'temp') => string;
  openInExplorer: (path: string) => Promise<void>;
  onWindowResize: (callback: (size: { width: number; height: number }) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
