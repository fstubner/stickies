import { writable } from 'svelte/store';

export interface CommandDef {
  id: string;
  label: string;
  description?: string;
  keybinding?: string;
}

function createCommandsStore() {
  const { subscribe, set } = writable<CommandDef[]>([]);

  return {
    subscribe,
    register: (cmd: CommandDef) => {
      // Implementation would go here
    },
    getAll: () => {
      // Implementation would go here
    }
  };
}

export const commandsStore = createCommandsStore();
