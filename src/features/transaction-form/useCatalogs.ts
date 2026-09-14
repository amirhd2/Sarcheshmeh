'use client';

/* =========================================================================
   سرچشمه — useCategories & useDestinations
   =========================================================================
   Live queries for active (non-deleted) categories and destinations,
   sorted by their `order` field. Used by the transaction form's chip
   selectors.
   ========================================================================= */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';

export function useCategories() {
  return useLiveQuery(async () => {
    const items = await db.categories
      .filter((c) => !c.deletedAt)
      .toArray();
    return items.sort((a, b) => a.order - b.order);
  }, []);
}

export function useDestinations() {
  return useLiveQuery(async () => {
    const items = await db.destinations
      .filter((d) => !d.deletedAt)
      .toArray();
    return items.sort((a, b) => a.order - b.order);
  }, []);
}
