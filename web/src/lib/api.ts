// ============================================================
// src/lib/api.ts — Cliente API tipado
// ============================================================

const API_BASE = '/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('briefly_token');
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `Error ${res.status}`);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ────────────────────────────────────────────────

export function getGoogleAuthUrl(): Promise<{ url: string; state: string }> {
  return request('/auth/google/url', { skipAuth: true });
}

export function exchangeGoogleCode(
  code: string
): Promise<{ token: string; user: { id: string; email: string; name: string }; expiresInDays: number }> {
  return request(`/auth/google/callback?code=${encodeURIComponent(code)}`, {
    skipAuth: true,
  });
}

// ─── Billing ─────────────────────────────────────────────

export function createCheckoutSession(data: {
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ url: string; sessionId: string }> {
  return request('/billing/create-checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createPortalSession(): Promise<{ url: string }> {
  return request('/billing/create-portal', {
    method: 'POST',
  });
}

export function getSubscriptionStatus(): Promise<{
  active: boolean;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}> {
  return request('/billing/status');
}

// ─── Digest ──────────────────────────────────────────────

export interface DigestEntry {
  topic: string;
  importance: 'alta' | 'media' | 'baja';
  summary: string;
  action: string;
}

export interface Digest {
  id: number;
  user_id: string;
  date: string;
  summary: DigestEntry[];
  created_at: string;
}

export function getLatestDigest(): Promise<{ digest: Digest | null; message?: string }> {
  return request('/digest/latest');
}

export function getDigestHistory(limit = 7): Promise<{ digests: Digest[] }> {
  return request(`/digest/history?limit=${limit}`);
}
