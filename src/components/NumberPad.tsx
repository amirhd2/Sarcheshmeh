'use client';

/* =========================================================================
   ثمر — NumberPad
   =========================================================================
   PRD §6 page 2 (Transaction Form), step 1:
   "فیلد مبلغ درشت + کیپد سفارشی iOS استایل
    (۰–۹ + دکمه ۰۰۰ + بک‌اسپیس + Done)
    با جداکننده‌ی هزارگان زنده"

   Layout (iOS calculator style):
   ┌─────┬─────┬─────┐
   │  ۱  │  ۲  │  ۳  │
   ├─────┼─────┼─────┤
   │  ۴  │  ۵  │  ۶  │
   ├─────┼─────┼─────┤
   │  ۷  │  ۸  │  ۹  │
   ├─────┼─────┼─────┤
   │ ۰۰۰ │  ۰  │  ⌫  │
   └─────┴─────┴─────┘
   Done button spans full width below.

   Haptic feedback: navigator.vibrate(5) on Android (light tap).
   iOS Web has no haptic API — visual press feedback compensates.

   PRD §7: "هپتیک فقط اندروید (navigator.vibrate — iOS وب API نداره،
   با فیدبک بصری جبران می‌شه)"
   ========================================================================= */

import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';
import type { DigitPref } from '@lib/jalali';

interface NumberPadProps {
  /** Current raw digit string (no separators). */
  value: string;
  /** Called with new raw digit string on each press. */
  onChange: (next: string) => void;
  /** Called when Done is pressed. */
  onDone: () => void;
  /** Done button enabled? (e.g. require non-zero amount) */
  canDone?: boolean;
  /** Digit preference for button labels. */
  digits: DigitPref;
  /** Maximum number of digits allowed. Default 12 (up to 999 billion toman). */
  maxLength?: number;
}

const MAX_AMOUNT = 12; // 999,999,999,999 toman — way more than anyone needs

export function NumberPad({
  value,
  onChange,
  onDone,
  canDone = true,
  digits,
  maxLength = MAX_AMOUNT,
}: NumberPadProps) {
  const haptic = (ms = 5) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  };

  const appendDigit = (d: string) => {
    if (value.length >= maxLength) {
      haptic(20); // longer buzz = "can't add more"
      return;
    }
    // Avoid leading zeros (e.g. "0123") — replace single "0" with the digit
    const next = value === '0' ? d : value + d;
    onChange(next);
    haptic();
  };

  const appendThousands = () => {
    // "000" button — adds three zeros, but only if current value isn't 0
    if (value === '' || value === '0') {
      // Pressing 000 on empty is a no-op (you can't have just "000")
      haptic(20);
      return;
    }
    if (value.length + 3 > maxLength) {
      haptic(20);
      return;
    }
    onChange(value + '000');
    haptic();
  };

  const backspace = () => {
    if (value.length === 0) return;
    onChange(value.slice(0, -1));
    haptic();
  };

  // The digit labels respect digit preference (۱۲۳ vs 123)
  const digitLabel = (d: string) =>
    digits === 'fa'
      ? d.replace(/[0-9]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[Number(c)] ?? c)
      : d;

  return (
    <div className="px-4 pb-2">
      {/* 4×3 digit grid */}
      <div className="grid grid-cols-3 gap-2">
        {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((d) => (
          <PadButton key={d} onClick={() => appendDigit(d)}>
            <span className="nums digits-font text-2xl font-medium text-text">
              {digitLabel(d)}
            </span>
          </PadButton>
        ))}

        {/* 000 button — amber-tinted to differentiate */}
        <PadButton onClick={appendThousands} variant="secondary">
          <span className="nums digits-font text-xl font-medium text-text-muted">
            {digitLabel('۰۰۰')}
          </span>
        </PadButton>

        {/* 0 button */}
        <PadButton onClick={() => appendDigit('0')}>
          <span className="nums digits-font text-2xl font-medium text-text">
            {digitLabel('0')}
          </span>
        </PadButton>

        {/* Backspace */}
        <PadButton onClick={backspace} variant="secondary">
          <Delete size={22} strokeWidth={2} className="text-text-muted" />
        </PadButton>
      </div>

      {/* Done button — full width, primary color */}
      <motion.button
        type="button"
        onClick={() => {
          if (canDone) {
            haptic(10);
            onDone();
          } else {
            haptic(20);
          }
        }}
        whileTap={{ scale: canDone ? 0.97 : 1 }}
        disabled={!canDone}
        className="w-full mt-2 py-4 rounded-2xl font-medium text-base transition-colors"
        style={{
          background: canDone
            ? 'rgb(var(--brand-primary))'
            : 'rgb(var(--surface-2))',
          color: canDone ? 'white' : 'rgb(var(--text-faint))',
        }}
      >
        تأیید
      </motion.button>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Button primitive — iOS-style pressable */

interface PadButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function PadButton({ children, onClick, variant = 'primary' }: PadButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-center py-4 rounded-2xl select-none"
      style={{
        background:
          variant === 'secondary'
            ? 'rgb(var(--surface-2))'
            : 'rgb(var(--surface-2))',
        minHeight: 56, // Apple HIG touch target
      }}
    >
      {children}
    </motion.button>
  );
}
