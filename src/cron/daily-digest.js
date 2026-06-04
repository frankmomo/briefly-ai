// ============================================================
// src/cron/daily-digest.js — Cron que encola digests para usuarios activos
// Ejecutar con: node src/cron/daily-digest.js
// Programar como cron: "0 */6 * * *" (cada 6 horas)
// ============================================================
import 'dotenv/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getActiveSubscribersWithTokens } from '../lib/supabase.js';

function createRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('[Cron] REDIS_URL no configurado');
    process.exit(1);
  }

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    tls: url.startsWith('rediss://')
      ? { rejectUnauthorized: false }
      : undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('[Cron] No se pudo conectar a Redis después de 3 intentos.');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });
}

async function enqueueAllDigests() {
  console.log('[Cron] Iniciando enqueue de digests...');

  const connection = createRedisConnection();
  const digestQueue = new Queue('digest-generation', { connection });

  try {
    // Obtener solo usuarios con suscripción activa + tokens de Google
    const subscribers = await getActiveSubscribersWithTokens();

    if (!subscribers || subscribers.length === 0) {
      console.log('[Cron] No hay suscriptores activos con tokens configurados.');
      return;
    }

    console.log(`[Cron] Encolando briefings para ${subscribers.length} usuarios...`);

    const jobs = subscribers.map((sub) => ({
      name: `digest-${sub.user_id}-${Date.now()}`,
      data: {
        userId: sub.user_id,
        hoursBack: 48, // Buscar emails de las últimas 48h
      },
      opts: {
        removeOnComplete: { age: 3600 * 24 * 7 }, // Mantener registro 7 días
        removeOnFail: { age: 3600 * 24 * 7 },
        attempts: 3, // Reintentar hasta 3 veces si falla
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 min, 2 min, 4 min
        },
      },
    }));

    // Añadir jobs en batch (evita rate limiting)
    const batchSize = 10;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const added = await digestQueue.addBulk(batch);
      console.log(`[Cron] Batch ${Math.floor(i / batchSize) + 1}: ${added.length} jobs encolados`);

      // Pequeña pausa entre batches para no saturar Redis
      if (i + batchSize < jobs.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(`[Cron] Total: ${jobs.length} jobs encolados exitosamente.`);
  } catch (err) {
    console.error('[Cron] Error:', err.message);
    throw err;
  } finally {
    await connection.quit();
    console.log('[Cron] Conexión Redis cerrada.');
  }
}

enqueueAllDigests()
  .catch((err) => {
    console.error('[Cron] Fatal:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
