'use client';

/* =========================================================================
   سرچشمه — Recurring transaction generation
   =========================================================================
   Given a base transaction + frequency + count, generates all instances.
   For monthly: each instance is ~1 month after the previous.
   For yearly: each instance is ~1 year after the previous.
   Uses dayjs with jalali-plugin to compute Jalali month/year arithmetic.
   ========================================================================= */

import dayjs from 'dayjs';
import jalaliday from 'jalali-plugin-dayjs';
import { db } from '@/db/schema';
import type { Transaction } from '@/db/schema';
import { jalaliToISO, gregorianToJalaliParts } from '@lib/jalali';

dayjs.extend(jalaliday);

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Generate recurring transactions from a base transaction.
 * Creates `count` total instances (including the original date).
 * The first instance uses the base transaction's date; subsequent
 * instances are computed by adding months or years in Jalali calendar.
 *
 * @param base The transaction to repeat (amount, category, destination, note)
 * @param frequency 'monthly' or 'yearly'
 * @param count Total number of instances (e.g. 12 = 12 months)
 * @returns Array of Transaction objects to insert
 */
export function generateRecurringTransactions(
  base: Pick<Transaction, 'amount' | 'categoryId' | 'destinationId' | 'note'>,
  baseDateISO: string,
  frequency: 'monthly' | 'yearly',
  count: number,
): Transaction[] {
  const now = new Date().toISOString();
  const parentId = uuid();

  // Parse the base date into Jalali parts
  const baseParts = gregorianToJalaliParts(baseDateISO);

  const transactions: Transaction[] = [];

  for (let i = 0; i < count; i++) {
    let dateISO: string;

    if (i === 0) {
      // First instance = original date
      dateISO = baseDateISO;
    } else {
      // Compute Jalali date by adding months or years
      let jy = baseParts.jy;
      let jm = baseParts.jm;
      let jd = baseParts.jd;

      if (frequency === 'monthly') {
        const totalMonths = jm - 1 + i; // 0-based month offset
        jy = baseParts.jy + Math.floor(totalMonths / 12);
        jm = (totalMonths % 12) + 1; // 1-based
      } else {
        // yearly
        jy = baseParts.jy + i;
      }

      // Clamp day to month length (e.g. day 31 in a 30-day month)
      const maxDay = daysInJalaliMonth(jy, jm);
      jd = Math.min(jd, maxDay);

      dateISO = jalaliToISO(jy, jm, jd);
    }

    transactions.push({
      id: uuid(),
      type: 'income',
      amount: base.amount,
      date: dateISO,
      categoryId: base.categoryId,
      destinationId: base.destinationId,
      note: base.note,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      recurring: {
        frequency,
        count,
        parentId,
        instanceNumber: i + 1,
      },
    });
  }

  return transactions;
}

/** Number of days in a Jalali month. Months 1-6 = 31, 7-11 = 30, 12 = 29/30. */
function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand — use dayjs to compute
  const padded = `${jy}-12-01`;
  return dayjs(padded, { jalali: true }).endOf('month').date();
}

/**
 * Save recurring transactions to the database.
 */
export async function saveRecurringTransactions(transactions: Transaction[]): Promise<void> {
  await db.transactions.bulkPut(transactions);
}

/**
 * Delete all instances of a recurring transaction series.
 * Uses parentId to find all related transactions.
 */
export async function deleteRecurringSeries(parentId: string): Promise<number> {
  const all = await db.transactions.filter((t) => t.recurring?.parentId === parentId).toArray();
  const now = new Date().toISOString();
  await db.transactions.bulkPut(
    all.map((t) => ({ ...t, deletedAt: now, updatedAt: now })),
  );
  return all.length;
}
