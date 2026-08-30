/* =========================================================================
   سرچشمه — Sample (demo) data generator
   =========================================================================
   PRD §4 sample data profile:
   - 1402 + 1403 full, plus current year up to today (~60-80 records)
   - Monthly fixed: فوق‌العاده خاص → بانک ملی
   - Monthly variable: اضافه‌کار → بانک ملی
   - Esfand/Farvardin: عیدی (large) → بانک ملی
   - Occasions: تولد امام / مبعث → کارت مهر / بانک ملی
   - Scattered throughout: کارت هدیه → کارت نقدی مهر

   Records are flagged `isDemo: true` so Settings → "delete sample data"
   can wipe ONLY these without touching user-entered records.

   All dates are stored as ISO Gregorian — Jalali only used at generation
   time to place events on the right Persian month/day.
   ========================================================================= */

import type { Transaction, Category, Destination } from './schema';
import {
  CATEGORY_IDS,
  DESTINATION_IDS,
  DEFAULT_CATEGORIES,
  DEFAULT_DESTINATIONS,
} from './defaults';
import { jalaliToISO, gregorianToJalaliParts } from '../lib/jalali';
import type { JalaliParts } from '../lib/jalali';

/* -------------------------------------------------------------------------
   Deterministic pseudo-random — so the seed is reproducible.
   Mulberry32: tiny, fast, good enough for sample data.
   ------------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]!;
}

/* -------------------------------------------------------------------------
   UUID v4 (RFC 4122) — crypto.randomUUID when available, fallback inline.
   ------------------------------------------------------------------------- */

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (older browsers): minimal v4 implementation
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex: string[] = [];
  for (const b of bytes) hex.push(b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/* -------------------------------------------------------------------------
   Note pools — for variety in transaction notes (with autocomplete later)
   ------------------------------------------------------------------------- */

const OVERTIME_NOTES = [
  'اضافه‌کاری فروردین',
  'اضافه‌کاری اردیبهشت',
  'اضافه‌کاری خرداد',
  'اضافه‌کاری تیر',
  'اضافه‌کاری مرداد',
  'اضافه‌کاری شهریور',
  'اضافه‌کاری مهر',
  'اضافه‌کاری آبان',
  'اضافه‌کاری آذر',
  'اضافه‌کاری دی',
  'اضافه‌کاری بهمن',
  'اضافه‌کاری اسفند',
];

const GIFT_CARD_NOTES = [
  'کارت هدیه همکار',
  'هدیه تولد',
  'کارت هدیه جایزه',
  'هدیه انگیزشی',
  'کارت هدیه پایان پروژه',
  'هدیه تشویقی',
  'کارت هدیه یادبود',
];

const EIDI_NOTES = ['عیدی سال نو', 'عیدی سیزده‌بدر'];

const IMAM_BIRTHDAY_NOTES = [
  'تولد امام علی',
  'تولد امام حسن',
  'تولد امام حسین',
  'تولد امام رضا',
  'تولد امام مهدی',
];

const MABAS_NOTES = ['مبعث پیامبر'];

/* -------------------------------------------------------------------------
   Default category & destination records (with timestamps)
   ------------------------------------------------------------------------- */

function nowISO(): string {
  return new Date().toISOString();
}

export function buildDefaultCategories(): Category[] {
  const ts = nowISO();
  return DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  }));
}

export function buildDefaultDestinations(): Destination[] {
  const ts = nowISO();
  return DEFAULT_DESTINATIONS.map((d) => ({
    ...d,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  }));
}

/* -------------------------------------------------------------------------
   Sample transactions — main generator
   ------------------------------------------------------------------------- */

/**
 * Build the full sample dataset.
 *
 * @param today Inject "now" — useful for tests. Defaults to real today.
 * @returns Array of Transaction marked `isDemo: true`.
 */
