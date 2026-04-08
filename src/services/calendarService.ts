export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
}

class CalendarService {
  async getUpcomingEvents(): Promise<CalendarEvent[]> {
    // Implementation would go here
    return [];
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    // Implementation would go here
    return { ...event, id: 'new-id' };
  }
}

export const calendarService = new CalendarService();
