import type { Note } from '../types';

class NoteService {
  async createNote(content: string): Promise<Note> {
    return {
      id: 'new-note',
      title: 'Untitled',
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    // Implementation would go here
    return { id } as Note;
  }

  async createStickyNote(): Promise<void> {
    // Implementation would go here
  }

  async openAsSticky(note: Note): Promise<void> {
    // Implementation would go here
  }
}

export const noteService = new NoteService();
