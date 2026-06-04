-- ============================================================
-- BRIEFLY AI — Supabase Schema (ejecutar en SQL Editor)
-- ============================================================

-- 1. Profiles (usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          TEXT PRIMARY KEY,  -- Google sub (ID único de Google)
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario solo ve su propio perfil
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

-- Nota: el service_role key bypass RLS, necesario para el worker.

-- 3. Digests (briefings generados)
CREATE TABLE IF NOT EXISTS public.digests (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  summary     JSONB NOT NULL DEFAULT '[]', -- { entries: [...] }
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_digests_user_date ON public.digests(user_id, date DESC);

ALTER TABLE public.digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own digests"
  ON public.digests FOR SELECT
  USING (user_id = current_setting('app.user_id'));

-- 4. Stripe Customers (mapping userId -> stripeCustomerId)
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             TEXT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT NOT NULL UNIQUE,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stripe_customers_user ON public.stripe_customers(user_id);

-- 5. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               TEXT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL, -- active, past_due, canceled, trialing, incomplete
  plan_id               TEXT NOT NULL,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
