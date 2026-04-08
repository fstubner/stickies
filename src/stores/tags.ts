import { writable, derived } from 'svelte/store';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

function createTagsStore() {
  const { subscribe, set, update } = writable<Tag[]>([]);

  return {
    subscribe,
    add: (tag: Tag) => {
      update(tags => [...tags, tag]);
    },
    remove: (id: string) => {
      update(tags => tags.filter(t => t.id !== id));
    },
    increment: (id: string) => {
      update(tags =>
        tags.map(t => (t.id === id ? { ...t, count: t.count + 1 } : t))
      );
    },
    decrement: (id: string) => {
      update(tags =>
        tags.map(t => (t.id === id ? { ...t, count: Math.max(0, t.count - 1) } : t))
      );
    },
    clear: () => set([])
  };
}

export const tags = createTagsStore();
