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
  workspace?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

export interface AIAnalysis {
  similarity: number;
  tags: string[];
  summary: string;
  relatedNoteIds: string[];
}
