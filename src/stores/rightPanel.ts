import { writable } from 'svelte/store';

export type RightPanelMode = 'none' | 'note-detail' | 'ai-suggestions' | 'calendar' | 'settings';

interface RightPanelState {
  mode: RightPanelMode;
  noteId?: string;
  data?: any;
}

const initialState: RightPanelState = {
  mode: 'none'
};

function createRightPanelStore() {
  const { subscribe, set, update } = writable<RightPanelState>(initialState);

  return {
    subscribe,
    setMode: (mode: RightPanelMode, data?: any) =>
      update(state => ({ ...state, mode, data })),
    setNoteDetail: (noteId: string) =>
      update(state => ({ ...state, mode: 'note-detail', noteId })),
    close: () => set(initialState),
    reset: () => set(initialState)
  };
}

export const rightPanel = createRightPanelStore();
