// ============================================================
// src/lib/supabase.js — Cliente Supabase
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] WARN: SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Crea o actualiza un usuario en la tabla `profiles`.
 */
export async function upsertProfile(userId, email, name) {
  if (!userId || !email) throw new Error('userId y email son requeridos');

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        name: name || email.split('@')[0],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw new Error(`Supabase upsertProfile: ${error.message}`);
  return data;
}

/**
 * Guarda tokens de Google para un usuario.
 */
export async function saveGoogleTokens(userId, tokens) {
  if (!userId) throw new Error('userId requerido');
  if (!tokens || !tokens.access_token) throw new Error('access_token requerido');

  const { error } = await supabase.from('google_tokens').upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      scope: tokens.scope || null,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date
        ? typeof tokens.expiry_date === 'number'
          ? new Date(tokens.expiry_date).toISOString()
          : tokens.expiry_date
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id', ignoreDuplicates: false }
  );

  if (error) throw new Error(`Supabase saveGoogleTokens: ${error.message}`);
}

/**
 * Obtiene tokens de Google para un usuario.
 */
export async function getGoogleTokens(userId) {
  if (!userId) throw new Error('userId requerido');

  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // maybeSingle no lanza error si no encuentra

  if (error) throw new Error(`Supabase getGoogleTokens: ${error.message}`);
  return data || null;
}

/**
 * Guarda/actualiza un digest generado.
 */
export async function saveDigest(userId, date, summaryEntries) {
  if (!userId || !date) throw new Error('userId y date son requeridos');
  if (!Array.isArray(summaryEntries)) throw new Error('summaryEntries debe ser un array');

  const { error } = await supabase.from('digests').upsert(
    {
      user_id: userId,
      date,
      summary: summaryEntries,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date', ignoreDuplicates: false }
  );
  if (error) throw new Error(`Supabase saveDigest: ${error.message}`);
}

/**
 * Obtiene los últimos N digests de un usuario.
 */
export async function getRecentDigests(userId, limit = 7) {
  if (!userId) throw new Error('userId requerido');

  const { data, error } = await supabase
    .from('digests')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Supabase getRecentDigests: ${error.message}`);
  return data || [];
}

/**
 * Verifica si un usuario tiene suscripción activa.
 */
export async function hasActiveSubscription(userId) {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error(`[Supabase] hasActiveSubscription error: ${error.message}`);
      return false;
    }
    if (!data) return false;

    const status = data.status;
    const periodEnd = data.current_period_end;
    if (!periodEnd) return false;

    return (
      ['active', 'trialing'].includes(status) &&
      new Date(periodEnd) > new Date()
    );
  } catch (err) {
    console.error(`[Supabase] hasActiveSubscription exception: ${err.message}`);
    return false;
  }
}

/**
 * Obtiene usuarios activos con tokens de Google configurados.
 * Usado por el cron para saber a quiénes generar briefing.
 */
export async function getActiveSubscribersWithTokens() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      user_id,
      status,
      current_period_end,
      google_tokens!inner(user_id)
    `)
    .in('status', ['active', 'trialing']);

  if (error) {
    console.error(`[Supabase] getActiveSubscribersWithTokens error: ${error.message}`);
    return [];
  }

  // Filtrar por período vigente
  const now = new Date();
  return (data || []).filter((s) => {
    return s.current_period_end && new Date(s.current_period_end) > now;
  });
}
