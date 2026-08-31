'use client';

/* =========================================================================
   سرچشمه — transactionOps (delete + undo + edit)
   ========================================================================= */

import { db } from '@/db/schema';
import type { Transaction } from '@/db/schema';

export async function softDeleteTransaction(id: string): Promise<Transaction | null> {
  const tx = await db.transactions.get(id);
  if (!tx) return null;
  const now = new Date().toISOString();
  const updated: Transaction = { ...tx, deletedAt: now, updatedAt: now };
  await db.transactions.put(updated);
  return updated;
}

export async function undoDeleteTransaction(id: string): Promise<void> {
  const tx = await db.transactions.get(id);
  if (!tx) return;
  await db.transactions.put({ ...tx, deletedAt: null, updatedAt: new Date().toISOString() });
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
): Promise<void> {
  const tx = await db.transactions.get(id);
  if (!tx) return;
  await db.transactions.put({ ...tx, ...patch, updatedAt: new Date().toISOString() });
}
