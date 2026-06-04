// ============================================================
// src/api/routes/digest.js — Obtener briefings del usuario
// ============================================================
import { Router } from 'express';
import { requireAuth, requireSubscription } from '../middleware/auth.js';
import { getRecentDigests } from '../../lib/supabase.js';

export const digestRouter = Router();

/**
 * GET /api/digest/latest
 * Devuelve el briefing más reciente.
 */
digestRouter.get('/latest', requireAuth, requireSubscription, async (req, res) => {
  try {
    const digests = await getRecentDigests(req.userId, 1);
    if (!digests || digests.length === 0) {
      return res.json({ digest: null, message: 'Aún no hay briefing disponible. El próximo se generará en las próximas horas.' });
    }
    res.json({ digest: digests[0] });
  } catch (err) {
    console.error('[Digest] Error:', err);
    res.status(500).json({ error: 'Error al obtener briefing' });
  }
});

/**
 * GET /api/digest/history
 * Devuelve los últimos N briefings.
 */
digestRouter.get('/history', requireAuth, requireSubscription, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '7'), 30);
    const digests = await getRecentDigests(req.userId, limit);
    res.json({ digests });
  } catch (err) {
    console.error('[Digest] History error:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});
