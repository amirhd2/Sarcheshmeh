'use client';

/* =========================================================================
   سرچشمه — useLockedYears
   =========================================================================
   Reads/writes the lockedYears array from Settings.
   A locked year prevents editing/deleting transactions in that year.
   ========================================================================= */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';

/** Read the list of locked years. */
export function useLockedYears(): {
  lockedYears: number[];
  toggleLock: (year: number) => Promise<void>;
  isLocked: (year: number) => boolean;
} {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const lockedYears = settings?.lockedYears ?? [];

  async function toggleLock(year: number) {
    const s = await db.settings.get('singleton');
    if (!s) return;
    const current = s.lockedYears ?? [];
    const updated = current.includes(year)
      ? current.filter((y) => y !== year)
      : [...current, year];
    await db.settings.put({
      ...s,
      lockedYears: updated,
      updatedAt: new Date().toISOString(),
    });
  }

  function isLocked(year: number): boolean {
    return lockedYears.includes(year);
  }

  return { lockedYears, toggleLock, isLocked };
}
