'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CountUp } from '@/components/dashboard/CountUp';
import { formatCompactParts, formatPercent } from '@lib/format';
import { JALALI_MONTHS_FA, SEASON_ACCENT_VAR, faNum, type Season, type DigitPref } from '@lib/jalali';

interface MonthCardProps {
  month: number;
  season: Season;
  totalAmount: number;
  totalCount: number;
  seasonTotal: number;
  digits: DigitPref;
  isActive?: boolean;
  isCurrentMonth?: boolean;
  onTap?: () => void;
}

export function MonthCard({
  month,
  season,
  totalAmount,
  totalCount,
  seasonTotal,
  digits,
  isActive = false,
  isCurrentMonth = false,
  onTap,
}: MonthCardProps) {
  const monthName = JALALI_MONTHS_FA[month - 1] ?? '';
  const accent = SEASON_ACCENT_VAR[season];
  const pctOfSeason = seasonTotal > 0 ? totalAmount / seasonTotal : 0;

  return (
    <motion.button
      type="button"
      onClick={onTap}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={`card flex-1 p-3 sm:p-4 text-right pressable relative overflow-hidden group transition-all duration-200 ${
        isActive
          ? 'ring-2 shadow-md'
          : 'hover:border-text/15'
      }`}
      style={{
        background: 'rgb(var(--surface))',
        // Use accent color for ring when active
        boxShadow: isActive ? `0 0 0 2px ${accent}, 0 4px 16px -4px ${accent}40` : undefined,
      }}
    >
      {/* Seasonal tinted background */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-200"
        style={{
          background: `rgb(var(--season-${season}) / ${isActive ? '0.75' : '0.35'})`,
        }}
      />

      {/* Active accent top bar */}
      {isActive && (
        <div
          className="absolute top-0 inset-x-0 h-1 pointer-events-none"
          style={{ backgroundColor: accent }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Header row: Month name + Badges */}
        <div className="flex items-center justify-between gap-1">
          <span className={`text-xs sm:text-sm font-bold leading-tight ${isActive ? 'text-text' : 'text-text'}`}>
            {monthName}
          </span>

          {isActive ? (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold select-none shrink-0"
              style={{
                backgroundColor: accent,
                color: '#FFFFFF',
              }}
            >
              <Check size={10} strokeWidth={3} />
              <span className="hidden xs:inline sm:inline">انتخاب</span>
            </span>
          ) : isCurrentMonth ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold select-none shrink-0"
              style={{
                background: 'rgb(var(--brand-primary) / 0.15)',
                color: 'rgb(var(--brand-primary))',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              جاری
            </span>
          ) : null}
        </div>

        {/* Amount */}
        <div className="mt-2.5 sm:mt-3">
          <CountUp value={totalAmount} duration={600}>
            {(current) => {
              if (current <= 0) {
                return (
                  <div className="nums digits-font text-base sm:text-lg lg:text-xl font-extrabold text-text leading-none">
                    ۰ <span className="text-[10px] sm:text-xs font-normal text-text-muted">تومان</span>
                  </div>
                );
              }
              const parts = formatCompactParts(current, digits);
              return (
                <div className="nums digits-font text-base sm:text-lg lg:text-xl font-extrabold text-text leading-none whitespace-nowrap">
                  <span>{parts.value}</span>
                  {parts.unitShort && (
                    <>
                      <span className="text-[11px] font-medium text-text-muted mr-1 sm:hidden">
                        {parts.unitShort}
                      </span>
                      <span className="text-xs font-medium text-text-muted mr-1 hidden sm:inline">
                        {parts.unitLong}
                      </span>
                    </>
                  )}
                </div>
              );
            }}
          </CountUp>

          {/* Badges / Pill row */}
          <div className="flex flex-wrap items-center gap-1 mt-1.5 sm:mt-2">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium text-text-muted"
              style={{
                background: 'rgb(var(--surface) / 0.65)',
                border: '1px solid rgb(var(--text) / 0.06)',
              }}
            >
              <span className="nums digits-font font-bold text-text ml-0.5">
                {digits === 'fa' ? faNum(totalCount) : totalCount}
              </span>
              تراکنش
            </span>

            {totalAmount > 0 && seasonTotal > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold"
                style={{
                  background: 'rgb(var(--surface) / 0.65)',
                  border: '1px solid rgb(var(--text) / 0.06)',
                  color: accent,
                }}
              >
                <span className="nums digits-font">
                  {formatPercent(pctOfSeason, digits)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Minimal Progress / Distribution Bar */}
        <div className="w-full mt-2.5 sm:mt-3">
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: 'rgb(var(--text) / 0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, Math.max(pctOfSeason > 0 ? 4 : 0, pctOfSeason * 100))}%`,
                backgroundColor: accent,
              }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

