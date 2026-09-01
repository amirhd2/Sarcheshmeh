'use client';

/* =========================================================================
   سرچشمه — Sync layer (Dexie <-> Supabase)
   =========================================================================
   Bidirectional sync between local Dexie (IndexedDB) and remote Supabase.
   
   Strategy: last-write-wins based on `updatedAt` timestamp.
   
   Flow:
   1. push(): Send all local changes (new/modified/deleted) to Supabase
   2. pull(): Fetch all remote changes and merge into Dexie
   
   Conflict resolution:
   - Compare `updatedAt` — newer wins
   - Soft-deleted records (deletedAt != null) are respected
   
   Each table maps to its Supabase counterpart:
   - transactions → sarcheshmeh_transactions
   - categories → sarcheshmeh_categories
   - destinations → sarcheshmeh_destinations
   - settings → sarcheshmeh_settings
   ========================================================================= */

import { db } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import type { Transaction, Category, Destination, Settings } from '@/db/schema';

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

/** Map Dexie transaction → Supabase row */
function txToSupabase(tx: Transaction, userId: string) {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    date: tx.date,
    category_id: tx.categoryId,
    destination_id: tx.destinationId,
    note: tx.note ?? null,
    is_demo: tx.isDemo,
    recurring: tx.recurring ?? null,
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
    deleted_at: tx.deletedAt ?? null,
  };
}

/** Map Supabase row → Dexie transaction */
function supabaseToTx(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: (row.type as string) ?? 'income',
    amount: row.amount as number,
    date: row.date as string,
    categoryId: row.category_id as string,
    destinationId: row.destination_id as string,
    note: (row.note as string) ?? undefined,
    isDemo: (row.is_demo as boolean) ?? false,
    recurring: (row.recurring as Transaction['recurring']) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) ?? null,
  };
}

function catToSupabase(cat: Category, userId: string) {
  return {
    id: cat.id,
    user_id: userId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    order: cat.order,
    is_demo: cat.isDemo,
    created_at: cat.createdAt,
    updated_at: cat.updatedAt,
    deleted_at: cat.deletedAt ?? null,
  };
}

function supabaseToCat(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    order: row.order as number,
    isDemo: (row.is_demo as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) ?? null,
  };
}

function dstToSupabase(dst: Destination, userId: string) {
  return {
    id: dst.id,
    user_id: userId,
    name: dst.name,
    icon: dst.icon,
    color: dst.color,
    order: dst.order,
    is_demo: dst.isDemo,
    created_at: dst.createdAt,
    updated_at: dst.updatedAt,
    deleted_at: dst.deletedAt ?? null,
  };
}

function supabaseToDst(row: Record<string, unknown>): Destination {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    order: row.order as number,
    isDemo: (row.is_demo as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) ?? null,
  };
}

/**
 * Push all local changes to Supabase.
 * Sends ALL records (upsert) — Supabase handles duplicates.
 */
async function pushToSupabase(userId: string): Promise<number> {
  let pushed = 0;

  // Push transactions
  const txs = await db.transactions.toArray();
  if (txs.length > 0) {
    const rows = txs.map((t) => txToSupabase(t, userId));
    const { error } = await supabase.from('sarcheshmeh_transactions').upsert(rows, { onConflict: 'id' });
    if (!error) pushed += txs.length;
  }

  // Push categories
  const cats = await db.categories.toArray();
  if (cats.length > 0) {
    const rows = cats.map((c) => catToSupabase(c, userId));
    const { error } = await supabase.from('sarcheshmeh_categories').upsert(rows, { onConflict: 'id' });
    if (!error) pushed += cats.length;
  }

  // Push destinations
  const dsts = await db.destinations.toArray();
  if (dsts.length > 0) {
    const rows = dsts.map((d) => dstToSupabase(d, userId));
    const { error } = await supabase.from('sarcheshmeh_destinations').upsert(rows, { onConflict: 'id' });
    if (!error) pushed += dsts.length;
  }

  // Push settings
  const settings = await db.settings.get('singleton');
  if (settings) {
    const row = {
      id: 'singleton',
      user_id: userId,
      theme: settings.theme,
      digits: settings.digits,
      unit: settings.unit,
      sample_data_loaded: settings.sampleDataLoaded,
      schema_version: settings.schemaVersion,
      locked_years: JSON.stringify(settings.lockedYears ?? []),
      updated_at: settings.updatedAt,
    };
    await supabase.from('sarcheshmeh_settings').upsert(row, { onConflict: 'id' });
    pushed++;
  }

  return pushed;
}

