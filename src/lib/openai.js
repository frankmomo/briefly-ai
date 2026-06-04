// ============================================================
// src/lib/openai.js — Motor de Síntesis con GPT-4o
// ============================================================
import OpenAI from 'openai';
import pRetry from 'p-retry';

if (!process.env.OPENAI_API_KEY) {
  console.warn('[OpenAI] WARN: OPENAI_API_KEY no configurado. Las solicitudes fallarán.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente ejecutivo de IA. Tu tarea es sintetizar información 
dispar (emails, documentos, eventos del calendario) en un briefing ultra-conciso y accionable.

REGLAS:
- Identifica los 3-5 temas más importantes del día.
- Para cada tema: (a) qué pasó, (b) por qué importa, (c) qué acción se requiere.
- Ignora newsletters, spam, notificaciones automáticas, notificaciones de redes sociales.
- Si hay urgencias (deadlines, pagos, reuniones importantes), márcalas con prioridad "alta".
- El briefing no debe exceder 250 palabras en total.
- Cada entry.summary debe ser conciso (máximo 2 oraciones).
- Usa español neutro claro.
- Responde SOLO con el JSON especificado, sin markdown ni explicaciones adicionales.`;

/**
 * Genera un briefing a partir de datos crudos.
 * @param {Object} input - { emails: Array, driveFiles: Array, calendarEvents: Array }
 * @returns {Promise<Array<{topic: string, importance: string, summary: string, action: string}>>}
 */
export async function generateBriefing(input) {
  const userContent = buildUserContent(input);

  const response = await pRetry(
    () =>
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1200,
      }),
    {
      retries: 2,
      onFailedAttempt: (err) => {
        console.warn('[OpenAI] Retry attempt:', err.message);
      },
    }
  );

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    console.warn('[OpenAI] Respuesta vacía de GPT');
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    const entries = parsed.entries || parsed.briefing || [];

    if (!Array.isArray(entries)) {
      console.warn('[OpenAI] Respuesta inesperada de GPT, entries no es array:', typeof entries);
      return [];
    }

    // Validar estructura de cada entry
    return entries
      .filter((e) => e.topic || e.summary) // Filtrar entradas vacías
      .map((e) => ({
        topic: e.topic || '(Sin título)',
        importance: ['alta', 'media', 'baja'].includes(e.importance) ? e.importance : 'media',
        summary: e.summary || e.descripcion || e.description || '',
        action: e.action || e.accion || e.next_step || '',
      }));
  } catch (parseErr) {
    console.error('[OpenAI] Error parseando respuesta JSON de GPT:', parseErr.message);
    console.error('[OpenAI] Raw response:', raw.substring(0, 500));
    return [];
  }
}

/**
 * Construye el prompt con los datos del usuario, limitando tamaño para no exceder tokens.
 */
function buildUserContent({ emails, driveFiles, calendarEvents }) {
  let content = '### EMAILS NO LEÍDOS RECIENTES\n';

  const maxEmails = Math.min(emails?.length || 0, 8);
  for (let i = 0; i < maxEmails; i++) {
    const e = emails[i];
    content += `- [${e.from || 'remitente desconocido'}] "${e.subject || '(sin asunto)'}"`;
    if (e.snippet) content += `: ${e.snippet.substring(0, 150)}`;
    content += '\n';
  }

  content += '\n### DOCUMENTOS RECIENTES EN DRIVE\n';
  const maxFiles = Math.min(driveFiles?.length || 0, 3);
  for (let i = 0; i < maxFiles; i++) {
    const d = driveFiles[i];
    content += `- "${d.name || 'sin nombre'}" (${d.mimeType || 'desconocido'}`);
    if (d.modifiedTime) content += `, modificado: ${new Date(d.modifiedTime).toLocaleDateString('es-MX')}`;
    content += ')\n';
  }

  content += '\n### EVENTOS DEL CALENDARIO (HOY)\n';
  const maxEvents = Math.min(calendarEvents?.length || 0, 8);
  for (let i = 0; i < maxEvents; i++) {
    const ev = calendarEvents[i];
    const time = ev.start
      ? new Date(ev.start).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : 'horario no especificado';
    const attendees = ev.attendees?.length
      ? `con ${ev.attendees.slice(0, 3).join(', ')}${ev.attendees.length > 3 ? ` y ${ev.attendees.length - 3} más` : ''}`
      : 'sin invitados';
    content += `- "${ev.summary || '(sin título)'}" a las ${time}, ${attendees}\n`;
  }

  content +=
    '\n\nGenera el briefing del día en formato JSON: { "entries": [ { "topic": string, "importance": "alta"|"media"|"baja", "summary": string, "action": string } ] }. ' +
    'SOLO devuelve JSON. Sin markdown. Sin explicaciones.';

  return content;
}
