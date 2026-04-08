// Type definitions for the main Electron process

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  position?: { x: number; y: number };
  tags?: string[];
  pinned?: boolean;
}

export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
  startWithSystem: boolean;
  defaultNoteColor: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}
