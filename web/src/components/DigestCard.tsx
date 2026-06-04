'use client';

import React from 'react';
import { cn, importanceColor, importanceLabel } from '@/lib/utils';
import type { DigestEntry } from '@/lib/api';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const importanceIcon = {
  alta: AlertTriangle,
  media: AlertCircle,
  baja: Info,
};

export function DigestCard({
  entry,
  index,
}: {
  entry: DigestEntry;
  index: number;
}) {
  const Icon = importanceIcon[entry.importance] || Info;

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-5 transition-all duration-200',
        'hover:border-neutral-700 hover:bg-neutral-900/50',
        importanceColor(entry.importance)
      )}
    >
      <div className="flex items-start gap-4">
        {/* Número y badge de importancia */}
        <div className="flex flex-col items-center gap-2 min-w-[36px]">
          <span className="text-xs font-mono text-neutral-600">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1',
            importanceColor(entry.importance)
          )}>
            <Icon className="w-3 h-3" />
            {importanceLabel(entry.importance)}
          </span>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-2 leading-snug">
            {entry.topic}
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed mb-3">
            {entry.summary}
          </p>
          {entry.action && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider shrink-0 mt-0.5">
                Acción:
              </span>
              <span className="text-sm text-brand-300">{entry.action}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
