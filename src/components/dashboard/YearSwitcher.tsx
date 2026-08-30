'use client';

/* =========================================================================
   سرچشمه — YearSwitcher
   =========================================================================
   A chip-style year selector. Shows the current jalali year as a button;
   tapping it opens a small dropdown of all years present in the data.

   PRD §6 page 1 (Dashboard): "هدر (اسم + سال‌گزین chip + آیکون تنظیمات)".
   The chip is small and unobtrusive — it sits in the header next to the
   app name. Selected year is highlighted with the primary color.

   We use a simple conditional dropdown (not a Radix popover) to keep the
   bundle small and the visual exactly matching the iOS chip style.
   ========================================================================= */

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
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 left-0 z-50 min-w-[140px] card p-1 animate-fade-in"
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
                className="w-full text-right px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between"
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
                {active && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
