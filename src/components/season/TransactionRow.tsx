'use client';

import type { Transaction, Category, Destination } from '@/db/schema';
import { SwipeRow } from './SwipeRow';
import { formatAmount } from '@lib/format';
import type { DigitPref } from '@lib/jalali';
import { Repeat } from 'lucide-react';
import { IconRenderer } from '@/components/IconRenderer';

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  destination?: Destination;
  digits: DigitPref;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function TransactionRow({ transaction, category, destination, digits, onDelete, onEdit }: TransactionRowProps) {
  const isRecurring = !!transaction.recurring;
  const catColor = category?.color ?? '#888888';
  const catIcon = category?.icon ?? 'tag';

  return (
    <SwipeRow onDelete={onDelete} onEdit={onEdit}>
      <div className="w-full flex items-center gap-3 px-4 py-3 text-right" style={{ background: 'rgb(var(--surface))' }}>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 relative"
          style={{ background: `${catColor}1c` }}
        >
          <IconRenderer
            name={catIcon}
            size={22}
            strokeWidth={2.2}
            color={catColor}
            fallbackColor={catColor}
          />
          {isRecurring && (
            <div
              className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[rgb(var(--surface))]"
              style={{ background: 'rgb(var(--brand-primary))' }}
            >
              <Repeat size={8} strokeWidth={3} className="text-white" />
            </div>
          )}
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
