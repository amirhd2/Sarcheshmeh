'use client';

/* =========================================================================
   سرچشمه — TypingLockBadge
   =========================================================================
   Shows a "سال قفل است" badge with a typing animation when a year
   is locked. Used in the header of dashboard and season pages.
   ========================================================================= */

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { faNum } from '@lib/jalali';

interface TypingLockBadgeProps {
  year: number;
  digits: 'fa' | 'en';
}

export function LockBadge({ year, digits }: TypingLockBadgeProps) {
  const yearStr = digits === 'fa' ? faNum(year) : String(year);
  const message = `سال ${yearStr} قفل است`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: 'rgb(var(--danger) / 0.10)',
        color: 'rgb(var(--danger))',
      }}
    >
      <Lock size={12} strokeWidth={2.5} />
      <motion.span
        className="text-[11px] font-medium overflow-hidden whitespace-nowrap"
        initial={{ width: 0 }}
        animate={{ width: 'auto' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {message}
      </motion.span>
    </motion.div>
  );
}
