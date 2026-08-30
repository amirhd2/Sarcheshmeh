'use client';

/* =========================================================================
   سرچشمه — TransactionForm
   =========================================================================
   PRD §6 page 2 (Transaction Form):
   Two-stage form rendered inside a BottomSheet.

   Stage 1 — Amount + Date:
   - Large amount display (live-formatted with thousand separators)
   - NumberPad (iOS-style custom keypad)
   - Date chips: "امروز" / "دیروز" / "انتخاب تاریخ"
   - When "انتخاب تاریخ" is tapped, a date picker panel slides in
     with the JalaliDatePicker wheel
   - "تأیید" button (from NumberPad) advances to stage 2

   Stage 2 — Category + Destination + Note:
   - Category chips (horizontal scroll, color-coded)
   - Destination chips (horizontal scroll, color-coded)
   - Note input (with placeholder; autocomplete deferred to Phase 3)
   - "ثبت تراکنش" button to submit

   On submit:
   - Create Transaction record in Dexie
   - If the date is in a different year than the currently-selected
     dashboard year, show a toast: "در ۱۴۰X ثبت شد — پرش"
   - Close the sheet

   Editing (Phase 1 step 6 will wire this from the list):
   - Pass `initialTransaction` to prefill all fields
   ========================================================================= */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Calendar, Eraser } from 'lucide-react';
import { NumberPad } from '@/components/NumberPad';
import { JalaliDatePicker } from '@/components/JalaliDatePicker';
import { IconRenderer } from '@/components/IconRenderer';
import { useCategories, useDestinations } from './useCatalogs';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';
import { db } from '@/db/schema';
import type { Transaction } from '@/db/schema';
import {
  groupDigits,
  parseAmountInput,
  formatToman,
} from '@lib/format';
import { formatTomanWords } from '@lib/numberToWords';
import {
  todayJalaliParts,
  jalaliToISO,
  jalaliYear,
  formatJalaliLong,
  toPersianDigits,
} from '@lib/jalali';

interface TransactionFormProps {
  /** Pass an existing transaction to edit it; omit for "new". */
  initialTransaction?: Transaction;
  /** Called when the form is submitted (after DB write). */
  onSubmit?: (tx: Transaction) => void;
  /** Called when user cancels / dismisses. */
  onCancel?: () => void;
  /** The currently-selected dashboard year — used for the cross-year toast. */
  dashboardYear?: number;
}

