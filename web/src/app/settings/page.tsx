'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { getDigestHistory, getSubscriptionStatus, createPortalSession, createCheckoutSession, Digest } from '@/lib/api';
import { formatDateShort, importanceColor, importanceLabel } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ChevronLeft,
  FileText,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Loader2,
  User,
  AtSign,
  Calendar,
  Shield,
  History,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, subscribed, logout } = useAuth();

  const [history, setHistory] = useState<Digest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    setLoadingHistory(true);
    Promise.all([
      getDigestHistory(30).then((r) => setHistory(r.digests)).catch(() => {}),
      getSubscriptionStatus()
        .then((r) => setSubStatus(r.subscription))
        .catch(() => {}),
    ]).finally(() => setLoadingHistory(false));
  }, [token]);

  async function handleManageBilling() {
    try {
      const { createPortalSession: cps } = await import('@/lib/api');
      const result = await cps();
      window.location.href = result.url;
    } catch {
      toast.error('Error al abrir portal de pagos');
    }
  }

  async function handleSubscribe() {
    try {
      const result = await createCheckoutSession({
        successUrl: `${window.location.origin}/settings`,
        cancelUrl: `${window.location.origin}/settings`,
      });
      window.location.href = result.url;
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al dashboard
        </Link>

        <h1 className="text-3xl font-bold text-white mb-10">Ajustes</h1>

        <div className="grid gap-8">
          {/* Profile */}
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-400" />
              Perfil
            </h2>
            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900/50">
                <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                    <AtSign className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900/50">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Google conectado</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Gmail · Drive · Calendar — permisos de solo lectura
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Subscription */}
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-400" />
              Suscripción
            </h2>

            {subStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/50">
                  <span className="text-sm text-neutral-400">Estado</span>
                  <StatusBadge status={subStatus.status} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/50">
                  <span className="text-sm text-neutral-400">Plan</span>
                  <span className="text-sm text-white font-medium">
                    {subStatus.plan === 'price_monthly' ? 'Pro Mensual' : 'Pro'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/50">
                  <span className="text-sm text-neutral-400">Ciclo actual hasta</span>
                  <span className="text-sm text-white font-medium">
                    {new Date(subStatus.currentPeriodEnd).toLocaleDateString('es-MX')}
                  </span>
                </div>
                {subStatus.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-400">
                      Tu suscripción se cancelará al final del período actual.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleManageBilling}
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Gestionar en Stripe
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-500 mb-4">Sin suscripción activa</p>
                <button
                  onClick={handleSubscribe}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Suscribirme por $29/mes
                </button>
              </div>
            )}
          </section>

          {/* History */}
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-400" />
              Historial de briefings
            </h2>

            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-6">
                Aún no hay briefings generados.
              </p>
            ) : (
              <div className="divide-y divide-neutral-800">
                {history.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard?date=${d.date}`}
                    className="flex items-center gap-4 py-4 group hover:bg-neutral-900/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-neutral-500 group-hover:text-brand-400 transition-colors" />
                    <span className="text-sm text-neutral-300 group-hover:text-white transition-colors flex-1">
                      {formatDateShort(d.date)}
                    </span>
                    <div className="flex gap-1.5">
                      {d.summary.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${importanceColor(e.importance)}`}
                        >
                          {importanceLabel(e.importance)}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-neutral-600">{d.summary.length} temas</span>
                    <ChevronLeft className="w-4 h-4 text-neutral-600 rotate-180 group-hover:text-neutral-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
