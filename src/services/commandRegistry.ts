import type { Command } from '../types';

class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(id: string, command: Command): void {
    this.commands.set(id, command);
  }

  execute(id: string, args?: any): void {
    const command = this.commands.get(id);
    if (command) {
      command.execute(args);
    }
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const commandRegistry = new CommandRegistry();
