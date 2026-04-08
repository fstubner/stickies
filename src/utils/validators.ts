import { ValidationError } from './errors';

export function validateNoteTitle(title: string): void {
  if (!title || title.trim().length === 0) {
    throw new ValidationError('Note title cannot be empty');
  }
  if (title.length > 200) {
    throw new ValidationError('Note title must be less than 200 characters');
  }
}

export function validateNoteContent(content: string): void {
  if (content.length > 1000000) {
    throw new ValidationError('Note content is too large');
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
