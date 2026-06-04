// ============================================================
// src/worker/summarizer-worker.js — BullMQ Worker
// Escucha la cola 'digest-generation' y procesa cada job.
// Desplegar en Railway / Render / VPS con Docker.
// ============================================================
import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { generateBriefing } from '../lib/openai.js';
import {
  fetchUnreadEmails,
  fetchRecentDriveFiles,
  fetchTodayCalendarEvents,
} from '../lib/google.js';
import { saveDigest, hasActiveSubscription, supabase } from '../lib/supabase.js';
import { sendDigestEmail } from '../lib/email.js';

function createRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('[Worker] REDIS_URL no configurado');
    process.exit(1);
  }

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    tls: url.startsWith('rediss://')
      ? { rejectUnauthorized: false }
      : undefined,
    retryStrategy: (times) => {
      if (times > 10) {
        console.error('[Worker] No se pudo reconectar a Redis después de 10 intentos.');
        return null;
      }
      return Math.min(times * 1000, 10000);
    },
  });
}

const connection = createRedisConnection();

const worker = new Worker(
  'digest-generation',
  async (job) => {
    const { userId, hoursBack = 48 } = job.data;

    console.log(`[Worker][${job.id}] Processing digest for user ${userId}`);

    // 1. Verificar suscripción activa
    const subscribed = await hasActiveSubscription(userId);
    if (!subscribed) {
      console.log(`[Worker][${job.id}] User ${userId} sin suscripción activa. Saltando.`);
      return { skipped: true, reason: 'no_subscription' };
    }

    // 2. Recolectar datos de Google (Gmail + Drive + Calendar)
    // Cada fetch es independiente — si uno falla, los otros continúan
    console.log(`[Worker][${job.id}] Fetching Google data for ${userId}...`);

    const [emails, driveFiles, calendarEvents] = await Promise.all([
      fetchUnreadEmails(userId, hoursBack).catch((err) => {
        console.error(`[Worker][${job.id}] Error fetching emails: ${err.message}`);
        return [];
      }),
      fetchRecentDriveFiles(userId, 3).catch((err) => {
        console.error(`[Worker][${job.id}] Error fetching Drive: ${err.message}`);
        return [];
      }),
      fetchTodayCalendarEvents(userId).catch((err) => {
        console.error(`[Worker][${job.id}] Error fetching calendar: ${err.message}`);
        return [];
      }),
    ]);

    const totalItems = emails.length + driveFiles.length + calendarEvents.length;
    console.log(
      `[Worker][${job.id}] User ${userId}: ${emails.length} emails, ${driveFiles.length} files, ${calendarEvents.length} events`
    );

    if (totalItems === 0) {
      console.log(`[Worker][${job.id}] Sin datos para ${userId}. Se reintentará en el próximo ciclo.`);
      return { skipped: true, reason: 'no_data', userId };
    }

    // 3. Generar briefing con GPT-4o
    console.log(`[Worker][${job.id}] Generating briefing via GPT-4o...`);
    const entries = await generateBriefing({ emails, driveFiles, calendarEvents });

    if (!entries || entries.length === 0) {
      console.log(`[Worker][${job.id}] GPT no generó entradas para ${userId}.`);
      return { skipped: true, reason: 'no_entries', userId };
    }

    // 4. Guardar en Supabase
    const today = new Date().toISOString().split('T')[0];
    await saveDigest(userId, today, entries);

    console.log(
      `[Worker][${job.id}] ✅ Digest saved for ${userId} on ${today} (${entries.length} entries)`
    );

    // 5. Enviar briefing por email (no-blocking — si falla, no detiene el worker)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.email) {
        await sendDigestEmail(
          userId,
          profile.name || 'usuario',
          profile.email,
          entries,
          today
        );
      } else {
        console.warn(`[Worker][${job.id}] No profile/email found for user ${userId}. Skipping email.`);
      }
    } catch (emailErr) {
      // No fatal — el briefing ya se guardó en Supabase
      console.error(`[Worker][${job.id}] Email sending failed (non-fatal):`, emailErr.message);
    }

    return {
      success: true,
      userId,
      date: today,
      entriesCount: entries.length,
    };
  },
  {
    connection,
    concurrency: 5, // Procesar hasta 5 usuarios simultáneamente
    limiter: {
      max: 10, // Máximo 10 jobs por segundo (respetar rate limits de Google/OpenAI)
      duration: 1000,
    },
    // Reintentar jobs que fallen (por si es rate limiting temporal)
    settings: {
      backoffStrategy: 'exponential',
    },
  }
);

worker.on('completed', (job, result) => {
  if (result?.skipped) {
    console.log(`[Worker][${job.id}] Skipped (${result.reason})`);
  } else {
    console.log(`[Worker][${job.id}] ✅ Completed:`, JSON.stringify(result));
  }
});

worker.on('failed', (job, err) => {
  console.error(`[Worker][${job?.id}] ❌ Failed after retries:`, err.message);
});

worker.on('error', (err) => {
  // Errores de conexión Redis — no fatal, el worker reconecta
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
    console.error('[Worker] Redis connection error (reconnecting...):', err.message);
  } else {
    console.error('[Worker] Unexpected error:', err.message);
  }
});

console.log('[Worker] 🟢 Summarizer worker started. Waiting for jobs...');
console.log(`[Worker] Concurrency: 5, Redis: ${process.env.REDIS_URL?.substring(0, 30)}...`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received. Closing worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received. Closing worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});
