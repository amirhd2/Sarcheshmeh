/* =========================================================================
   سرچشمه — Jalali (Persian Solar) calendar utilities
   =========================================================================
   Storage rule (PRD §3): every date is stored as ISO Gregorian
   (YYYY-MM-DD) — Jalali is for display ONLY.

   Implementation notes:
   - We extend dayjs with jalali-plugin-dayjs but keep the DEFAULT
     calendar as gregory (so dayjs(iso).format('YYYY-MM-DD') round-trips
     correctly for storage).
   - For reading jalali parts from a gregorian ISO, we call
     .calendar('jalali') on the instance — this returns a jalali-calendar
     view without mutating global state.
   - For parsing a jalali string, we pass { jalali: true } to dayjs().

   Exposed API:
   - gregorianToJalaliParts(iso)   → { jy, jm, jd }
   - jalaliToISO(jy, jm, jd)       → 'YYYY-MM-DD' Gregorian ISO
   - formatJalali(iso, fmt, digits)→ formatted Persian string
   - jalaliYear/Month/Season(iso)
   - todayJalaliParts()
   - jalaliMonthRange / SeasonRange / YearRange
   - JALALI_MONTHS_FA, SEASONS_FA, SEASON_MONTHS, WEEKDAYS_FA_SHORT

   Persian season mapping (PRD §5 season cards):
     spring  → فروردین، اردیبهشت، خرداد   (months 1-3)
     summer  → تیر، مرداد، شهریور         (months 4-6)
     autumn  → مهر، آبان، آذر             (months 7-9)
     winter  → دی، بهمن، اسفند            (months 10-12)
   ========================================================================= */

import dayjs from 'dayjs';
import jalaliday from 'jalali-plugin-dayjs';

dayjs.extend(jalaliday);
// Intentionally NOT calling dayjs.calendar('jalali') as default —
// we keep default gregory so storage round-trips are clean.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const SEASONS_FA: Record<Season, string> = {
  spring: 'بهار',
  summer: 'تابستان',
  autumn: 'پاییز',
  winter: 'زمستان',
};

export const SEASON_MONTHS: Record<Season, [number, number, number]> = {
  spring: [1, 2, 3],
  summer: [4, 5, 6],
  autumn: [7, 8, 9],
  winter: [10, 11, 12],
};

export const SEASON_TINT_VAR: Record<Season, string> = {
  spring: '--season-spring',
  summer: '--season-summer',
  autumn: '--season-autumn',
  winter: '--season-winter',
};

export const SEASON_ACCENT_VAR: Record<Season, string> = {
  spring: '#C9718F', // rose
  summer: '#D9963E', // amber
  autumn: '#C96F5E', // terracotta
  winter: '#6B8CC3', // blue-grey
};

export interface JalaliParts {
  jy: number;
  jm: number;
  jd: number;
}

/* -------------------------------------------------------------------------
   Conversions
   ------------------------------------------------------------------------- */

/** Parse an ISO Gregorian date (YYYY-MM-DD) into Jalali parts. */
export function gregorianToJalaliParts(iso: string | Date): JalaliParts {
  const d = dayjs(iso).calendar('jalali');
  return {
    jy: d.year(),
    jm: d.month() + 1, // dayjs month is 0-indexed
    jd: d.date(),
  };
}

/**
 * Convert Jalali (jy, jm, jd) → Gregorian ISO YYYY-MM-DD.
 *
 * Uses dayjs with `{ jalali: true }` parse option from jalali-plugin-dayjs.
 * Default calendar stays gregory, so .format('YYYY-MM-DD') returns the
 * Gregorian date — exactly what we want for storage.
 */
