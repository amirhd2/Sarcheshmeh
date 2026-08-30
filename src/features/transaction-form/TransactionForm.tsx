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
import { useMemo, useState } from 'react';
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

  // NOTE: previously we locked body scroll when the date picker was open.
  // After the swap redesign (PRD user feedback #2 on this iteration),
  // the date picker REPLACES the number pad in-place — the sheet height
  // stays the same and nothing scrolls behind it. So the body lock is
  // no longer needed.

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
        {/* Amount display — large, with live grouping + Persian words.
            The wrapper has a FIXED min-height so the layout below it
            (date chips + swap zone) never shifts when the amount or
            its word-form appears/disappears. This is critical for
            smooth transitions — PRD user feedback (this iteration). */}
        <div className="px-5 pt-2 pb-4 text-center">
          <div className="text-xs text-text-muted mb-2">مبلغ تراکنش</div>
          {/* Amount number — fixed height so the line below it doesn't
              push content down when the number scales in/out. */}
          <div className="h-[56px] flex items-center justify-center">
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
          {/* Amount in Persian words — fixed height line so AC clearing
              the amount doesn't cause a vertical jump. PRD #4 + this
              iteration's "no jump" rule. */}
          <div className="h-[20px] mt-2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {amountNumber > 0 && (
                <motion.div
                  key={amountNumber}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-xs text-text-muted leading-relaxed"
                >
                  {formatTomanWords(amountNumber)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date chips + AC button (clear amount) — PRD user feedback #3
            AC is now a pill-shaped button (larger, easier to tap, but
            still subtle enough to not dominate the chip row).
            The row has a FIXED min-height so AC appearing/disappearing
            doesn't cause a vertical jump (PRD user feedback this iteration). */}
        <div className="px-4 pb-3 flex gap-2 items-center flex-wrap min-h-[48px]">
          <DateChip
            active={dateISO === todayISO && !showDatePicker}
            onClick={() => {
              setDateISO(todayISO);
              setShowDatePicker(false);
            }}
          >
            امروز
          </DateChip>
          <DateChip
            active={dateISO === yesterdayISO && !showDatePicker}
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
              {showDatePicker
                ? 'ورود مبلغ'
                : dateISO !== todayISO && dateISO !== yesterdayISO
                  ? formatJalaliLong(dateISO, digits)
                  : 'انتخاب تاریخ'}
            </span>
          </DateChip>

          {/* AC button — pill shape with text + icon. Larger than the
              chips so it's easy to tap, but tinted danger so it doesn't
              compete visually with the primary actions. Only shown when
              there's an amount to clear. */}
          {amountRaw !== '' && (
            <motion.button
              type="button"
              onClick={() => setAmountRaw('')}
              initial={{ opacity: 0, scale: 0.85, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 8 }}
              whileTap={{ scale: 0.94 }}
              aria-label="پاک کردن مبلغ"
              className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium mr-auto pressable"
              style={{
                background: 'rgb(var(--danger) / 0.12)',
                color: 'rgb(var(--danger))',
              }}
            >
              <Eraser size={14} strokeWidth={2.5} />
              <span>پاک کردن</span>
            </motion.button>
          )}
        </div>

        {/* Swap zone: number pad OR date picker, never both at once.
            When the user taps "انتخاب تاریخ", the number pad animates
            out (slide down + fade) and the date picker animates in
            (slide up + fade) — they occupy the same slot, so the sheet
            height doesn't change and nothing scrolls behind it.

            CRITICAL: the swap zone has a FIXED min-height equal to the
            taller of the two panels (number pad). Without this, the
            sheet height would jump when swapping because the two panels
            have different intrinsic heights. PRD user feedback (this
            iteration): "no jump on swap". */}
        <div className="relative min-h-[340px]">
          <AnimatePresence mode="wait">
            {showDatePicker ? (
              <motion.div
                key="date-picker"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                // Flex column + justify-center so the date picker panel
                // is vertically centered within the fixed-height zone
                // (matching the number pad's vertical position).
                className="absolute inset-0 flex flex-col justify-center"
              >
                {/* Date picker panel — fills the slot the number pad
                    would have used. 5 visible items per column
                    (2 above + selected + 2 below) per Apple style. */}
                <div className="mx-4 mb-3 card p-3">
                  <JalaliDatePicker
                    value={dateISO}
                    onChange={setDateISO}
                    digits={digits}
                  />
                </div>

                {/* Confirm date button — mirrors the NumberPad's "تأیید"
                    button position so the user's thumb stays in the
                    same place. */}
                <motion.button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  whileTap={{ scale: 0.97 }}
                  className="py-4 rounded-2xl font-medium text-base flex items-center justify-center gap-2 mx-4"
                  style={{
                    background: 'rgb(var(--brand-primary))',
                    color: 'white',
                  }}
                >
                  <Check size={18} strokeWidth={2.5} />
                  تأیید تاریخ
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="number-pad"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
