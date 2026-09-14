'use client';

/* =========================================================================
   سرچشمه — Dashboard data hooks
   =========================================================================
   Live queries against Dexie that drive the dashboard:
   - useAvailableYears()  → sorted list of years present in the data
   - useYearSummary(jy)   → { totalAmount, totalCount, seasons: {spring, ...} }

   All queries use useLiveQuery from dexie-react-hooks so the UI updates
   in real time when transactions are added/edited/deleted.

   Performance note: we filter by date range using the `date` index for the
   year-wide query, then aggregate in-memory for per-season splits. For ~80
   records this is instant; we'll revisit if dataset grows beyond ~10k.
   ========================================================================= */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { jalaliYearRange, jalaliSeason, jalaliYear, todayJalaliParts, type Season } from '@lib/jalali';
import { useMemo } from 'react';

export interface SeasonSummary {
  season: Season;
  totalAmount: number;
  totalCount: number;
}

export interface YearSummary {
  totalAmount: number;
  totalCount: number;
  seasons: Record<Season, SeasonSummary>;
}

/** Empty summary — used before data loads. */
const EMPTY_SUMMARY: YearSummary = {
  totalAmount: 0,
  totalCount: 0,
  seasons: {
    spring: { season: 'spring', totalAmount: 0, totalCount: 0 },
    summer: { season: 'summer', totalAmount: 0, totalCount: 0 },
    autumn: { season: 'autumn', totalAmount: 0, totalCount: 0 },
    winter: { season: 'winter', totalAmount: 0, totalCount: 0 },
  },
};

/* -------------------------------------------------------------------------
   useAvailableYears — all jalali years present in the dataset, descending.
   Returns [currentYear, ...olderYears] so the dashboard can default to
   the latest one.
   ------------------------------------------------------------------------- */

export function useAvailableYears(): {
  years: number[];
  currentYear: number | null;
  isLoading: boolean;
} {
  const allDates = useLiveQuery(async () => {
    try {
      const txs = await db.transactions.toArray();
      return txs.map((t) => t.date);
    } catch (err) {
      console.warn('Failed to query transactions dates:', err);
      return [];
    }
  }, []);

  return useMemo(() => {
    const currentJalali = todayJalaliParts().jy;
    if (!allDates) {
      return {
        years: [currentJalali],
        currentYear: currentJalali,
        isLoading: false,
      };
    }
    const yearSet = new Set<number>();
    for (const iso of allDates) yearSet.add(jalaliYear(iso));
    const years = [...yearSet].sort((a, b) => b - a);
    return {
      years: years.length > 0 ? years : [currentJalali],
      currentYear: years[0] ?? currentJalali,
      isLoading: false,
    };
  }, [allDates]);
}

/* -------------------------------------------------------------------------
   useYearSummary — totals for a given jalali year + per-season split.
   ------------------------------------------------------------------------- */

export function useYearSummary(jy: number | null): {
  summary: YearSummary;
  isLoading: boolean;
} {
  const txs = useLiveQuery(async () => {
    try {
      if (jy === null) return [];
      const { start, end } = jalaliYearRange(jy);
      // Dexie's where('date').between() is inclusive by default on both
      // ends, which is what we want. We also filter out soft-deleted rows.
      return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter((t) => !t.deletedAt)
        .toArray();
    } catch (err) {
      console.warn('Failed to query year summary:', err);
      return [];
    }
  }, [jy]);

  return useMemo(() => {
    if (!txs) return { summary: EMPTY_SUMMARY, isLoading: true };
    if (txs.length === 0) return { summary: EMPTY_SUMMARY, isLoading: false };

    let totalAmount = 0;
    let totalCount = 0;
    const seasons: Record<Season, SeasonSummary> = {
      spring: { season: 'spring', totalAmount: 0, totalCount: 0 },
      summer: { season: 'summer', totalAmount: 0, totalCount: 0 },
      autumn: { season: 'autumn', totalAmount: 0, totalCount: 0 },
      winter: { season: 'winter', totalAmount: 0, totalCount: 0 },
    };

    for (const t of txs) {
      totalAmount += t.amount;
      totalCount += 1;
      const s = jalaliSeason(t.date);
      seasons[s].totalAmount += t.amount;
      seasons[s].totalCount += 1;
    }

    return {
      summary: { totalAmount, totalCount, seasons },
      isLoading: false,
    };
  }, [txs]);
}
