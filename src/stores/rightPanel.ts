import { writable } from 'svelte/store';

export interface RightPanelState {
  isOpen: boolean;
  contentType: 'note' | 'settings' | null;
  contentId?: string;
}

function createRightPanelStore() {
  const { subscribe, set } = writable<RightPanelState>({
    isOpen: false,
    contentType: null
  });

  return {
    subscribe,
    openNote: (id: string) => set({ isOpen: true, contentType: 'note', contentId: id }),
    close: () => set({ isOpen: false, contentType: null })
  };
}

export const rightPanelStore = createRightPanelStore();
