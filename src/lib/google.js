// ============================================================
// src/lib/google.js — Conexión Google APIs (Gmail, Drive, Calendar)
// ============================================================
import { google } from 'googleapis';
import { googleAuth } from './googleAuth.js';
import pRetry from 'p-retry';

/**
 * Obtiene emails no leídos de las últimas N horas.
 */
export async function fetchUnreadEmails(userId, hoursBack = 48) {
  const auth = await googleAuth(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const afterEpoch = Math.floor(Date.now() / 1000) - hoursBack * 3600;
  const query = `is:unread after:${afterEpoch} category:primary`;

  const listRes = await pRetry(
    () => gmail.users.messages.list({ userId: 'me', q: query, maxResults: 20 }),
    { retries: 3 }
  );

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  // Fetch full content for each message (max 10 para no quemar cuota)
  const fullMessages = await Promise.all(
    messages.slice(0, 10).map(async (m) => {
      const detail = await pRetry(
        () =>
          gmail.users.messages.get({
            userId: 'me',
            id: m.id,
            format: 'full',
          }),
        { retries: 2 }
      );

      return parseGmailMessage(detail.data);
    })
  );

  return fullMessages;
}

/**
 * Parsea un mensaje de Gmail a estructura limpia.
 */
function parseGmailMessage(msg) {
  const headers = msg.payload.headers.reduce((acc, h) => {
    acc[h.name.toLowerCase()] = h.value;
    return acc;
  }, {});

  const body = extractEmailBody(msg.payload);

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: headers.subject || '(Sin asunto)',
    from: headers.from || '(Desconocido)',
    date: headers.date || msg.internalDate,
    snippet: msg.snippet || '',
    body,
  };
}

/**
 * Extrae el cuerpo del email (prioriza texto plano, fallback a HTML sin tags).
 */
function extractEmailBody(payload) {
  if (payload.mimeType === 'text/plain' && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.mimeType === 'text/html' && payload.body.data) {
    const html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    return html.replace(/<[^>]*>/g, '').substring(0, 3000);
  }
  if (payload.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === 'text/plain' && p.body.data
    );
    if (textPart) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
    for (const part of payload.parts) {
      const result = extractEmailBody(part);
      if (result) return result;
    }
  }
  return '(Contenido no disponible)';
}

/**
 * Obtiene los últimos N archivos modificados de Google Drive.
 */
export async function fetchRecentDriveFiles(userId, maxFiles = 5) {
  const auth = await googleAuth(userId);
  const drive = google.drive({ version: 'v3', auth });

  const res = await pRetry(
    () =>
      drive.files.list({
        pageSize: maxFiles,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
        q: "mimeType='application/vnd.google-apps.document' or mimeType='text/plain' or mimeType='application/pdf'",
      }),
    { retries: 2 }
  );

  return res.data.files || [];
}

/**
 * Obtiene eventos del calendario para hoy.
 */
export async function fetchTodayCalendarEvents(userId) {
  const auth = await googleAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const res = await pRetry(
    () =>
      calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        maxResults: 15,
        singleEvents: true,
        orderBy: 'startTime',
      }),
    { retries: 2 }
  );

  return (res.data.items || []).map((e) => ({
    summary: e.summary || '(Sin título)',
    description: e.description || '',
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    attendees: e.attendees?.map((a) => a.email) || [],
  }));
}
