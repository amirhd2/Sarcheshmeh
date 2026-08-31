'use client';

/* =========================================================================
   سرچشمه — LockBadge
   =========================================================================
   Shows a compact lock indicator when a year is locked.
   On mobile: just a lock icon (no text — prevents horizontal overflow).
   On desktop (sm+): icon + "سال قفل است" text.
   ========================================================================= */

import { Lock } from 'lucide-react';
import { faNum } from '@lib/jalali';

interface LockBadgeProps {
  year: number;
  digits: 'fa' | 'en';
}

export function LockBadge({ year, digits }: LockBadgeProps) {
  const yearStr = digits === 'fa' ? faNum(year) : String(year);

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
      style={{
        background: 'rgb(var(--danger) / 0.10)',
        color: 'rgb(var(--danger))',
      }}
    >
      <Lock size={11} strokeWidth={2.5} />
      <span className="text-[10px] font-medium hidden sm:inline">سال {yearStr} قفل</span>
    </div>
  );
}
