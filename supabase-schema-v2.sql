-- ============================================================
-- BRIEFLY AI — Esquema COMPLETO (v2.0)
-- Ejecutar TODO en el SQL Editor de Supabase
-- ============================================================

-- ==================== TABLAS ====================

-- 1. Profiles (usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          TEXT PRIMARY KEY,  -- Google sub
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = current_setting('app.user_id'));

-- 2. Google OAuth Tokens
CREATE TABLE IF NOT EXISTS public.google_tokens (
  id            BIGSERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  scope         TEXT,
  token_type    TEXT DEFAULT 'Bearer',
  expiry_date   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own google tokens"
  ON public.google_tokens FOR SELECT
  USING (user_id = current_setting('app.user_id'));

CREATE INDEX IF NOT EXISTS idx_google_tokens_user ON public.google_tokens(user_id);

-- 3. Digests (briefings generados)
CREATE TABLE IF NOT EXISTS public.digests (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  summary     JSONB NOT NULL DEFAULT '[]',
  email_sent  BOOLEAN DEFAULT false,             -- ← NUEVO: tracking de envío
  email_sent_at  TIMESTAMPTZ,                    -- ← NUEVO: cuándo se envió
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_digests_user_date ON public.digests(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_digests_email_pending ON public.digests(user_id, email_sent)
  WHERE email_sent = false;

ALTER TABLE public.digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own digests"
  ON public.digests FOR SELECT
  USING (user_id = current_setting('app.user_id'));

-- 4. Stripe Customers
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             TEXT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT NOT NULL UNIQUE,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON public.stripe_customers(user_id);

-- 5. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               TEXT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL,
  plan_id               TEXT NOT NULL,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(user_id)
  WHERE status IN ('active', 'trialing');

-- ==================== FUNCIONES ====================

-- Configura el user_id en la sesión para RLS
-- Usar: SELECT set_config('app.user_id', 'google-sub-id', false);
-- El worker usa service_role key, que bypass RLS.

-- ==================== VISTAS ÚTILES ====================

-- Vista: suscriptores activos con tokens (para el cron)
CREATE OR REPLACE VIEW public.active_subscribers_with_tokens AS
SELECT
  s.user_id,
  s.status,
  s.current_period_end,
  p.name,
  p.email
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
WHERE s.status IN ('active', 'trialing')
  AND s.current_period_end > now()
  AND EXISTS (
    SELECT 1 FROM google_tokens gt
    WHERE gt.user_id = s.user_id
  );

-- Vista: digests pendientes de envío por email
CREATE OR REPLACE VIEW public.pending_email_digests AS
SELECT
  d.id AS digest_id,
  d.user_id,
  d.date,
  d.summary,
  p.name,
  p.email
FROM digests d
JOIN profiles p ON p.id = d.user_id
WHERE d.email_sent = false;
