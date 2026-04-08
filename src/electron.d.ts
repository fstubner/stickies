export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  toggleDevTools: () => void;
  createNote: (note: any) => Promise<any>;
  updateNote: (id: string, note: any) => Promise<any>;
  deleteNote: (id: string) => Promise<void>;
  getNotes: () => Promise<any[]>;
  openFile: () => Promise<string | null>;
  saveFile: (content: string, filename: string) => Promise<boolean>;
  getCalendarEvents: (timeMin: string, timeMax: string) => Promise<any[]>;
  createCalendarEvent: (event: any) => Promise<any>;
  getRelatedNotes: (noteId: string) => Promise<any[]>;
  getSimilarNotes: (content: string) => Promise<any[]>;
  generateTags: (content: string) => Promise<string[]>;
  generateSummary: (content: string) => Promise<string>;
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
