'use client';

/* =========================================================================
   سرچشمه — Catalog CRUD operations
   =========================================================================
   Create / Update / Delete / Reorder for both categories and destinations.
   Delete with transfer: if a catalog item has transactions, the user
   must choose a replacement before deletion (no orphan transactions).
   ========================================================================= */

import { db } from '@/db/schema';
import type { Category, Destination } from '@/db/schema';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* -------------------------------------------------------------------------
   Categories
   ------------------------------------------------------------------------- */

export async function addCategory(data: { name: string; icon: string; color: string }): Promise<string> {
  const now = new Date().toISOString();
  const count = await db.categories.count();
  const id = `cat-${uuid().slice(0, 8)}`;
  const category: Category = {
    id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    order: count + 1,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.categories.put(category);
  return id;
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>): Promise<void> {
  const existing = await db.categories.get(id);
  if (!existing) return;
  await db.categories.put({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCategory(id: string, transferToId?: string): Promise<void> {
  // If transferToId is provided, move all transactions to the new category
  if (transferToId) {
    const txs = await db.transactions.filter((t) => t.categoryId === id).toArray();
    const now = new Date().toISOString();
    await db.transactions.bulkPut(txs.map((t) => ({ ...t, categoryId: transferToId, updatedAt: now })));
  }
  // Soft delete the category
  const cat = await db.categories.get(id);
  if (cat) {
    await db.categories.put({ ...cat, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  const updates = orderedIds.map((id, index) => {
    return db.categories.get(id).then((cat) => {
      if (cat) {
        return db.categories.put({ ...cat, order: index + 1, updatedAt: now });
      }
    });
  });
  await Promise.all(updates);
}

export async function getCategoryTransactionCount(id: string): Promise<number> {
  return db.transactions.filter((t) => t.categoryId === id && !t.deletedAt).count();
}

/* -------------------------------------------------------------------------
   Destinations
   ------------------------------------------------------------------------- */

export async function addDestination(data: { name: string; icon: string; color: string }): Promise<string> {
  const now = new Date().toISOString();
  const count = await db.destinations.count();
  const id = `dst-${uuid().slice(0, 8)}`;
  const destination: Destination = {
    id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    order: count + 1,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.destinations.put(destination);
  return id;
}

export async function updateDestination(id: string, patch: Partial<Pick<Destination, 'name' | 'icon' | 'color'>>): Promise<void> {
  const existing = await db.destinations.get(id);
  if (!existing) return;
  await db.destinations.put({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDestination(id: string, transferToId?: string): Promise<void> {
  if (transferToId) {
    const txs = await db.transactions.filter((t) => t.destinationId === id).toArray();
    const now = new Date().toISOString();
    await db.transactions.bulkPut(txs.map((t) => ({ ...t, destinationId: transferToId, updatedAt: now })));
  }
  const dst = await db.destinations.get(id);
  if (dst) {
    await db.destinations.put({ ...dst, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
}

export async function reorderDestinations(orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  const updates = orderedIds.map((id, index) => {
    return db.destinations.get(id).then((dst) => {
      if (dst) {
        return db.destinations.put({ ...dst, order: index + 1, updatedAt: now });
      }
    });
  });
  await Promise.all(updates);
}

export async function getDestinationTransactionCount(id: string): Promise<number> {
  return db.transactions.filter((t) => t.destinationId === id && !t.deletedAt).count();
}
