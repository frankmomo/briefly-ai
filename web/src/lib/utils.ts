import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function importanceColor(importance: string): string {
  switch (importance) {
    case 'alta':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'media':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'baja':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
  }
}

export function importanceLabel(importance: string): string {
  switch (importance) {
    case 'alta':
      return 'Alta';
    case 'media':
      return 'Media';
    case 'baja':
      return 'Baja';
    default:
      return importance;
  }
}
