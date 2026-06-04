'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Mail, FileText, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

const features = [
  {
    icon: Mail,
    title: 'Resume tus emails',
    desc: 'GPT-4o analiza tu bandeja de entrada y extrae solo lo que importa, ignorando newsletters y spam.',
  },
  {
    icon: FileText,
    title: 'Documentos clave',
    desc: 'Detecta cambios importantes en Google Drive: contratos, propuestas, reports financieros.',
  },
  {
    icon: Calendar,
    title: 'Eventos del día',
    desc: 'Sintetiza tu calendario con contexto: quién, qué, preparación necesaria.',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: 'para siempre',
    features: ['1 briefing de prueba', '1 fuente de datos', 'Dashboard básico'],
    cta: 'Probar gratis',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mes',
    features: [
      'Briefings diarios ilimitados',
      'Gmail + Drive + Calendar',
      'Historial de 30 días',
      'Soporte prioritario',
    ],
    cta: 'Comenzar',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/mes',
    features: [
      'Todo lo de Pro',
      'Briefings cada 4h',
      'Equipos de hasta 5 usuarios',
      'API access + webhooks',
      'Onboarding personalizado',
    ],
    cta: 'Contactar',
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            IA que trabaja mientras tú duermes
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Tu día, resumido en{' '}
            <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-brand-300 bg-clip-text text-transparent">
              30 segundos
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Briefly conecta tu Gmail, Drive y Calendar, procesa todo con IA,
            y te entrega un briefing ejecutivo cada mañana. Sin leer 200 emails.
            Sin perder tiempo.
          </p>

          <div className="flex items-center justify-center gap-4">
            <GoogleLoginButton
              className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
            >
              Conectar con Google
              <ArrowRight className="w-4 h-4" />
            </GoogleLoginButton>
            <Link
              href="#features"
              className="text-neutral-400 hover:text-white px-6 py-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 font-medium transition-colors"
            >
              Cómo funciona
            </Link>
          </div>

          <p className="text-sm text-neutral-600 mt-4">
            No requiere tarjeta de crédito • Configuración en 2 minutos
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
            Tres fuentes. Un briefing.
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-neutral-800 p-8 hover:border-neutral-700 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-5 group-hover:bg-brand-500/20 transition-colors">
                  <f.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Precios simples
          </h2>
          <p className="text-neutral-400 text-center mb-16 max-w-md mx-auto">
            Sin contratos anuales. Sin sorpresas. Cancela cuando quieras.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-brand-500/50 bg-brand-950/30 ring-1 ring-brand-500/20'
                    : 'border-neutral-800 bg-neutral-900/50'
                }`}
              >
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-neutral-500 text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <GoogleLoginButton
                  className={`text-center py-3 rounded-xl font-medium transition-all text-sm ${
                    plan.highlighted
                      ? 'bg-brand-600 hover:bg-brand-500 text-white'
                      : 'border border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {plan.cta}
                </GoogleLoginButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-neutral-600">
          <p>© 2026 Briefly AI. Hecho con ☕ por gente que también odia leer emails.</p>
        </div>
      </footer>
    </div>
  );
}
