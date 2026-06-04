'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeGoogleCode, getGoogleAuthUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-400">Cargando...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Google rechazó la autorización: ${errorParam}`);
      return;
    }

    if (!code) {
      setError('No se recibió código de autorización.');
      return;
    }

    (async () => {
      try {
        const result = await exchangeGoogleCode(code);
        login(result.token, result.user);
        router.push('/dashboard');
      } catch (err: any) {
        console.error('[Callback] Error:', err);
        setError(err.message || 'Error al procesar la autenticación.');
      }
    })();
  }, [searchParams, login, router]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const { url } = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setError('No se pudo obtener la URL de autenticación.');
      setRetrying(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Error de autenticación</h2>
          <p className="text-neutral-400 mb-8">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {retrying ? 'Redirigiendo...' : 'Intentar de nuevo'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="border border-neutral-700 text-neutral-300 hover:text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-4" />
        <p className="text-neutral-400">Autenticando con Google...</p>
      </div>
    </div>
  );
}
