import { app } from 'electron';
import Store from 'electron-store';
import path from 'path';

interface StoreSchema {
  notes: any[];
  workspaces: any[];
  settings: Record<string, any>;
}

const store = new Store<StoreSchema>({
  schema: {
    notes: { type: 'array', default: [] },
    workspaces: { type: 'array', default: [] },
    settings: { type: 'object', default: {} }
  },
  cwd: path.join(app.getPath('userData'), 'stickies')
});

export function getNotes() {
  return store.get('notes', []);
}

export function saveNotes(notes: any[]) {
  store.set('notes', notes);
}

export function getWorkspaces() {
  return store.get('workspaces', []);
}

export function saveWorkspaces(workspaces: any[]) {
  store.set('workspaces', workspaces);
}

export function getSettings() {
  return store.get('settings', {});
}

export function saveSetting(key: string, value: any) {
  const settings = store.get('settings', {});
  settings[key] = value;
  store.set('settings', settings);
}
