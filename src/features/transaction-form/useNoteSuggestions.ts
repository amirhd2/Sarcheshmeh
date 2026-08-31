'use client';

/* =========================================================================
   سرچشمه — useNoteSuggestions
   =========================================================================
   Extracts unique notes from the user's transaction history to power
   the autocomplete dropdown in the transaction form.
   ========================================================================= */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useMemo } from 'react';

export function useNoteSuggestions(query: string, limit: number = 5) {
  const allNotes = useLiveQuery(async () => {
    const txs = await db.transactions.filter((t) => !t.deletedAt && t.note).toArray();
    // Extract unique notes, sorted by frequency (most used first)
    const freq = new Map<string, number>();
    for (const tx of txs) {
      if (tx.note) {
        freq.set(tx.note, (freq.get(tx.note) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([note]) => note);
  }, []);

  return useMemo(() => {
    if (!allNotes) return [];
    if (!query.trim()) return allNotes.slice(0, limit);
    const q = query.trim().toLowerCase();
    return allNotes
      .filter((note) => note.toLowerCase().includes(q))
      .slice(0, limit);
  }, [allNotes, query, limit]);
}