export function buildSampleTransactions(today: Date = new Date()): Transaction[] {
  const rng = mulberry32(0x5a7c3b91); // fixed seed = reproducible dataset
  const out: Transaction[] = [];
  const now = nowISO();

  const todayJalali: JalaliParts = gregorianToJalaliParts(today);
  // Generate from at most 2 years before the current year, up to today.
  // PRD §4 calls for ~60-80 records — this cap keeps the dataset in that
  // range even when "today" drifts several years past 1404.
  // Lower bound: max(1402, endYear - 2)
  const startYear = Math.max(1402, todayJalali.jy - 2);
  const endYear = todayJalali.jy;

  for (let jy = startYear; jy <= endYear; jy++) {
    const isCurrentYear = jy === endYear;
    const maxMonth = isCurrentYear ? todayJalali.jm : 12;

    for (let jm = 1; jm <= maxMonth; jm++) {
      // Cap the day for the current month at today's day
      const dayCap = isCurrentYear && jm === todayJalali.jm ? todayJalali.jd : 31;

      /* --- 1. Monthly fixed: فوق‌العاده خاص → بانک ملی --- */
      // Paid on the 1st of the month (typical payroll pattern)
      out.push(
        makeTx({
          rng,
          now,
          jy,
          jm,
          jd: Math.min(1, dayCap),
          amount: 4_500_000, // 4.5M toman — fixed monthly "special"
          categoryId: CATEGORY_IDS.specialBonus,
          destinationId: DESTINATION_IDS.bankMelli,
          note: 'فوق‌العاده خاص ماهانه',
        }),
      );

      /* --- 2. Variable monthly: اضافه‌کار → بانک ملی --- */
      // Paid mid-month (around 15th)
      const otDay = Math.min(randInt(rng, 14, 18), dayCap);
      const otAmount =
        randInt(rng, 1, 9) * 1_000_000 + randInt(rng, 0, 9) * 100_000; // 1M–9.9M
      out.push(
        makeTx({
          rng,
          now,
          jy,
          jm,
          jd: otDay,
          amount: otAmount,
          categoryId: CATEGORY_IDS.overtime,
          destinationId: DESTINATION_IDS.bankMelli,
          note: OVERTIME_NOTES[(jm - 1) % OVERTIME_NOTES.length]!,
        }),
      );

      /* --- 3. عیدی in Esfand (month 12) --- */
      if (jm === 12) {
        const eidiDay = Math.min(randInt(rng, 1, 5), dayCap);
        out.push(
          makeTx({
            rng,
            now,
            jy,
            jm,
            jd: eidiDay,
            amount: 50_000_000, // 50M toman — large year-end bonus
            categoryId: CATEGORY_IDS.eidi,
            destinationId: DESTINATION_IDS.bankMelli,
            note: pick(rng, EIDI_NOTES),
          }),
        );
      }

      /* --- 4. Occasions: تولد امام / مبعث ---
         Approximate placement (not tied to lunar calendar — just need
         realistic-feeling spread for demo purposes). --- */
      if (jm === 6 && dayCap >= 10) {
        // ~ late summer — placed as یک تولد امام → کارت مهر
        out.push(
          makeTx({
            rng,
            now,
            jy,
            jm,
            jd: Math.min(10, dayCap),
            amount: randInt(rng, 2, 4) * 1_000_000, // 2M–4M
            categoryId: CATEGORY_IDS.imamBirthday,
            destinationId: DESTINATION_IDS.mehrCard,
            note: pick(rng, IMAM_BIRTHDAY_NOTES),
          }),
        );
      }
      if (jm === 9 && dayCap >= 20) {
        // ~ late autumn — مبعث → بانک ملی
        out.push(
          makeTx({
            rng,
            now,
            jy,
            jm,
            jd: Math.min(20, dayCap),
            amount: randInt(rng, 3, 5) * 1_000_000, // 3M–5M
            categoryId: CATEGORY_IDS.mabas,
            destinationId: DESTINATION_IDS.bankMelli,
            note: pick(rng, MABAS_NOTES),
          }),
        );
      }

      /* --- 5. Scattered کارت هدیه → کارت نقدی مهر
         Random month: ~50% chance of one gift card. --- */
      if (rng() < 0.5 && dayCap >= 5) {
        const gcDay = Math.min(randInt(rng, 3, dayCap), dayCap);
        out.push(
          makeTx({
            rng,
            now,
            jy,
            jm,
            jd: gcDay,
            amount: randInt(rng, 3, 20) * 500_000, // 1.5M–10M
            categoryId: CATEGORY_IDS.giftCard,
            destinationId: DESTINATION_IDS.cashMehr,
            note: pick(rng, GIFT_CARD_NOTES),
          }),
        );
      }
    }
  }

  // Sort by date ascending — easier for any caller iterating
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/* -------------------------------------------------------------------------
   Internal: build one Transaction record
   ------------------------------------------------------------------------- */

interface MakeTxArgs {
  rng: () => number;
  now: string;
  jy: number;
  jm: number;
  jd: number;
  amount: number;
  categoryId: string;
  destinationId: string;
  note: string;
}

function makeTx(args: MakeTxArgs): Transaction {
  const iso = jalaliToISO(args.jy, args.jm, args.jd);
  return {
    id: uuid(),
    type: 'income',
    amount: args.amount,
    date: iso,
    categoryId: args.categoryId,
    destinationId: args.destinationId,
    note: args.note,
    isDemo: true,
    createdAt: args.now,
    updatedAt: args.now,
    deletedAt: null,
  };
}
