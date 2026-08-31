/* =========================================================================
   سرچشمه — Dexie schema & domain types
   =========================================================================
   Sync-ready from day one (PRD §3):
   - Every record has createdAt / updatedAt for change tracking
   - Soft delete via deletedAt — never hard-delete syncable rows
   - isDemo flag isolates sample data from user data
   - Years are derived from data (no Year table); "year closing" is just
     an edit lock planned for Phase 3.

   Indexes (PRD §3): date, categoryId, destinationId, isDemo, updatedAt
   ========================================================================= */

import Dexie, { type Table } from 'dexie';

/* -------------------------------------------------------------------------
   Domain types
   ------------------------------------------------------------------------- */

export type TransactionType = 'income'; // future: | 'expense'

export interface Transaction {
  id: string; // UUID v4
  type: TransactionType;
  amount: number; // toman, integer — always
  date: string; // ISO Gregorian (YYYY-MM-DD) = source of truth; jalali only for display
  categoryId: string;
  destinationId: string;
  note?: string;
  isDemo: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  deletedAt?: string | null; // soft delete — keep for sync
  // Recurring transaction support (Phase 2)
  recurring?: {
    frequency: 'monthly' | 'yearly'; // repeat interval
    count: number; // total number of occurrences (including original)
    parentId: string; // ID of the original transaction (all instances share this)
    instanceNumber: number; // 1-based: 1 = first occurrence, 2 = second, etc.
  } | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name OR single-emoji glyph
  color: string; // hex, e.g. "#C9718F"
  order: number; // for drag-to-reorder
  isDemo: boolean; // true if part of default seed
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Destination {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type ThemePref = 'system' | 'light' | 'dark';
export type DigitPref = 'fa' | 'en';

export interface Settings {
  id: 'singleton'; // always 'singleton'
  theme: ThemePref;
  digits: DigitPref;
  unit: 'toman'; // future: rial
  sampleDataLoaded: boolean; // true after first-run seed completes
  schemaVersion: number;
  updatedAt: string;
}

/** Shape of a backup export (PRD §3 Backup). */
export interface BackupFile {
  app: 'sarcheshmeh';
  schemaVersion: number;
  exportedAt: string; // ISO timestamp
  data: {
    transactions: Transaction[];
    categories: Category[];
    destinations: Destination[];
    settings: Settings;
  };
}

/* -------------------------------------------------------------------------
   Dexie database
   ------------------------------------------------------------------------- */

export class SarcheshmehDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  destinations!: Table<Destination, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('sarcheshmeh');

    // Schema v1 — initial release.
    // Compound-friendly indexes chosen so the common UI queries
    // (list by year → group by month → list by day, filter by category,
    // filter by destination, isolate demo data) all hit an index.
    this.version(1).stores({
      transactions:
        'id, type, date, categoryId, destinationId, isDemo, updatedAt, deletedAt, [date+isDemo], [categoryId+date], [destinationId+date]',
      categories: 'id, order, isDemo, updatedAt, deletedAt',
      destinations: 'id, order, isDemo, updatedAt, deletedAt',
      settings: 'id',
    });
  }
}

export const db = new SarcheshmehDB();

/* -------------------------------------------------------------------------
   Schema version constant — used by backup/restore + future migrations
   ------------------------------------------------------------------------- */

export const SCHEMA_VERSION = 1;
