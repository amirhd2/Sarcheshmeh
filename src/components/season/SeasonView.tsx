'use client';

/* =========================================================================
   ثمر — SeasonView
   =========================================================================
   PRD §6 page 3 (Season Page) + §7 (edge swipe back).
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { MonthCard } from '@/components/season/MonthCard';
import { TransactionList } from '@/components/season/TransactionList';
import { useSeasonTransactions, useMonthSummaries } from '@/features/season/useSeasonData';
import { softDeleteTransaction, undoDeleteTransaction } from '@/features/season/transactionOps';
import { useLockedYears } from '@/features/settings/useLockedYears';
import { useEdgeSwipeBack } from '@/features/season/useEdgeSwipeBack';
import { LockBadge } from '@/components/LockBadge';
import { Lock } from 'lucide-react';
import { useCategories, useDestinations } from '@/features/transaction-form/useCatalogs';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';
import { BottomSheet } from '@/components/BottomSheet';
import { TransactionForm } from '@/features/transaction-form/TransactionForm';
import type { Transaction } from '@/db/schema';
import { SEASONS_FA, SEASON_MONTHS, JALALI_MONTHS_FA, jalaliMonth, todayJalaliParts, faNum, type Season, type DigitPref } from '@lib/jalali';
import { formatToman } from '@lib/format';

const SEASON_HEADER_COLORS: Record<Season, { light: string; dark: string }> = {
  spring: { light: '#F9ECF1', dark: '#3C262F' },
  summer: { light: '#FBF1DF', dark: '#383020' },
  autumn: { light: '#F8ECE4', dark: '#382A24' },
  winter: { light: '#EBF0F5', dark: '#20262E' },
};

interface SeasonViewProps {
  year: number;
  season: Season;
  onBack: () => void;
}

export function SeasonView({ year, season, onBack }: SeasonViewProps) {
  const { digits } = useAppSettings();
  const categories = useCategories() ?? [];
  const destinations = useDestinations() ?? [];
  const { transactions, isLoading } = useSeasonTransactions(year, season);
  const { months } = useMonthSummaries(year, season);

  const currentJalali = useMemo(() => todayJalaliParts(), []);
  const seasonTotal = useMemo(() => months.reduce((acc, m) => acc + m.totalAmount, 0), [months]);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<number | null>(null);
  const { isLocked } = useLockedYears();
  const yearLocked = isLocked(year);

  useEffect(() => {
    return () => { if (exitTimeoutRef.current) window.clearTimeout(exitTimeoutRef.current); };
  }, []);

  const handleBack = () => {
    if (isExiting) return;
    setIsExiting(true);
    exitTimeoutRef.current = window.setTimeout(() => { onBack(); }, 300);
  };

  const swipeBackRef = useEdgeSwipeBack({ onBack: handleBack, disabled: isExiting });

  const handleDelete = async (tx: Transaction) => {
    await softDeleteTransaction(tx.id);
    toast('تراکنش حذف شد', {
      duration: 5000,
      action: { label: 'بازگرداندن', onClick: async () => { await undoDeleteTransaction(tx.id); toast.success('تراکنش بازگردانده شد'); } },
    });
  };

  const handleEdit = (tx: Transaction) => { setEditingTx(tx); };

  // Status bar tint
  useEffect(() => {
    const colors = SEASON_HEADER_COLORS[season];
    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? colors.dark : colors.light;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    const original: Array<string | null> = [];
    metas.forEach((m, i) => { original[i] = m.getAttribute('content'); m.setAttribute('content', color); if (m.hasAttribute('media')) m.removeAttribute('media'); });
    return () => {
      metas.forEach((m, i) => { if (original[i] !== null) m.setAttribute('content', original[i]!); });
      if (metas.length >= 2) {
        metas[0]?.setAttribute('media', '(prefers-color-scheme: light)');
        metas[0]?.setAttribute('content', '#F4F2EF');
        metas[1]?.setAttribute('media', '(prefers-color-scheme: dark)');
        metas[1]?.setAttribute('content', '#141619');
      }
    };
  }, [season]);

  const seasonName = SEASONS_FA[season];

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (selectedMonth !== null) result = result.filter((tx) => jalaliMonth(tx.date) === selectedMonth);
    if (selectedCategoryId !== null) result = result.filter((tx) => tx.categoryId === selectedCategoryId);
    return result;
  }, [transactions, selectedMonth, selectedCategoryId]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    const source = selectedMonth !== null ? transactions.filter((tx) => jalaliMonth(tx.date) === selectedMonth) : transactions;
    for (const tx of source) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    return map;
  }, [transactions, selectedMonth]);

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalCount = filteredTransactions.length;

  const activeCategories = useMemo(() => categories.filter((c) => categoryCounts.has(c.id)), [categories, categoryCounts]);

  return (
    <div ref={swipeBackRef}
      className={`season-view-enter fixed inset-0 z-40 ${editingTx !== null ? 'overflow-hidden' : 'overflow-y-auto'} no-scrollbar${isExiting ? ' is-exiting' : ''}`}
      style={{
        background: 'rgb(var(--bg))',
        transform: isExiting ? 'translate3d(100%, 0, 0)' : undefined,
        transition: isExiting ? 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)' : undefined,
        willChange: isExiting ? 'transform' : undefined,
      }}>
      <style>{`
        @keyframes season-view-enter { from { transform: translate3d(100%, 0, 0); } to { transform: translate3d(0, 0, 0); } }
        .season-view-enter { animation: season-view-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .season-view-enter.is-exiting { animation: none; }
      `}</style>

      {/* Header */}
      <div className={`season-header-wrapper-${season} sticky top-0 z-30 w-full`} style={{ background: SEASON_HEADER_COLORS[season].light }}>
        <style>{`.dark .season-header-wrapper-${season} { background: ${SEASON_HEADER_COLORS[season].dark} !important; }`}</style>
        <header className="px-4 py-3 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleBack} aria-label="بازگشت"
              className="w-9 h-9 rounded-full flex items-center justify-center pressable shrink-0"
              style={{ background: 'rgb(var(--surface) / 0.6)', color: 'rgb(var(--text))' }}>
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text">{seasonName}</h1>
                {yearLocked && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgb(var(--danger) / 0.15)' }}
                  >
                    <Lock size={10} strokeWidth={2.5} style={{ color: 'rgb(var(--danger))' }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-muted">
                  {JALALI_MONTHS_FA[SEASON_MONTHS[season][0] - 1]}–{JALALI_MONTHS_FA[SEASON_MONTHS[season][2] - 1]} ·{' '}
                  <span className="nums digits-font">{digits === 'fa' ? faNum(year) : year}</span>
                </p>
                {yearLocked && <LockBadge year={year} digits={digits} variant="full" />}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto pb-24">
        {/* Month selector cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-text-muted">انتخاب و تفکیک بر اساس ماه</span>
            {selectedMonth !== null && (
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className="text-xs font-medium text-brand-primary pressable hover:underline"
              >
                نمایش کل فصل
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {months.map((m) => (
              <MonthCard
                key={m.month}
                month={m.month}
                season={season}
                totalAmount={m.totalAmount}
                totalCount={m.totalCount}
                seasonTotal={seasonTotal}
                digits={digits}
                isActive={selectedMonth === m.month}
                isCurrentMonth={currentJalali.jy === year && currentJalali.jm === m.month}
                onTap={() => setSelectedMonth((prev) => (prev === m.month ? null : m.month))}
              />
            ))}
          </div>
        </div>

        {/* Category filters */}
        {transactions.length > 0 && activeCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-xs font-medium text-text-muted">فیلتر دسته</span>
              {(selectedMonth !== null || selectedCategoryId !== null) && (
                <button type="button" onClick={() => { setSelectedMonth(null); setSelectedCategoryId(null); }} className="text-xs text-brand-primary pressable">پاک کردن فیلترها</button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              <FilterChip active={selectedCategoryId === null} onClick={() => setSelectedCategoryId(null)} label="همه"
                count={transactions.filter((tx) => selectedMonth === null || jalaliMonth(tx.date) === selectedMonth).length} digits={digits} />
              {activeCategories.map((cat) => (
                <FilterChip key={cat.id} active={selectedCategoryId === cat.id}
                  onClick={() => setSelectedCategoryId((prev) => (prev === cat.id ? null : cat.id))}
                  label={cat.name} count={categoryCounts.get(cat.id) ?? 0} color={cat.color} digits={digits} />
              ))}
            </div>
          </div>
        )}

        {/* Results bar */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-1">
            <div className="text-sm text-text-muted">
              <span className="nums digits-font font-medium text-text">{digits === 'fa' ? faNum(totalCount) : totalCount}</span>{' '}
              تراکنش
              {selectedMonth !== null ? <> در {JALALI_MONTHS_FA[selectedMonth - 1]}</> : <> در {seasonName}</>}
            </div>
            <div className="nums digits-font text-sm font-bold text-text">{formatToman(totalAmount, digits)}</div>
          </div>
        )}

        {/* List or empty */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card mx-4 p-4 animate-pulse" style={{ background: 'rgb(var(--surface-2))' }}>
                <div className="h-4 w-24 rounded mb-2" style={{ background: 'rgb(var(--text) / 0.08)' }} />
                <div className="h-3 w-16 rounded" style={{ background: 'rgb(var(--text) / 0.06)' }} />
              </div>
            ))}
          </div>
        ) : totalCount > 0 ? (
          <TransactionList transactions={filteredTransactions} categories={categories} destinations={destinations} digits={digits} season={season}
            onDeleteTransaction={yearLocked ? undefined : handleDelete}
            onEditTransaction={yearLocked ? undefined : handleEdit} />
        ) : transactions.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-text-muted">با فیلترهای انتخاب‌شده تراکنشی پیدا نشد</p>
            <button type="button" onClick={() => { setSelectedMonth(null); setSelectedCategoryId(null); }} className="mt-3 text-sm text-brand-primary pressable">پاک کردن فیلترها</button>
          </div>
        ) : (
          <EmptyState season={season} />
        )}
      </div>

      {/* Edit sheet */}
      <BottomSheet open={editingTx !== null} onClose={() => setEditingTx(null)} title="ویرایش تراکنش">
        {editingTx && (
          <TransactionForm initialTransaction={editingTx} dashboardYear={year}
            onSubmit={() => { setEditingTx(null); toast.success('تراکنش ویرایش شد'); }} />
        )}
      </BottomSheet>
    </div>
  );
}

