// ============================================================
// src/api/middleware/auth.js — JWT + verificación suscripción
// ============================================================
import jwt from 'jsonwebtoken';
import { hasActiveSubscription } from '../../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: verifica JWT y adjunta userId a la request.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware: requiere suscripción activa.
 */
export function requireSubscription(req, res, next) {
  hasActiveSubscription(req.userId)
    .then((active) => {
      if (!active) {
        return res.status(402).json({ error: 'Suscripción requerida' });
      }
      next();
    })
    .catch((err) => {
      console.error('[Auth] Error checking subscription:', err);
      return res.status(500).json({ error: 'Error de verificación' });
    });
}
