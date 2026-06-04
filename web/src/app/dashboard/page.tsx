'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { DigestCard } from '@/components/DigestCard';
import { DigestSkeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { getLatestDigest, createCheckoutSession, Digest } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Sparkles,
  Mail,
  FileText,
  Calendar,
  RefreshCw,
  CreditCard,
  AlertCircle,
  Brain,
  Clock,
  Zap,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    token,
    loading: authLoading,
    subscribed,
    subscriptionChecked,
  } = useAuth();

  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proteger ruta — esperar a que auth termine de cargar
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/');
    }
  }, [authLoading, token, router]);

  // Cargar digest cuando el estado de auth y suscripción estén listos
  useEffect(() => {
    if (!token || !user || !subscriptionChecked) return;
    loadDigest();
  }, [token, user, subscribed, subscriptionChecked]);

  async function loadDigest() {
    try {
      setLoading(true);
      setError(null);

      if (!subscribed) {
        // No cargar digest si no está suscrito
        setLoading(false);
        return;
      }

      const result = await getLatestDigest();
      if (result.digest) {
        setDigest(result.digest);
      }
    } catch (err: any) {
      if (err.status !== 402) {
        setError(err.message || 'Error al cargar el briefing');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    toast.loading('Generando nuevo briefing...', { id: 'refresh' });
    try {
      await loadDigest();
      toast.success('Briefing actualizado', { id: 'refresh' });
    } catch (err: any) {
      toast.error(err.message || 'Error al refrescar', { id: 'refresh' });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubscribe() {
    try {
      const result = await createCheckoutSession({
        successUrl: `${window.location.origin}/dashboard`,
        cancelUrl: `${window.location.origin}/dashboard`,
      });
      window.location.href = result.url;
    } catch (err: any) {
      toast.error(err.message || 'Error al crear sesión de pago');
    }
  }

  async function handleManageSubscription() {
    try {
      // Import dinámico para evitar circular dependency
      const apiModule = await import('@/lib/api');
      const result = await apiModule.createPortalSession();
      window.location.href = result.url;
    } catch {
      toast.error('Error al abrir portal de pagos');
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Buenos días, {user.name?.split(' ')[0] || 'usuario'} 👋
            </h1>
            <p className="text-neutral-500 text-sm">
              {digest
                ? `Briefing del ${formatDate(digest.date)}`
                : subscribed
                  ? 'Tu próximo briefing se está generando...'
                  : 'Conecta tu Google para empezar'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded-lg transition-all"
            >
              <Settings className="w-4 h-4" />
              Ajustes
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing || !subscribed || loading}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-8">
          {/* Main content */}
          <div>
            {!subscribed && subscriptionChecked ? (
              /* Upgrade prompt */
              <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-950/50 to-violet-950/30 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Activa tu suscripción
                </h2>
                <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                  Por solo <strong className="text-white">$29/mes</strong> recibirás
                  tu briefing ejecutivo diario con análisis de emails, documentos y calendario.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleSubscribe}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all inline-flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Suscribirme por $29/mes
                  </button>
                  <p className="text-xs text-neutral-600">
                    Cancela cuando quieras. Sin compromiso.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-medium mb-1">Error al cargar</p>
                <p className="text-sm text-red-400/60 mb-4">{error}</p>
                <button
                  onClick={loadDigest}
                  className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : loading ? (
              <DigestSkeleton />
            ) : digest && digest.summary && digest.summary.length > 0 ? (
              <div className="space-y-4">
                {digest.summary.map((entry, i) => (
                  <DigestCard key={i} entry={entry} index={i} />
                ))}
              </div>
            ) : subscribed ? (
              <div className="rounded-xl border border-neutral-800 p-12 text-center">
                <Brain className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Aún no hay briefing
                </h3>
                <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
                  El sistema está procesando tu información. Los briefings se generan
                  automáticamente cada 6 horas.
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2"
                >
                  Solicitar generación ahora
                </button>
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-800 p-5">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Resumen
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    Briefings
                  </div>
                  <span className="text-sm font-medium text-white">
                    {digest ? digest.summary.length : 0} temas
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    Gmail
                  </div>
                  <span className="text-sm font-medium text-white">Conectado</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Drive
                  </div>
                  <span className="text-sm font-medium text-white">Conectado</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Calendar className="w-4 h-4 text-violet-500" />
                    Calendar
                  </div>
                  <span className="text-sm font-medium text-white">Conectado</span>
                </div>
              </div>
            </div>

            {/* Suscripción */}
            <div className="rounded-xl border border-neutral-800 p-5">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Suscripción
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Estado</span>
                  <StatusBadge status={subscribed ? 'active' : 'canceled'} />
                </div>
                {subscribed ? (
                  <button
                    onClick={handleManageSubscription}
                    className="w-full text-sm text-center text-neutral-500 hover:text-brand-400 transition-colors pt-2 border-t border-neutral-800"
                  >
                    Gestionar suscripción →
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    className="w-full text-sm text-center text-brand-500 hover:text-brand-400 transition-colors pt-2 border-t border-neutral-800 font-medium"
                  >
                    Suscribirse →
                  </button>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-neutral-800 p-5">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Próximamente
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-neutral-500">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Briefings cada 4h
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-500">
                  <Mail className="w-3.5 h-3.5 text-brand-500" />
                  Envío por email
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-500">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  Resumen semanal
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
