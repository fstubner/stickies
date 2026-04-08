import { writable } from 'svelte/store';

export interface Command {
  id: string;
  name: string;
  description: string;
  keybinding?: string;
  handler: () => void | Promise<void>;
}

function createCommandStore() {
  const { subscribe, set, update } = writable<Command[]>([]);

  return {
    subscribe,
    register: (command: Command) => {
      update(commands => [...commands, command]);
    },
    unregister: (id: string) => {
      update(commands => commands.filter(c => c.id !== id));
    },
    execute: async (id: string) => {
      const command = ([] as Command[]).find(c => c.id === id);
      if (command) {
        await command.handler();
      }
    },
    clear: () => set([])
  };
}

export const commands = createCommandStore();
