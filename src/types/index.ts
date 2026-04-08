export type { Note } from './Note';

export interface Command {
  id: string;
  label: string;
  execute(args?: any): void;
}
