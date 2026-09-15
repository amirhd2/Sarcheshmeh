'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Transaction, Category, Destination } from '@/db/schema';
import { TransactionRow } from './TransactionRow';
import { formatJalaliMonthDay, weekdayNameFa, toPersianDigits, toEnglishDigits, type DigitPref, type Season } from '@lib/jalali';
import { formatAmount } from '@lib/format';
import { toast } from 'sonner';

interface TransactionListProps {
  transactions: Transaction[];
  categories: ReadonlyArray<Category>;
  destinations: ReadonlyArray<Destination>;
  digits: DigitPref;
  season: Season;
  onDeleteTransaction?: (tx: Transaction) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

interface DayGroup {
  dateISO: string;
  weekday: string;
  dateLabel: string;
  total: number;
  items: Transaction[];
}

export function TransactionList({ transactions, categories, destinations, digits, onDeleteTransaction, onEditTransaction }: TransactionListProps) {
  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const tx of transactions) {
      const key = tx.date;
      const existing = map.get(key);
      if (existing) { existing.total += tx.amount; existing.items.push(tx); }
      else { map.set(key, { dateISO: key, weekday: weekdayNameFa(key), dateLabel: formatJalaliMonthDay(key, digits), total: tx.amount, items: [tx] }); }
    }
    return [...map.values()].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  }, [transactions, digits]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const destinationMap = useMemo(() => {
    const m = new Map<string, Destination>();
    for (const d of destinations) m.set(d.id, d);
    return m;
  }, [destinations]);

  return (
    <div className="space-y-2">
      {groups.map((group, groupIdx) => (
        <motion.div key={group.dateISO} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(groupIdx * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex items-center px-4 py-2 mx-4 rounded-2xl" style={{ background: 'rgb(var(--surface-2))' }}>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-text-muted">{group.weekday}</span>
              <span className="nums digits-font text-xs text-text-faint">{group.dateLabel}</span>
            </div>
          </div>
          <div className="card mx-4 mt-1 overflow-hidden">
            {group.items.map((tx, idx) => (
              <div key={tx.id}>
                <TransactionRow transaction={tx} category={categoryMap.get(tx.categoryId)} destination={destinationMap.get(tx.destinationId)} digits={digits}
                  onDelete={onDeleteTransaction ? () => onDeleteTransaction(tx) : () => toast('این سال قفل است', { description: 'برای تغییر، ابتدا قفل سال رو در تنظیمات باز کن' })}
                  onEdit={onEditTransaction ? () => onEditTransaction(tx) : () => toast('این سال قفل است', { description: 'برای تغییر، ابتدا قفل سال رو در تنظیمات باز کن' })} />
                {idx < group.items.length - 1 && <div className="h-px mx-4" style={{ background: 'rgb(var(--text) / 0.06)' }} />}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
