'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-neutral-800',
        className
      )}
    />
  );
}

export function DigestSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-neutral-800 p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2 min-w-[36px]">
              <Skeleton className="w-6 h-4" />
              <Skeleton className="w-16 h-5 rounded-full" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-12 w-full rounded-lg mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('animate-spin text-brand-500', className)} />
  );
}
