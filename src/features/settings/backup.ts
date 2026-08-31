'use client';

/* =========================================================================
   سرچشمه — Backup / Restore / CSV / Wipe
   =========================================================================
   PRD §8 + §9 (Settings):
   - Backup: download JSON with all transactions, categories, destinations, settings
   - Restore: upload JSON, merge or replace
   - CSV: export transactions as UTF-8 + BOM
   - Delete sample data: remove only isDemo transactions
   - Wipe all: danger zone, reset everything

   All operations use Dexie directly. Backup format is versioned
   (schemaVersion: 1) for future migrations.
   ========================================================================= */

import { db, SCHEMA_VERSION, type BackupFile, type Transaction, type Category, type Destination, type Settings } from '@/db/schema';
import { deleteSampleData } from '@/db/init';

/** Build a backup object from the current database state. */
export async function buildBackup(): Promise<BackupFile> {
  const [transactions, categories, destinations, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.destinations.toArray(),
    db.settings.get('singleton'),
  ]);

  return {
    app: 'sarcheshmeh',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      categories,
      destinations,
      settings: settings as Settings,
    },
  };
}

/** Trigger a JSON file download in the browser. */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download a backup file. */
export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const date = new Date().toISOString().slice(0, 10);
  downloadJSON(backup, `sarcheshmeh-backup-${date}.json`);
}

/** Restore from a backup file. Mode: 'merge' or 'replace'. */
export async function restoreBackup(file: File, mode: 'merge' | 'replace'): Promise<void> {
  const text = await file.text();
  let backup: BackupFile;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('فایل نامعتبر — JSON نیست');
  }

  if (backup.app !== 'sarcheshmeh') {
    throw new Error('فایل متعلق به سرچشمه نیست');
  }

  if (mode === 'replace') {
    await db.transactions.clear();
    await db.categories.clear();
    await db.destinations.clear();
  }

  // Merge: put all records (overwrites by id)
  if (backup.data.transactions?.length) {
    await db.transactions.bulkPut(backup.data.transactions as Transaction[]);
  }
  if (backup.data.categories?.length) {
    await db.categories.bulkPut(backup.data.categories as Category[]);
  }
  if (backup.data.destinations?.length) {
    await db.destinations.bulkPut(backup.data.destinations as Destination[]);
  }
  if (backup.data.settings) {
    await db.settings.put(backup.data.settings as Settings);
  }
}

/** Export transactions as CSV (UTF-8 + BOM for Excel). */
export async function exportCSV(): Promise<void> {
  const transactions = await db.transactions.filter((t) => !t.deletedAt).toArray();
  const categories = await db.categories.toArray();
  const destinations = await db.destinations.toArray();

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const dstMap = new Map(destinations.map((d) => [d.id, d.name]));

  const headers = ['تاریخ (میلادی)', 'مبلغ (تومان)', 'دسته', 'مقصد', 'توضیح'];
  const rows = transactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((tx) => [
      tx.date,
      String(tx.amount),
      catMap.get(tx.categoryId) ?? '',
      dstMap.get(tx.destinationId) ?? '',
      tx.note ?? '',
    ]);

  // BOM for UTF-8 + Excel compatibility
  const bom = '\uFEFF';
  const csv = bom + [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `sarcheshmeh-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Delete only sample data (isDemo transactions). */
export async function deleteSampleTransactions(): Promise<{ count: number }> {
  const result = await deleteSampleData();
  return { count: result.transactionsRemoved };
}

/** Wipe everything and re-seed defaults. */
export async function wipeAll(opts: { reseedSample: boolean }): Promise<void> {
  await db.transactions.clear();
  await db.categories.clear();
  await db.destinations.clear();
  await db.settings.clear();
  // Re-init to get fresh defaults + settings row
  const { initDatabase } = await import('@/db/init');
  await initDatabase();
  if (!opts.reseedSample) {
    // initDatabase just inserted sample data — drop it again
    await deleteSampleData();
  }
}
