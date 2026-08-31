'use client';

import type { Transaction, Category, Destination } from '@/db/schema';
import { SwipeRow } from './SwipeRow';
import { formatAmount } from '@lib/format';
import type { DigitPref } from '@lib/jalali';

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  destination?: Destination;
  digits: DigitPref;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function TransactionRow({ transaction, category, destination, digits, onDelete, onEdit }: TransactionRowProps) {
  return (
    <SwipeRow onDelete={onDelete} onEdit={onEdit}>
      <div className="w-full flex items-center gap-3 px-4 py-3 text-right" style={{ background: 'rgb(var(--surface))' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${category?.color ?? '#999'}20` }}>
          <div className="w-3 h-3 rounded-full" style={{ background: category?.color ?? '#999' }} />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-sm font-medium text-text truncate">{category?.name ?? 'نامشخص'}</div>
          {transaction.note && <div className="text-xs text-text-muted truncate mt-0.5">{transaction.note}</div>}
          {destination && <div className="text-[11px] text-text-faint mt-0.5">{destination.name}</div>}
        </div>
        <div className="nums digits-font text-base font-bold text-text shrink-0">{formatAmount(transaction.amount, digits)}</div>
      </div>
    </SwipeRow>
  );
}
