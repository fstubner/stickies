import type { Note } from '../types';

class SearchService {
  async search(query: string, notes: Note[]): Promise<Note[]> {
    const lowerQuery = query.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    );
  }

  async fuzzySearch(query: string, notes: Note[]): Promise<Note[]> {
    // Implement fuzzy search
    return this.search(query, notes);
  }
}

export const searchService = new SearchService();
