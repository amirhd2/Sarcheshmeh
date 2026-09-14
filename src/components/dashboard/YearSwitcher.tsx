'use client';

/* =========================================================================
   سرچشمه — YearSwitcher
   =========================================================================
   A chip-style year selector. Shows the current jalali year as a button;
   tapping it opens a small dropdown of all years present in the data.

   PRD §6 page 1 (Dashboard): "هدر (اسم + سال‌گزین chip + آیکون تنظیمات)".
   The chip is small and unobtrusive — it sits in the header next to the
   app name. Selected year is highlighted with the primary color.

   Animations (PRD §7 — "هیچ چیزی بدون انیمیشن نرم باز/بسته نمی‌شه"):
   - Dropdown opens with a fade + slight scale + slide-down (spring)
   - Closes with the reverse
   - Chevron icon rotates 180° smoothly
   ========================================================================= */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatJalaliYearDigit } from './format-helpers';
import type { DigitPref } from '@lib/jalali';

interface YearSwitcherProps {
  years: ReadonlyArray<number>;
  selectedYear: number;
  onSelect: (year: number) => void;
  digits: DigitPref;
}

export function YearSwitcher({ years, selectedYear, onSelect, digits }: YearSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors pressable"
        style={{
          background: 'rgb(var(--brand-primary) / 0.10)',
          color: 'rgb(var(--brand-primary))',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="nums digits-font">{formatJalaliYearDigit(selectedYear, digits)}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex"
        >
          <ChevronDown size={14} strokeWidth={2.5} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute top-full mt-2 left-0 z-50 min-w-[140px] card p-1"
            style={{ transformOrigin: 'top left' }}
            role="listbox"
          >
            {years.length === 0 && (
              <div className="px-3 py-2 text-sm text-text-muted">سالی موجود نیست</div>
            )}
            {years.map((y) => {
              const active = y === selectedYear;
              return (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(y);
                    setOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between pressable"
                  style={
                    active
                      ? {
                          background: 'rgb(var(--brand-primary) / 0.10)',
                          color: 'rgb(var(--brand-primary))',
                        }
                      : { color: 'rgb(var(--text))' }
                  }
                >
                  <span className="nums digits-font font-medium">{formatJalaliYearDigit(y, digits)}</span>
                  {active && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="text-xs"
                    >
                      ✓
                    </motion.span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
