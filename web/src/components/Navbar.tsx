'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, LogOut, Settings, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const { user, token, logout } = useAuth();

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={token ? '/dashboard' : '/'} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-white group-hover:text-brand-300 transition-colors">
            Briefly
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {token && user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                Ajustes
              </Link>
              <div className="flex items-center gap-3 pl-4 border-l border-neutral-800">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <a
              href={process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL || '/api/auth/google/url'}
              className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Iniciar sesión
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