function EmptyState({ season }: { season: Season }) {
  const messages: Record<Season, string> = {
    spring: 'هنوز چیزی برای بهار نداری 🌱', summer: 'تابستان خالیه — اولین درآمد تابستانی رو ثبت کن ☀️',
    autumn: 'پاییز هنوز شروع نشده 🍂', winter: 'زمستان هنوز خالیه ❄️',
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-4xl mb-3">{getSeasonEmoji(season)}</div>
      <p className="text-sm text-text-muted">{messages[season]}</p>
    </div>
  );
}

function getSeasonEmoji(season: Season): string {
  return { spring: '🌱', summer: '☀️', autumn: '🍂', winter: '❄️' }[season];
}

function FilterChip({ label, count, active, onClick, color, digits }: { label: string; count: number; active: boolean; onClick: () => void; color?: string; digits: DigitPref }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm whitespace-nowrap pressable transition-colors shrink-0"
      style={{ background: active ? color ?? 'rgb(var(--brand-primary))' : 'rgb(var(--surface-2))', color: active ? 'white' : 'rgb(var(--text))' }}>
      {color && !active && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span className="font-medium">{label}</span>
      <span className="nums digits-font text-xs px-1.5 py-0.5 rounded-full"
        style={{ background: active ? 'rgba(255, 255, 255, 0.25)' : 'rgb(var(--text) / 0.08)' }}>
        {digits === 'fa' ? faNum(count) : count}
      </span>
    </button>
  );
}

