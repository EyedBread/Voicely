import { google, calendar_v3 } from "googleapis";
import { config } from "../../config.js";
import { getUserCalendarAuth } from "../../googleOAuth.js";

// ---------------------------------------------------------------------------
// Google Calendar API client
// Supports two auth modes:
//   1. Per-user OAuth tokens (preferred — from "Connect Calendar" flow)
//   2. Service Account fallback (legacy — from env vars)
// ---------------------------------------------------------------------------

function getCalendarClient(userId?: number): calendar_v3.Calendar {
  // Try per-user OAuth first
  if (userId) {
    const oauth2Client = getUserCalendarAuth(userId);
    if (oauth2Client) {
      return google.calendar({ version: "v3", auth: oauth2Client });
    }
  }

  // Fall back to service account
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.googleCalendar.serviceAccountEmail,
      // Private key comes from env with escaped newlines — unescape them.
      private_key: config.googleCalendar.privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

/** The calendar ID to operate on (defaults to "primary"). */
function calendarId(): string {
  return config.googleCalendar.calendarId || "primary";
}

// ---------------------------------------------------------------------------
// checkAvailability
// ---------------------------------------------------------------------------

export async function checkAvailability(
  date: string,
  timeStart: string,
  timeEnd: string,
  userId?: number
): Promise<Record<string, unknown>> {
  const calendar = getCalendarClient(userId);

  const timeMin = new Date(`${date}T${timeStart}`).toISOString();
  const timeMax = new Date(`${date}T${timeEnd}`).toISOString();

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: calendarId() }],
    },
  });

  const busy = res.data.calendars?.[calendarId()]?.busy ?? [];
  const available = busy.length === 0;

  return {
    available,
    date,
    time_start: timeStart,
    time_end: timeEnd,
    conflicts: busy.map((b) => ({
      start: b.start,
      end: b.end,
    })),
    message: available
      ? "You are free during this time."
      : `You have ${busy.length} conflicting event(s) during this time.`,
  };
}

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

export async function createEvent(
  title: string,
  date: string,
  timeStart: string,
  timeEnd: string,
  description?: string,
  location?: string,
  userId?: number
): Promise<Record<string, unknown>> {
  const calendar = getCalendarClient(userId);

  const event: calendar_v3.Schema$Event = {
    summary: title,
    description: description ?? undefined,
    location: location ?? undefined,
    start: {
      dateTime: new Date(`${date}T${timeStart}`).toISOString(),
    },
    end: {
      dateTime: new Date(`${date}T${timeEnd}`).toISOString(),
    },
  };

  const res = await calendar.events.insert({
    calendarId: calendarId(),
    requestBody: event,
  });

  return {
    success: true,
    event_id: res.data.id,
    title,
    date,
    time_start: timeStart,
    time_end: timeEnd,
    link: res.data.htmlLink,
    message: `Event "${title}" created successfully.`,
  };
}

// ---------------------------------------------------------------------------
// listUpcomingEvents
// ---------------------------------------------------------------------------

export async function listUpcomingEvents(
  count: number = 5,
  userId?: number
): Promise<Record<string, unknown>> {
  const calendar = getCalendarClient(userId);

  const res = await calendar.events.list({
    calendarId: calendarId(),
    timeMin: new Date().toISOString(),
    maxResults: count,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = (res.data.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary,
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    location: e.location ?? null,
  }));

  return {
    count: events.length,
    events,
    message:
      events.length > 0
        ? `You have ${events.length} upcoming event(s).`
        : "You have no upcoming events.",
  };
}
