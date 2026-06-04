'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    active: {
      label: 'Activa',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    trialing: {
      label: 'Prueba',
      icon: <Loader2 className="w-3.5 h-3.5" />,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    past_due: {
      label: 'Pago pendiente',
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    canceled: {
      label: 'Cancelada',
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    incomplete: {
      label: 'Incompleta',
      icon: <Loader2 className="w-3.5 h-3.5" />,
      color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
    },
  };

  const c = config[status] || {
    label: status,
    icon: null,
    color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        c.color,
        className
      )}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