/**
 * Pull all remote changes from Supabase and merge into Dexie.
 * Last-write-wins: if remote `updated_at` > local `updatedAt`, update local.
 */
async function pullFromSupabase(userId: string): Promise<number> {
  let pulled = 0;

  // Pull transactions
  const { data: remoteTxs, error: txError } = await supabase
    .from('sarcheshmeh_transactions')
    .select('*')
    .eq('user_id', userId);

  if (!txError && remoteTxs) {
    for (const row of remoteTxs) {
      const remoteTx = supabaseToTx(row as Record<string, unknown>);
      const localTx = await db.transactions.get(remoteTx.id);
      if (!localTx || new Date(remoteTx.updatedAt) > new Date(localTx.updatedAt)) {
        await db.transactions.put(remoteTx);
        pulled++;
      }
    }
  }

  // Pull categories
  const { data: remoteCats, error: catError } = await supabase
    .from('sarcheshmeh_categories')
    .select('*')
    .eq('user_id', userId);

  if (!catError && remoteCats) {
    for (const row of remoteCats) {
      const remoteCat = supabaseToCat(row as Record<string, unknown>);
      const localCat = await db.categories.get(remoteCat.id);
      if (!localCat || new Date(remoteCat.updatedAt) > new Date(localCat.updatedAt)) {
        await db.categories.put(remoteCat);
        pulled++;
      }
    }
  }

  // Pull destinations
  const { data: remoteDsts, error: dstError } = await supabase
    .from('sarcheshmeh_destinations')
    .select('*')
    .eq('user_id', userId);

  if (!dstError && remoteDsts) {
    for (const row of remoteDsts) {
      const remoteDst = supabaseToDst(row as Record<string, unknown>);
      const localDst = await db.destinations.get(remoteDst.id);
      if (!localDst || new Date(remoteDst.updatedAt) > new Date(localDst.updatedAt)) {
        await db.destinations.put(remoteDst);
        pulled++;
      }
    }
  }

  // Pull settings
  const { data: remoteSettings, error: settingsError } = await supabase
    .from('sarcheshmeh_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!settingsError && remoteSettings) {
    const rs = remoteSettings as Record<string, unknown>;
    const localSettings = await db.settings.get('singleton');
    const remoteUpdatedAt = rs.updated_at as string;
    if (!localSettings || new Date(remoteUpdatedAt) > new Date(localSettings.updatedAt)) {
      let lockedYears: number[] = [];
      try {
        const raw = rs.locked_years;
        if (typeof raw === 'string') lockedYears = JSON.parse(raw);
        else if (Array.isArray(raw)) lockedYears = raw;
      } catch { /* ignore parse errors */ }

      await db.settings.put({
        id: 'singleton',
        theme: (rs.theme as Settings['theme']) ?? 'system',
        digits: (rs.digits as Settings['digits']) ?? 'fa',
        unit: 'toman',
        sampleDataLoaded: (rs.sample_data_loaded as boolean) ?? false,
        schemaVersion: (rs.schema_version as number) ?? 1,
        lockedYears,
        updatedAt: remoteUpdatedAt,
      });
      pulled++;
    }
  }

  return pulled;
}

/**
 * Full sync: push then pull.
 */
export async function syncAll(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    pushed = await pushToSupabase(userId);
  } catch (e) {
    errors.push(`Push error: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    pulled = await pullFromSupabase(userId);
  } catch (e) {
    errors.push(`Pull error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { pushed, pulled, errors };
}
