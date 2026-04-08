import type { Note } from '../types';

class StorageService {
  private dbName = 'stickies';
  private dbVersion = 1;

  async init(): Promise<void> {
    // Initialize storage
  }

  async saveNote(note: Note): Promise<void> {
    // Save to storage
  }

  async loadNotes(): Promise<Note[]> {
    // Load from storage
    return [];
  }

  async deleteNote(id: string): Promise<void> {
    // Delete from storage
  }
}

export const storageService = new StorageService();
