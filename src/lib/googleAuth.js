// ============================================================
// src/lib/googleAuth.js — OAuth2 Client + Refresh Token Mgmt
// ============================================================
import { google } from 'googleapis';
import { getGoogleTokens, saveGoogleTokens } from './supabase.js';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('[GoogleAuth] WARN: GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados.');
}

/**
 * Crea la instancia OAuth2 configurada.
 */
export function createOAuth2Client() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth no configurado. Revisa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env');
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Genera la URL de consentimiento OAuth.
 */
export function getAuthUrl(state) {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force refresh token on first auth (requerido para offline_access)
    state,
    include_granted_scopes: true,
  });
}

/**
 * Intercambia el código de autorización por tokens.
 */
export async function handleOAuthCallback(code) {
  const oauth2 = createOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  if (!tokens) {
    throw new Error('No se recibieron tokens de Google');
  }

  if (!tokens.refresh_token) {
    console.warn('[GoogleAuth] No refresh_token recibido. ' +
      'Esto ocurre si el usuario ya autorizó antes sin prompt=consent. ' +
      'El token expirará en 1 hora.');
  }

  return tokens;
}

/**
 * Obtiene un cliente autenticado para un userId, renovando token si expiró.
 * @param {string} userId - Google sub (ID único)
 * @returns {Promise<google.auth.OAuth2>}
 */
export async function googleAuth(userId) {
  if (!userId) throw new Error('userId requerido para googleAuth');

  const stored = await getGoogleTokens(userId);
  if (!stored) {
    throw new Error(`No hay tokens de Google para el usuario ${userId}. Debe autenticarse de nuevo.`);
  }

  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token || undefined,
    expiry_date: stored.expiry_date
      ? new Date(stored.expiry_date).getTime()
      : undefined,
  });

  // Listener para tokens renovados automáticamente por la librería
  oauth2.on('tokens', async (newTokens) => {
    try {
      if (!newTokens) return;

      if (newTokens.refresh_token) {
        // Nuevo refresh token (raro, pero ocurre si rotan)
        await saveGoogleTokens(userId, {
          access_token: newTokens.access_token || stored.access_token,
          refresh_token: newTokens.refresh_token,
          scope: newTokens.scope || stored.scope,
          token_type: newTokens.token_type || stored.token_type,
          expiry_date: newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : stored.expiry_date,
        });
      } else if (newTokens.access_token) {
        // Solo nuevo access_token (caso común de refresh)
        await saveGoogleTokens(userId, {
          access_token: newTokens.access_token,
          refresh_token: stored.refresh_token, // preservar refresh original
          scope: stored.scope,
          token_type: stored.token_type,
          expiry_date: newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : stored.expiry_date,
        });
      }

      console.log(`[GoogleAuth] Tokens refreshed for user ${userId}`);
    } catch (err) {
      console.error(`[GoogleAuth] Error saving refreshed tokens for ${userId}:`, err.message);
    }
  });

  return oauth2;
}
