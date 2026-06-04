// ============================================================
// src/api/routes/auth.js — OAuth Google + JWT
// ============================================================
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { getAuthUrl, handleOAuthCallback } from '../../lib/googleAuth.js';
import { upsertProfile, saveGoogleTokens } from '../../lib/supabase.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_TTL = parseInt(process.env.SESSION_TTL_DAYS || '30');

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[Auth] ERROR: JWT_SECRET debe tener al menos 32 caracteres.');
  process.exit(1);
}

/**
 * GET /api/auth/google/url
 * Devuelve la URL de autorización de Google.
 */
authRouter.get('/google/url', (_req, res) => {
  try {
    const state = crypto.randomUUID();
    const url = getAuthUrl(state);
    res.json({ url, state });
  } catch (err) {
    console.error('[Auth] Error generating URL:', err);
    res.status(500).json({ error: 'Error al generar URL de autenticación' });
  }
});

/**
 * GET /api/auth/google/callback
 * Intercambia code por tokens, upsert perfil, genera JWT.
 */
authRouter.get('/google/callback', async (req, res) => {
  try {
    const { code, error: oauthError } = req.query;
    if (oauthError) {
      return res.status(400).json({ error: `Google auth error: ${oauthError}` });
    }
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    // 1. Intercambiar code por tokens
    const tokens = await handleOAuthCallback(code);

    if (!tokens.id_token) {
      return res.status(400).json({ error: 'No se recibió id_token de Google' });
    }

    // 2. Verificar id_token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.status(400).json({ error: 'Token ID inválido' });
    }

    const { sub: googleId, email, name } = payload;
    if (!googleId || !email) {
      return res.status(400).json({ error: 'Datos de usuario incompletos' });
    }

    // 3. Crear/actualizar perfil y guardar tokens
    await upsertProfile(googleId, email, name || email.split('@')[0]);
    await saveGoogleTokens(googleId, tokens);

    // 4. Generar JWT
    const jwtToken = jwt.sign(
      { userId: googleId, email },
      JWT_SECRET,
      { expiresIn: `${SESSION_TTL}d` }
    );

    res.json({
      token: jwtToken,
      user: {
        id: googleId,
        email,
        name: name || email.split('@')[0],
      },
      expiresInDays: SESSION_TTL,
    });
  } catch (err) {
    console.error('[Auth] Google callback error:', err);
    res.status(500).json({
      error: 'Error al autenticar con Google',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
    });
  }
});