type Stage = 'amount' | 'details';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function TransactionForm({
  initialTransaction,
  onSubmit,
  dashboardYear,
}: TransactionFormProps) {
  const { digits } = useAppSettings();
  const categories = useCategories() ?? [];
  const destinations = useDestinations() ?? [];

  // --- Stage state ---
  const [stage, setStage] = useState<Stage>('amount');

  // --- Stage 1 state: amount + date ---
  const [amountRaw, setAmountRaw] = useState<string>(
    initialTransaction ? String(initialTransaction.amount) : '',
  );
  const [dateISO, setDateISO] = useState<string>(
    initialTransaction?.date ?? jalaliToISO(todayJalaliParts().jy, todayJalaliParts().jm, todayJalaliParts().jd),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Stage 2 state: category + destination + note ---
  const [categoryId, setCategoryId] = useState<string | null>(
    initialTransaction?.categoryId ?? null,
  );
  const [destinationId, setDestinationId] = useState<string | null>(
    initialTransaction?.destinationId ?? null,
  );
  const [note, setNote] = useState<string>(initialTransaction?.note ?? '');

  // --- Lock body scroll when date picker is open ---
  // PRD user feedback #5: when the wheel picker is shown, scrolling
  // should be confined to the picker itself (overscroll-behavior:contain
  // handles that) — and the body behind it should NOT scroll.
  useEffect(() => {
    if (!showDatePicker) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [showDatePicker]);

  // --- Derived ---
  const amountNumber = useMemo(() => parseAmountInput(amountRaw), [amountRaw]);
  const canAdvanceToDetails = amountNumber > 0;
  const canSubmit = canAdvanceToDetails && categoryId !== null && destinationId !== null;

  // --- Quick date chips: today / yesterday ---
  const todayParts = useMemo(() => todayJalaliParts(), []);
  const todayISO = useMemo(
    () => jalaliToISO(todayParts.jy, todayParts.jm, todayParts.jd),
    [todayParts],
  );
  const yesterdayISO = useMemo(() => {
    // Subtract 1 jalali day — use dayjs for safety (handles month boundaries)
    const d = new Date(todayISO);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [todayISO]);

  // --- Submit ---
  const handleSubmit = async () => {
    if (!canSubmit || !categoryId || !destinationId) return;

    const now = new Date().toISOString();
    const tx: Transaction = {
      id: initialTransaction?.id ?? uuid(),
      type: 'income',
      amount: amountNumber,
      date: dateISO,
      categoryId,
      destinationId,
      note: note.trim() || undefined,
      isDemo: false,
      createdAt: initialTransaction?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.transactions.put(tx);

    // Cross-year toast trigger
    if (dashboardYear !== undefined) {
      const txYear = jalaliYear(dateISO);
      if (txYear !== dashboardYear) {
        // Show toast via custom event (AppSettingsContext will pick it up
        // and display via Toaster; for now we use sonner directly)
        const { toast } = await import('sonner');
        toast.success(
          `در سال ${toPersianDigits(txYear)} ثبت شد`,
          { description: 'برای دیدن، سال رو در هدر عوض کن' },
        );
      } else {
        const { toast } = await import('sonner');
        toast.success('تراکنش ثبت شد');
      }
    }

    onSubmit?.(tx);
  };

  // --- Stage 1: amount + date ---
  if (stage === 'amount') {
    return (
      <div className="flex flex-col">
        {/* Amount display — large, with live grouping + Persian words */}
        <div className="px-5 pt-2 pb-4 text-center">
          <div className="text-xs text-text-muted mb-2">مبلغ تراکنش</div>
          <div className="min-h-[64px] flex items-center justify-center">
            {amountRaw === '' ? (
              <span className="nums digits-font text-4xl font-bold text-text-faint">
                ۰
              </span>
            ) : (
              <motion.span
                key={amountRaw}
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="nums digits-font text-4xl font-bold text-text"
              >
                {groupDigits(amountRaw, digits)}
              </motion.span>
            )}
          </div>
          {/* Amount in Persian words — PRD user feedback #4 */}
          <AnimatePresence mode="wait">
            {amountNumber > 0 && (
              <motion.div
                key={amountNumber}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-text-muted mt-2 leading-relaxed"
              >
                {formatTomanWords(amountNumber)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Date chips + AC button (clear amount) — PRD user feedback #3 */}
        <div className="px-4 pb-3 flex gap-2 items-center">
          <DateChip
            active={dateISO === todayISO}
            onClick={() => {
              setDateISO(todayISO);
              setShowDatePicker(false);
            }}
          >
            امروز
          </DateChip>
          <DateChip
            active={dateISO === yesterdayISO}
            onClick={() => {
              setDateISO(yesterdayISO);
              setShowDatePicker(false);
            }}
          >
            دیروز
          </DateChip>
          <DateChip
            active={showDatePicker || (dateISO !== todayISO && dateISO !== yesterdayISO)}
            onClick={() => setShowDatePicker((v) => !v)}
          >
            <Calendar size={14} strokeWidth={2.5} />
            <span className="mr-1">
              {dateISO !== todayISO && dateISO !== yesterdayISO
                ? formatJalaliLong(dateISO, digits)
                : 'انتخاب تاریخ'}
            </span>
          </DateChip>

          {/* AC button — clears the entire amount. Sits at the end of
              the chip row, visually distinct (danger tint). */}
          {amountRaw !== '' && (
            <motion.button
              type="button"
              onClick={() => setAmountRaw('')}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.92 }}
              aria-label="پاک کردن مبلغ"
              className="flex items-center justify-center w-8 h-8 rounded-full mr-auto pressable"
              style={{
                background: 'rgb(var(--danger) / 0.10)',
                color: 'rgb(var(--danger))',
              }}
            >
              <Eraser size={14} strokeWidth={2.5} />
            </motion.button>
          )}
        </div>

        {/* Date picker — slides in when toggled */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-2 py-3 mx-4 mb-3 card">
                <JalaliDatePicker
                  value={dateISO}
                  onChange={setDateISO}
                  digits={digits}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NumberPad with Done → advance to stage 2 */}
        <NumberPad
          value={amountRaw}
          onChange={setAmountRaw}
          onDone={() => {
            if (canAdvanceToDetails) {
              setStage('details');
            }
          }}
          canDone={canAdvanceToDetails}
          digits={digits}
        />
      </div>
    );
  }

  // --- Stage 2: category + destination + note ---
  return (
    <div className="flex flex-col px-5 py-3 gap-5">
      {/* Back to stage 1 */}
      <button
        type="button"
        onClick={() => setStage('amount')}
        className="flex items-center gap-1 text-sm text-text-muted self-start pressable"
      >
        <ChevronRight size={16} strokeWidth={2.5} className="rotate-180" />
        ویرایش مبلغ
      </button>

      {/* Amount summary (read-only) */}
      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-text-muted">مبلغ</span>
        <span className="nums digits-font text-lg font-bold text-text">
          {formatToman(amountNumber, digits)}
        </span>
      </div>

      {/* Category chips */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">دسته</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {categories.map((cat) => {
            const active = cat.id === categoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm whitespace-nowrap pressable transition-colors"
                style={{
                  background: active ? cat.color : 'rgb(var(--surface-2))',
                  color: active ? 'white' : 'rgb(var(--text))',
                }}
              >
                <IconRenderer
                  name={cat.icon}
                  size={16}
                  strokeWidth={2.5}
                  color={active ? 'white' : cat.color}
                />
                <span className="font-medium">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Destination chips */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">مقصد</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {destinations.map((dst) => {
            const active = dst.id === destinationId;
            return (
              <button
                key={dst.id}
                type="button"
                onClick={() => setDestinationId(dst.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm whitespace-nowrap pressable transition-colors"
                style={{
                  background: active ? dst.color : 'rgb(var(--surface-2))',
                  color: active ? 'white' : 'rgb(var(--text))',
                }}
              >
                <IconRenderer
                  name={dst.icon}
                  size={16}
                  strokeWidth={2.5}
                  color={active ? 'white' : dst.color}
                />
                <span className="font-medium">{dst.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Note input */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">توضیح (اختیاری)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثلاً: اضافه‌کاری فروردین"
          maxLength={100}
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-colors"
          style={{
            background: 'rgb(var(--surface-2))',
            color: 'rgb(var(--text))',
          }}
        />
      </div>

      {/* Submit button */}
      <motion.button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        whileTap={{ scale: canSubmit ? 0.97 : 1 }}
        className="w-full py-4 rounded-2xl font-medium text-base flex items-center justify-center gap-2 transition-colors mt-2"
        style={{
          background: canSubmit
            ? 'rgb(var(--brand-primary))'
            : 'rgb(var(--surface-2))',
          color: canSubmit ? 'white' : 'rgb(var(--text-faint))',
        }}
      >
        <Check size={18} strokeWidth={2.5} />
        ثبت تراکنش
      </motion.button>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function DateChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
      style={{
        background: active ? 'rgb(var(--brand-primary) / 0.12)' : 'rgb(var(--surface-2))',
        color: active ? 'rgb(var(--brand-primary))' : 'rgb(var(--text-muted))',
      }}
    >
      {children}
    </motion.button>
  );
}
