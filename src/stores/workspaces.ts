import { writable } from 'svelte/store';

export interface Workspace {
  id: string;
  name: string;
  color?: string;
}

function createWorkspacesStore() {
  const { subscribe, set, update } = writable<Workspace[]>([]);

  return {
    subscribe,
    add: (workspace: Workspace) => update(ws => [...ws, workspace]),
    update: (id: string, changes: Partial<Workspace>) => {
      update(ws => ws.map(w => w.id === id ? { ...w, ...changes } : w));
    },
    remove: (id: string) => update(ws => ws.filter(w => w.id !== id))
  };
}

export const workspacesStore = createWorkspacesStore();
