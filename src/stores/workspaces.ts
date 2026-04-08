import { writable, derived } from 'svelte/store';

export interface Workspace {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  notes: string[];
}

function createWorkspacesStore() {
  const { subscribe, set, update } = writable<Workspace[]>([]);

  return {
    subscribe,
    add: (workspace: Workspace) => {
      update(workspaces => [...workspaces, workspace]);
    },
    remove: (id: string) => {
      update(workspaces => workspaces.filter(w => w.id !== id));
    },
    update: (id: string, workspace: Partial<Workspace>) => {
      update(workspaces =>
        workspaces.map(w => (w.id === id ? { ...w, ...workspace } : w))
      );
    },
    clear: () => set([])
  };
}

export const workspaces = createWorkspacesStore();
