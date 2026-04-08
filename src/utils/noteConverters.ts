import type { Note } from '../types';

export function noteToMarkdown(note: Note): string {
  return `# ${note.title}\n\n${note.content}`;
}

export function markdownToNote(markdown: string): Partial<Note> {
  const lines = markdown.split('\n');
  let title = 'Untitled';
  let content = markdown;

  if (lines[0].startsWith('# ')) {
    title = lines[0].substring(2);
    content = lines.slice(1).join('\n').trim();
  }

  return { title, content };
}

export function noteToJSON(note: Note): string {
  return JSON.stringify(note, null, 2);
}

export function jsonToNote(json: string): Note {
  return JSON.parse(json);
}
