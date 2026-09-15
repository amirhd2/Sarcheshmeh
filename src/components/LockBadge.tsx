'use client';

/* =========================================================================
   ثمر — LockBadge
   =========================================================================
   Shows a compact lock indicator when a year is locked.
   - In the dashboard header (tight space): icon only on mobile,
     icon + short text on desktop.
   - In the season header (more space): icon + full text always.
   ========================================================================= */

import { Lock } from 'lucide-react';
import { faNum } from '@lib/jalali';

interface LockBadgeProps {
  year: number;
  digits: 'fa' | 'en';
  /** "compact" = icon only on mobile (dashboard), "full" = always show text (season) */
  variant?: 'compact' | 'full';
}

export function LockBadge({ year, digits, variant = 'compact' }: LockBadgeProps) {
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
      <span className={`text-[10px] font-medium ${variant === 'compact' ? 'hidden sm:inline' : ''}`}>
        سال {yearStr} قفل
      </span>
    </div>
  );
}
