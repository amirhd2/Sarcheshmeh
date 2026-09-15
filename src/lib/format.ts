/* =========================================================================
   سرچشمه — Number & currency formatting
   =========================================================================
   PRD §8:
   - Default Persian digits (۱۲۳); switch to English from Settings
   - Amounts stored as integers; formatted only at display time
   - Suffix "تومان"
   - Thousands separators live as user types (in NumberPad)
   - CSV: UTF-8 + BOM (handled in backup module, not here)
   - tabular-nums everywhere on numeric columns for alignment

   This module is pure — no React, no DOM. Re-exported by feature hooks.
   ========================================================================= */

import { toEnglishDigits, toPersianDigits, type DigitPref } from './jalali';

export type { DigitPref };

/* -------------------------------------------------------------------------
   Core formatters
   ------------------------------------------------------------------------- */

const FA_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

const EN_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

/**
 * Format an integer amount with thousands separators.
 *
 * @param amount integer (toman)
 * @param digits 'fa' | 'en'
 * @returns grouped digits, e.g. "۱٬۲۳۴٬۵۶۷" or "1,234,567"
 */
export function formatAmount(amount: number, digits: DigitPref = 'fa'): string {
  if (!Number.isFinite(amount)) return digits === 'fa' ? '۰' : '0';
  // Use Intl for grouping, then normalize separators:
  // - fa-IR produces "۱٬۲۳۴٬۵۶۷" with Arabic thousands separator ٬
  // - en-US produces "1,234,567"
  return digits === 'fa'
    ? FA_NUMBER_FORMATTER.format(amount)
    : EN_NUMBER_FORMATTER.format(amount);
}

/**
 * Format amount with currency suffix "تومان".
 *
 * @example formatToman(1234567, 'fa') → "۱٬۲۳۴٬۵۶۷ تومان"
 */
export function formatToman(amount: number, digits: DigitPref = 'fa'): string {
  return `${formatAmount(amount, digits)} تومان`;
}

export interface CompactAmountParts {
  value: string;
  unitShort: string;
  unitLong: string;
}

/**
 * Returns structured compact parts so responsive UI can display
 * "م" on mobile and "میلیون" on larger screens where space allows.
 */
export function formatCompactParts(amount: number, digits: DigitPref = 'fa'): CompactAmountParts {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const millions = amount / 1_000_000;
    const str = millions
      .toFixed(abs % 1_000_000 === 0 ? 0 : 1)
      .replace(/\.0$/, '');
    const num = digits === 'fa' ? toPersianDigits(str) : str;
    return { value: num, unitShort: 'م', unitLong: 'میلیون' };
  }
  if (abs >= 1_000) {
    const thousands = Math.round(amount / 1_000);
    const num = digits === 'fa' ? toPersianDigits(String(thousands)) : String(thousands);
    return { value: num, unitShort: 'هزار', unitLong: 'هزار' };
  }
  return { value: formatAmount(amount, digits), unitShort: '', unitLong: '' };
}

/**
 * Compact form for tight UI (e.g. dashboard chips): converts to million
 * for amounts ≥ 1,000,000.
 *
 * @example formatCompact(12_500_000, 'fa') → "۱۲٫۵ م"
 * @example formatCompact(950_000, 'fa')    → "۹۵۰ هزار"
 */
export function formatCompact(amount: number, digits: DigitPref = 'fa'): string {
  const parts = formatCompactParts(amount, digits);
  return parts.unitShort ? `${parts.value} ${parts.unitShort}` : parts.value;
}

/* -------------------------------------------------------------------------
   Live-input formatting (NumberPad)
   -------------------------------------------------------------------------
   The user types digits; we re-group on every keystroke.
   Internal state should always be the raw integer; this helper is for
   the display string only.
   ------------------------------------------------------------------------- */

/**
 * Group a raw digit string with thousands separators.
 * Accepts both Persian and English digits as input; output respects
 * the `digits` preference.
 *
 * @example groupDigits('1234567', 'fa') → '۱٬۲۳۴٬۵۶۷'
 * @example groupDigits('1234567', 'en') → '1,234,567'
 */
export function groupDigits(raw: string, digits: DigitPref = 'fa'): string {
  // 1. Normalize: strip everything except digits, then convert any FA input
  const asciiOnly = toEnglishDigits(raw).replace(/\D/g, '');
  if (!asciiOnly) return '';
  // 2. Group via Intl for correct separators
  const n = Number(asciiOnly);
  if (!Number.isFinite(n)) return '';
  return formatAmount(n, digits);
}

/**
 * Parse a user input (possibly with separators, possibly Persian digits)
 * back into a plain integer.
 *
 * @example parseAmountInput('۱٬۲۳۴٬۵۶۷') → 1234567
 * @example parseAmountInput('12,345')    → 12345
 */
export function parseAmountInput(input: string): number {
  const ascii = toEnglishDigits(input).replace(/\D/g, '');
  if (!ascii) return 0;
  const n = Number(ascii);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/* -------------------------------------------------------------------------
   Percentage helper — used by season cards (% of year)
   ------------------------------------------------------------------------- */

export function formatPercent(ratio: number, digits: DigitPref = 'fa'): string {
  if (!Number.isFinite(ratio) || ratio < 0) return digits === 'fa' ? '۰٪' : '0%';
  const pct = Math.round(ratio * 100);
  const num = digits === 'fa' ? toPersianDigits(String(pct)) : String(pct);
  return `${num}٪`;
}

/* -------------------------------------------------------------------------
   Digit conversion re-exports — for convenience in components
   ------------------------------------------------------------------------- */

export { toPersianDigits, toEnglishDigits };
