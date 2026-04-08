import { writable } from 'svelte/store';
import type { Note } from '../types';

function createNotesStore() {
  const { subscribe, set, update } = writable<Note[]>([]);

  return {
    subscribe,
    add: (note: Note) => update(notes => [...notes, note]),
    update: (id: string, changes: Partial<Note>) => {
      update(notes => notes.map(n => n.id === id ? { ...n, ...changes } : n));
    },
    remove: (id: string) => update(notes => notes.filter(n => n.id !== id)),
    getNoteById: (id: string) => {
      let note: Note | undefined;
      subscribe(notes => {
        note = notes.find(n => n.id === id);
      })();
      return note;
    }
  };
}

export const notesStore = createNotesStore();

export async function loadNotes(): Promise<void> {
  // Implementation would go here
}

export function getNoteById(id: string): Note | undefined {
  let note: Note | undefined;
  notesStore.subscribe(notes => {
    note = notes.find(n => n.id === id);
  })();
  return note;
}
