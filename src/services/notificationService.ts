export interface SnoozeOption {
  label: string;
  duration: number;
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: '5 minutes', duration: 5 * 60000 },
  { label: '30 minutes', duration: 30 * 60000 },
  { label: '1 hour', duration: 60 * 60000 },
  { label: 'Tomorrow', duration: 24 * 60 * 60000 }
];

class NotificationService {
  async sendNotification(title: string, options?: any): Promise<void> {
    if ('Notification' in window) {
      new Notification(title, options);
    }
  }
}

export const notificationService = new NotificationService();

export async function snoozeNote(noteId: string, option: SnoozeOption): Promise<void> {
  // Implementation would go here
}
