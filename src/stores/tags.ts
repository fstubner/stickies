import { writable } from 'svelte/store';

function createTagsStore() {
  const { subscribe, set, update } = writable<string[]>([]);

  return {
    subscribe,
    add: (tag: string) => update(tags => [...new Set([...tags, tag])]),
    remove: (tag: string) => update(tags => tags.filter(t => t !== tag)),
    getAll: () => {
      let tags: string[] = [];
      subscribe(t => tags = t)();
      return tags;
    }
  };
}

export const tagsStore = createTagsStore();
