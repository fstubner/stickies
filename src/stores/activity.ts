import { writable } from 'svelte/store';

export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: Date;
  noteId: string;
  description: string;
}

function createActivityStore() {
  const { subscribe, set, update } = writable<ActivityItem[]>([]);

  return {
    subscribe,
    addActivity: (item: Omit<ActivityItem, 'id'>) => {
      update(items => [{ ...item, id: Math.random().toString() }, ...items]);
    },
    clear: () => set([])
  };
}

export const activityStore = createActivityStore();
