'use client';

/* =========================================================================
   ثمر — RepeatDialog
   =========================================================================
   A bottom sheet that lets the user set up recurring transactions.
   Options:
   - Frequency: monthly / yearly
   - Count: 1-36 (slider or chips)
   Shows a preview of the first few dates.
   ========================================================================= */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Repeat, Calendar, Check } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';
import { generateRecurringTransactions } from '@/features/transaction-form/recurring';
import type { Transaction } from '@/db/schema';
import {
  formatJalaliLong,
  gregorianToJalaliParts,
  jalaliToISO,
  JALALI_MONTHS_FA,
  type DigitPref,
  faNum } from '@lib/jalali';
import { formatToman } from '@lib/format';

interface RepeatDialogProps {
  open: boolean;
  onClose: () => void;
  transaction: Pick<Transaction, 'amount' | 'categoryId' | 'destinationId' | 'note'>;
  dateISO: string;
  onConfirm: (frequency: 'monthly' | 'yearly', count: number) => void;
}

const COUNT_OPTIONS = [3, 6, 12, 24, 36];

export function RepeatDialog({ open, onClose, transaction, dateISO, onConfirm }: RepeatDialogProps) {
  const { digits } = useAppSettings();
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [count, setCount] = useState(12);

  // Preview the first 3 dates
  const previewDates = useMemo(() => {
    const txs = generateRecurringTransactions(transaction, dateISO, frequency, Math.min(count, 3));
    return txs.map((tx) => tx.date);
  }, [transaction, dateISO, frequency, count]);

  return (
    <BottomSheet open={open} onClose={onClose} title="تکرار تراکنش" showCloseButton>
      <div className="px-5 py-3 space-y-5">
        {/* Amount summary */}
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat size={18} className="text-brand-primary" />
            <span className="text-sm text-text-muted">مبلغ</span>
          </div>
          <span className="nums digits-font text-base font-bold text-text">
            {formatToman(transaction.amount, digits)}
          </span>
        </div>

        {/* Frequency selector */}
        <div>
          <label className="text-sm font-medium text-text block mb-2">بازه تکرار</label>
          <div className="flex gap-2">
            <FreqButton
              active={frequency === 'monthly'}
              onClick={() => setFrequency('monthly')}
              label="ماهانه"
            />
            <FreqButton
              active={frequency === 'yearly'}
              onClick={() => setFrequency('yearly')}
              label="سالانه"
            />
          </div>
        </div>

        {/* Count selector */}
        <div>
          <label className="text-sm font-medium text-text block mb-2">تعداد دفعات</label>
          <div className="flex gap-2 flex-wrap">
            {COUNT_OPTIONS.map((c) => (
              <CountChip
                key={c}
                active={count === c}
                onClick={() => setCount(c)}
                label={digits === 'fa' ? faNum(c) : String(c)}
              />
            ))}
          </div>
        </div>

        {/* Date preview */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-text-muted" />
            <span className="text-xs font-medium text-text-muted">پیش‌نمایش تاریخ‌ها</span>
          </div>
          <div className="space-y-1.5">
            {previewDates.map((date, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 rounded-xl"
                style={{ background: 'rgb(var(--surface-2))' }}>
                <span className="text-xs text-text-muted">
                  {digits === 'fa' ? faNum(i + 1) : i + 1}.
                </span>
                <span className="text-sm text-text nums digits-font">
                  {formatJalaliLong(date, digits)}
                </span>
              </div>
            ))}
            {count > 3 && (
              <div className="text-center text-xs text-text-faint pt-1">
                و {digits === 'fa' ? faNum(count - 3) : count - 3} مورد دیگر...
              </div>
            )}
          </div>
        </div>

        {/* Total amount */}
        <div className="card p-4 flex items-center justify-between">
          <span className="text-sm text-text-muted">جمع کل ({digits === 'fa' ? faNum(count) : count} قسط)</span>
          <span className="nums digits-font text-base font-bold text-brand-primary">
            {formatToman(transaction.amount * count, digits)}
          </span>
        </div>

        {/* Confirm button */}
        <motion.button
          type="button"
          onClick={() => onConfirm(frequency, count)}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-medium text-base flex items-center justify-center gap-2"
          style={{ background: 'rgb(var(--brand-primary))', color: 'white' }}
        >
          <Check size={18} strokeWidth={2.5} />
          ثبت {digits === 'fa' ? faNum(count) : count} تراکنش تکراری
        </motion.button>
      </div>
    </BottomSheet>
  );
}

function FreqButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-3 rounded-2xl text-sm font-medium pressable transition-colors"
      style={{
        background: active ? 'rgb(var(--brand-primary))' : 'rgb(var(--surface-2))',
        color: active ? 'white' : 'rgb(var(--text))',
      }}
    >
      {label}
    </button>
  );
}

function CountChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-2xl text-sm font-medium pressable transition-colors"
      style={{
        background: active ? 'rgb(var(--brand-primary))' : 'rgb(var(--surface-2))',
        color: active ? 'white' : 'rgb(var(--text))',
      }}
    >
      {label}
    </button>
  );
}