export function jalaliToISO(jy: number, jm: number, jd: number): string {
  const padded = `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
  return dayjs(padded, { jalali: true }).format('YYYY-MM-DD');
}

/** Just the Jalali year for a given ISO date. */
export function jalaliYear(iso: string | Date): number {
  return dayjs(iso).calendar('jalali').year();
}

/** Jalali month 1..12. */
export function jalaliMonth(iso: string | Date): number {
  return dayjs(iso).calendar('jalali').month() + 1;
}

/** Season for a given ISO date. */
export function jalaliSeason(iso: string | Date): Season {
  const m = jalaliMonth(iso);
  if (m >= 1 && m <= 3) return 'spring';
  if (m >= 4 && m <= 6) return 'summer';
  if (m >= 7 && m <= 9) return 'autumn';
  return 'winter';
}

/** Today's Jalali parts. */
export function todayJalaliParts(): JalaliParts {
  return gregorianToJalaliParts(new Date());
}

/* -------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */

export type DigitPref = 'fa' | 'en';

/**
 * Format a Gregorian ISO date as a Jalali string.
 *
 * @param iso ISO date string
 * @param fmt dayjs format tokens (jalali-plugin-dayjs uses standard
 *            YYYY/MM/DD tokens — NOT jYYYY/jMM). Default 'YYYY/MM/DD'.
 * @param digits 'fa' or 'en' — controls digit script in output
 */
export function formatJalali(
  iso: string | Date,
  fmt: string = 'YYYY/MM/DD',
  digits: DigitPref = 'fa',
): string {
  const s = dayjs(iso).calendar('jalali').format(fmt);
  return digits === 'fa' ? toPersianDigits(s) : toEnglishDigits(s);
}

/** Long Persian form, e.g. "۱۵ اسفند ۱۴۰۳". */
export function formatJalaliLong(iso: string | Date, digits: DigitPref = 'fa'): string {
  const parts = gregorianToJalaliParts(iso);
  const monthName = JALALI_MONTHS_FA[parts.jm - 1] ?? '';
  const num = (n: number) => (digits === 'fa' ? toPersianDigits(String(n)) : String(n));
  return `${num(parts.jd)} ${monthName} ${num(parts.jy)}`;
}

/** Short form "۱۴۰۳/۰۸/۱۵" or "1403/08/15". */
export function formatJalaliShort(iso: string | Date, digits: DigitPref = 'fa'): string {
  return formatJalali(iso, 'YYYY/MM/DD', digits);
}

/** Month name + year, e.g. "اسفند ۱۴۰۳". */
export function formatJalaliMonthYear(iso: string | Date, digits: DigitPref = 'fa'): string {
  const parts = gregorianToJalaliParts(iso);
  const monthName = JALALI_MONTHS_FA[parts.jm - 1] ?? '';
  const num = (n: number) => (digits === 'fa' ? toPersianDigits(String(n)) : String(n));
  return `${monthName} ${num(parts.jy)}`;
}

/** Month name + day, e.g. "۱۵ اسفند". */
export function formatJalaliMonthDay(iso: string | Date, digits: DigitPref = 'fa'): string {
  const parts = gregorianToJalaliParts(iso);
  const monthName = JALALI_MONTHS_FA[parts.jm - 1] ?? '';
  const num = (n: number) => (digits === 'fa' ? toPersianDigits(String(n)) : String(n));
  return `${num(parts.jd)} ${monthName}`;
}

/* -------------------------------------------------------------------------
   Digit helpers — small and dependency-free.
   (Full number formatting lives in ./format.ts)
   ------------------------------------------------------------------------- */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const EN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function toPersianDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** Convenience: convert a number to Persian digit string. */
export function faNum(n: number): string {
  return toPersianDigits(String(n));
}

export function toEnglishDigits(s: string | number): string {
  // Convert Persian + Arabic-Indic digits to ASCII
  return String(s)
    .replace(/[۰-۹]/g, (d) => EN_DIGITS[d.charCodeAt(0) - 0x06f0] ?? d)
    .replace(/[٠-٩]/g, (d) => EN_DIGITS[d.charCodeAt(0) - 0x0660] ?? d);
}

/* -------------------------------------------------------------------------
   Range helpers — used by season page & dashboard aggregations
   ------------------------------------------------------------------------- */

/** ISO date range (inclusive) for a Jalali month. */
export function jalaliMonthRange(jy: number, jm: number): { start: string; end: string } {
  const padded = `${jy}-${String(jm).padStart(2, '0')}-01`;
  const start = dayjs(padded, { jalali: true }).format('YYYY-MM-DD');
  const end = dayjs(padded, { jalali: true })
    .calendar('jalali')
    .endOf('month')
    .calendar('gregory')
    .format('YYYY-MM-DD');
  return { start, end };
}

/** ISO date range (inclusive) for a Jalali season. */
export function jalaliSeasonRange(jy: number, season: Season): { start: string; end: string } {
  const months = SEASON_MONTHS[season];
  const startPadded = `${jy}-${String(months[0]).padStart(2, '0')}-01`;
  const endPadded = `${jy}-${String(months[2]).padStart(2, '0')}-01`;
  const start = dayjs(startPadded, { jalali: true }).format('YYYY-MM-DD');
  const end = dayjs(endPadded, { jalali: true })
    .calendar('jalali')
    .endOf('month')
    .calendar('gregory')
    .format('YYYY-MM-DD');
  return { start, end };
}

/** ISO date range (inclusive) for an entire Jalali year. */
export function jalaliYearRange(jy: number): { start: string; end: string } {
  const padded = `${jy}-01-01`;
  const start = dayjs(padded, { jalali: true }).format('YYYY-MM-DD');
  const esfandPadded = `${jy}-12-01`;
  const end = dayjs(esfandPadded, { jalali: true })
    .calendar('jalali')
    .endOf('month')
    .calendar('gregory')
    .format('YYYY-MM-DD');
  return { start, end };
}

/** List Jalali years that exist in the dataset (caller passes ISO dates). */
export function uniqueJalaliYears(isoDates: ReadonlyArray<string>): number[] {
  const years = new Set<number>();
  for (const iso of isoDates) {
    years.add(jalaliYear(iso));
  }
  return [...years].sort((a, b) => b - a); // descending — newest first
}

/* -------------------------------------------------------------------------
   Weekday helpers — for transaction list day headers
   ------------------------------------------------------------------------- */

export const WEEKDAYS_FA_SHORT = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

export function weekdayNameFa(iso: string | Date): string {
  // JS getDay: 0=Sun, 1=Mon, ..., 6=Sat
  // Persian week starts Saturday. We just want the name; mapping is:
  //   0=یکشنبه, 1=دوشنبه, 2=سه‌شنبه, 3=چهارشنبه, 4=پنجشنبه, 5=جمعه, 6=شنبه
  const idx = new Date(iso).getDay();
  return WEEKDAYS_FA_SHORT[idx] ?? '';
}
