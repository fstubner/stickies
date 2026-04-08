import { BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import type { CalendarEvent } from '../types/shared';

// Google OAuth2 configuration
// NOTE: Replace with your actual Google Cloud Console credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:8088/callback';
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'];

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

const store = new Store<Record<string, any>>({
  name: 'stickies-settings',
});

/**
 * Check if Google Calendar is connected
 */
export function isGoogleCalendarConnected(): boolean {
  const tokens = store.get('googleCalendarTokens') as TokenData | undefined;
  return !!(tokens?.refresh_token);
}

/**
 * Get stored tokens
 */
function getTokens(): TokenData | null {
  return store.get('googleCalendarTokens') as TokenData | null;
}

/**
 * Save tokens
 */
function saveTokens(tokens: TokenData): void {
  store.set('googleCalendarTokens', tokens);
}

/**
 * Clear tokens (disconnect)
 */
function clearTokens(): void {
  store.delete('googleCalendarTokens');
}

/**
 * Check if token is expired
 */
function isTokenExpired(tokens: TokenData): boolean {
  if (!tokens.expires_at) return true;
  return Date.now() >= tokens.expires_at - 60000; // 1 minute buffer
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<TokenData | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[GoogleCalendar] OAuth credentials not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('[GoogleCalendar] Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();
    const tokens: TokenData = {
      access_token: data.access_token,
      refresh_token: refreshToken, // Keep the original refresh token
      expires_at: Date.now() + data.expires_in * 1000,
    };

    saveTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('[GoogleCalendar] Token refresh error:', error);
    return null;
  }
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens) return null;

  if (isTokenExpired(tokens) && tokens.refresh_token) {
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    return newTokens?.access_token || null;
  }

  return tokens.access_token;
}

/**
 * Start OAuth2 flow to connect Google Calendar
 */
export async function connectGoogleCalendar(): Promise<boolean> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[GoogleCalendar] OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    return false;
  }

  return new Promise((resolve) => {
    // Create a temporary local server to receive the OAuth callback
    const http = require('http');
    let server: any = null;
    let authWindow: BrowserWindow | null = null;

    const cleanup = () => {
      if (server) {
        try { server.close(); } catch {}
        server = null;
      }
      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close();
      }
      authWindow = null;
    };

    // Create HTTP server for OAuth callback
    server = http.createServer(async (req: any, res: any) => {
      const url = new URL(req.url, 'http://localhost:8088');

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
          cleanup();
          resolve(false);
          return;
        }

        if (code) {
          try {
            // Exchange code for tokens
            const params = new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              code,
              grant_type: 'authorization_code',
              redirect_uri: REDIRECT_URI,
            });

            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString(),
            });

            if (response.ok) {
              const data = await response.json();
              const tokens: TokenData = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: Date.now() + data.expires_in * 1000,
              };
              saveTokens(tokens);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><body><h1>Success!</h1><p>Google Calendar connected. You can close this window.</p></body></html>');
              cleanup();
              resolve(true);
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
              cleanup();
              resolve(false);
            }
          } catch (err) {
            console.error('[GoogleCalendar] Token exchange error:', err);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Error</h1><p>Something went wrong. You can close this window.</p></body></html>');
            cleanup();
            resolve(false);
          }
        }
      }
    });

    server.listen(8088, 'localhost', () => {
      // Build authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      // Open in browser for authentication
      shell.openExternal(authUrl.toString());
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (server) {
        cleanup();
        resolve(false);
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(): Promise<boolean> {
  clearTokens();
  return true;
}

/**
 * Fetch calendar events from Google Calendar
 */
export async function getCalendarEvents(
  startDate: string,
  endDate: string,
  calendarId = 'primary'
): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.error('[GoogleCalendar] No valid access token');
    return [];
  }

  try {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', new Date(startDate).toISOString());
    url.searchParams.set('timeMax', new Date(endDate).toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[GoogleCalendar] Failed to fetch events:', await response.text());
      return [];
    }

    const data = await response.json();
    const events: CalendarEvent[] = [];

    for (const item of data.items || []) {
      const event: CalendarEvent = {
        id: item.id,
        title: item.summary || 'Untitled Event',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
        allDay: !item.start?.dateTime,
        source: 'google',
        googleEventId: item.id,
        color: item.colorId ? getGoogleEventColor(item.colorId) : undefined,
      };
      events.push(event);
    }

    return events;
  } catch (error) {
    console.error('[GoogleCalendar] Error fetching events:', error);
    return [];
  }
}

/**
 * Create a calendar event in Google Calendar
 */
export async function createCalendarEvent(
  title: string,
  start: string,
  end: string,
  allDay = false,
  calendarId = 'primary'
): Promise<string | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.error('[GoogleCalendar] No valid access token');
    return null;
  }

  try {
    const event: any = {
      summary: title,
    };

    if (allDay) {
      event.start = { date: start.split('T')[0] };
      event.end = { date: end.split('T')[0] };
    } else {
      event.start = { dateTime: start };
      event.end = { dateTime: end };
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      console.error('[GoogleCalendar] Failed to create event:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('[GoogleCalendar] Error creating event:', error);
    return null;
  }
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: { title?: string; start?: string; end?: string; allDay?: boolean },
  calendarId = 'primary'
): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  try {
    // First get the existing event
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!getResponse.ok) return false;

    const existingEvent = await getResponse.json();
    const updatedEvent: any = { ...existingEvent };

    if (updates.title) updatedEvent.summary = updates.title;
    if (updates.start) {
      if (updates.allDay) {
        updatedEvent.start = { date: updates.start.split('T')[0] };
      } else {
        updatedEvent.start = { dateTime: updates.start };
      }
    }
    if (updates.end) {
      if (updates.allDay) {
        updatedEvent.end = { date: updates.end.split('T')[0] };
      } else {
        updatedEvent.end = { dateTime: updates.end };
      }
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[GoogleCalendar] Error updating event:', error);
    return false;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string, calendarId = 'primary'): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.ok || response.status === 404; // 404 means already deleted
  } catch (error) {
    console.error('[GoogleCalendar] Error deleting event:', error);
    return false;
  }
}

/**
 * Map Google Calendar color IDs to hex colors
 */
function getGoogleEventColor(colorId: string): string {
  const colors: Record<string, string> = {
    '1': '#7986cb', // Lavender
    '2': '#33b679', // Sage
    '3': '#8e24aa', // Grape
    '4': '#e67c73', // Flamingo
    '5': '#f6bf26', // Banana
    '6': '#f4511e', // Tangerine
    '7': '#039be5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3f51b5', // Blueberry
    '10': '#0b8043', // Basil
    '11': '#d50000', // Tomato
  };
  return colors[colorId] || '#4285f4'; // Default Google blue
}
