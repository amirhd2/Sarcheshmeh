'use client';

/* =========================================================================
   سرچشمه — useSeasonData
   =========================================================================
   Live queries for the season page.
   ========================================================================= */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { jalaliSeasonRange, jalaliMonth, type Season } from '@lib/jalali';
import { useMemo } from 'react';

export interface MonthSummary {
  month: number;
  totalAmount: number;
  totalCount: number;
}

export interface SeasonTransaction {
  id: string;
  type: 'income';
  amount: number;
  date: string;
  categoryId: string;
  destinationId: string;
  note?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export function useSeasonTransactions(jy: number | null, season: Season | null) {
  const txs = useLiveQuery(async () => {
    try {
      if (jy === null || season === null) return [];
      const { start, end } = jalaliSeasonRange(jy, season);
      return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter((t) => !t.deletedAt)
        .toArray();
    } catch (err) {
      console.warn('Failed to query season transactions:', err);
      return [];
    }
  }, [jy, season]);

  return useMemo(() => {
    if (!txs) return { transactions: [], isLoading: true };
    const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
    return { transactions: sorted, isLoading: false };
  }, [txs]);
}

export function useMonthSummaries(jy: number | null, season: Season | null) {
  const { transactions, isLoading } = useSeasonTransactions(jy, season);

  return useMemo(() => {
    const seasonMonths = getSeasonMonths(season);
    if (isLoading || !transactions.length) {
      return {
        months: seasonMonths.map((m) => ({ month: m, totalAmount: 0, totalCount: 0 })),
        isLoading,
      };
    }
    const byMonth = new Map<number, { total: number; count: number }>();
    for (const tx of transactions) {
      const m = jalaliMonth(tx.date);
      const existing = byMonth.get(m) ?? { total: 0, count: 0 };
      existing.total += tx.amount;
      existing.count += 1;
      byMonth.set(m, existing);
    }
    const months: MonthSummary[] = seasonMonths.map((m) => {
      const data = byMonth.get(m);
      return { month: m, totalAmount: data?.total ?? 0, totalCount: data?.count ?? 0 };
    });
    return { months, isLoading: false };
  }, [transactions, isLoading, season]);
}

function getSeasonMonths(season: Season | null): number[] {
  if (season === 'spring') return [1, 2, 3];
  if (season === 'summer') return [4, 5, 6];
  if (season === 'autumn') return [7, 8, 9];
  if (season === 'winter') return [10, 11, 12];
  return [];
}
