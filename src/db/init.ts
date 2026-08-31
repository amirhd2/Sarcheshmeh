/* =========================================================================
   سرچشمه — DB initialization & first-run seed
   =========================================================================
   On first launch:
   1. Write default categories & destinations (if missing)
   2. Write singleton settings row (if missing)
   3. Insert sample transactions (if sampleDataLoaded === false)

   All sample inserts are flagged `isDemo: true` so the user can later
   wipe ONLY sample data from Settings → "delete sample data" without
   touching any real records they've added in the meantime.

   This module is idempotent — safe to call on every app boot.
   ========================================================================= */

import { db, SCHEMA_VERSION } from './schema';
import type { Settings } from './schema';
import { buildDefaultCategories, buildDefaultDestinations, buildSampleTransactions } from './seed';

const SETTINGS_ID = 'singleton' as const;

/** Read the singleton settings row, or null if not yet created. */
export async function getSettings(): Promise<Settings | null> {
  const row = await db.settings.get(SETTINGS_ID);
  return row ?? null;
}

/** Initialize DB on app boot. Idempotent. Returns the active settings. */
export async function initDatabase(): Promise<Settings> {
  // 1. Ensure settings row exists
  let settings = await getSettings();
  if (!settings) {
    const now = new Date().toISOString();
    settings = {
      id: SETTINGS_ID,
      theme: 'system',
      digits: 'fa',
      unit: 'toman',
      sampleDataLoaded: false,
      schemaVersion: SCHEMA_VERSION,
      lockedYears: [],
      updatedAt: now,
    };
    await db.settings.put(settings);
  }

  // 1b. Migration: ensure lockedYears exists (for databases created
  // before Phase 3). If missing, add it with an empty array.
  if (!settings.lockedYears) {
    settings.lockedYears = [];
    await db.settings.put({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Ensure default categories exist (only if the table is empty)
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkPut(buildDefaultCategories());
  }

  // 3. Ensure default destinations exist
  const destCount = await db.destinations.count();
  if (destCount === 0) {
    await db.destinations.bulkPut(buildDefaultDestinations());
  }

  // 4. Seed sample transactions on first run only
  if (!settings.sampleDataLoaded) {
    const sampleTx = buildSampleTransactions();
    await db.transactions.bulkPut(sampleTx);
    settings = {
      ...settings,
      sampleDataLoaded: true,
      updatedAt: new Date().toISOString(),
    };
    await db.settings.put(settings);
  }

  return settings;
}

/** Wipe ONLY sample data — preserves user-entered records. */
export async function deleteSampleData(): Promise<{ transactionsRemoved: number }> {
  // Use .filter() instead of .where('isDemo').equals(1) because
  // IndexedDB doesn't natively support boolean indexes. Dexie converts
  // booleans to 0/1 for indexing, but the query behavior can be
  // inconsistent across Dexie versions. Filter is always reliable.
  const tx = await db.transactions.filter((t) => t.isDemo === true).toArray();
  const ids = tx.map((t) => t.id);
  if (ids.length > 0) {
    await db.transactions.bulkDelete(ids);
  }
  // Update settings timestamp (sampleDataLoaded stays true — we don't
  // want to re-seed automatically next launch)
  const settings = await getSettings();
  if (settings) {
    await db.settings.put({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  }
  return { transactionsRemoved: ids.length };
}

/** Update settings (partial). Merges with existing row. */
export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = await getSettings();
  if (!current) return;
  await db.settings.put({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * DANGER ZONE — wipe everything. Used by Settings → "پاک‌سازی کامل".
 * Resets DB to a fresh state: empty tables + default categories +
 * default destinations + (optionally) sample data.
 */
export async function wipeAll(opts: { reseedSample: boolean }): Promise<void> {
  await db.transactions.clear();
  await db.categories.clear();
  await db.destinations.clear();
  await db.settings.clear();
  // Re-init to get fresh defaults + settings row
  await initDatabase();
  if (!opts.reseedSample) {
    // initDatabase just inserted sample data — drop it again
    await deleteSampleData();
  }
}
