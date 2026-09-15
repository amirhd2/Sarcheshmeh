'use client';

/* =========================================================================
   ثمر — SeasonCard
   =========================================================================
   PRD §6 page 1 (Dashboard):
   Each season card shows:
   - Season name (بهار/تابستان/پاییز/زمستان)
   - Month range subtitle (فروردین–خرداد)
   - Linear SVG motif (faint, in corner)
   - Live total amount (with count-up on first mount)
   - Transaction count
   - % of year (live)

   Layout (mobile):
   - 1 column (stacked vertically)

   Layout (sm+):
   - 2×2 grid

   The card uses the season's tint color as its background, with the
   motif drawn in the season's accent color at low opacity. Per PRD §5,
   each season has its own tint + accent pair.
   ========================================================================= */

import Image from 'next/image';
import { CountUp } from './CountUp';
import { formatCompact, formatPercent } from '@lib/format';
import { SEASONS_FA, SEASON_MONTHS, JALALI_MONTHS_FA, faNum, type Season, type DigitPref } from '@lib/jalali';

interface SeasonCardProps {
  season: Season;
  totalAmount: number;
  totalCount: number;
  yearTotal: number; // for computing % of year
  digits: DigitPref;
  isCurrentSeason?: boolean;
  onClick?: () => void;
}

const SEASON_IMAGES: Record<Season, string> = {
  spring: '/icons/spring.png',
  summer: '/icons/summer.png',
  autumn: '/icons/autumn.png',
  winter: '/icons/winter.png',
};

/** Season accent colors — match the tint but a bit deeper for contrast. */
const SEASON_ACCENT_VAR: Record<Season, string> = {
  spring: '#C9718F', // rose
  summer: '#D9963E', // amber
  autumn: '#C96F5E', // terracotta
  winter: '#6B8CC3', // blue-grey
};

export function SeasonCard({
  season,
  totalAmount,
  totalCount,
  yearTotal,
  digits,
  isCurrentSeason = false,
  onClick,
}: SeasonCardProps) {
  const months = SEASON_MONTHS[season];
  const allMonthsText = months.map((m) => JALALI_MONTHS_FA[m - 1]).join(' · ');
  const pctOfYear = yearTotal > 0 ? totalAmount / yearTotal : 0;
  const accent = SEASON_ACCENT_VAR[season];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card w-full p-4 md:p-6 lg:p-7 text-right pressable relative overflow-hidden group transition-all duration-200 ${
        isCurrentSeason
          ? 'ring-2 ring-emerald-500/40 shadow-sm'
          : ''
      }`}
      style={{
        background: 'rgb(var(--surface))',
      }}
    >
      {/* Tinted overlay — gives the card its season color */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `rgb(var(--season-${season}) / 0.55)`,
        }}
      />

      {/* Watermark season image — refined opacity for crisp text readability */}
      <div
        className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 pointer-events-none select-none z-0 opacity-20 dark:opacity-25 group-hover:opacity-35 dark:group-hover:opacity-40 transition-all duration-300 group-hover:scale-105"
      >
        <Image
          src={SEASON_IMAGES[season]}
          alt={SEASONS_FA[season]}
          width={180}
          height={180}
          className="w-full h-full object-contain"
          unoptimized
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          {/* Header row: Season Name + Current Season Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-text leading-tight">{SEASONS_FA[season]}</h3>
              <p className="text-xs md:text-sm text-text-muted mt-0.5 md:mt-1 font-medium whitespace-nowrap">{allMonthsText}</p>
            </div>

            {isCurrentSeason && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[11px] font-semibold select-none shrink-0 whitespace-nowrap"
                style={{
                  background: 'rgb(var(--brand-primary) / 0.15)',
                  color: 'rgb(var(--brand-primary))',
                  border: '1px solid rgb(var(--brand-primary) / 0.25)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--brand-primary))' }} />
                فصل جاری
              </span>
            )}
          </div>

          {/* Amount */}
          <div className="mt-5 md:mt-7 lg:mt-8">
            <CountUp value={totalAmount} duration={800}>
              {(current) => (
                <div className="nums digits-font text-2xl md:text-3xl lg:text-4xl font-extrabold text-text leading-none">
                  {formatCompact(current, digits)}
                </div>
              )}
            </CountUp>

            {/* Badges / Pills row */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-2.5 md:mt-3.5">
              {/* % of year pill */}
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'rgb(var(--surface-2) / 0.85)',
                  border: '1px solid rgb(var(--text) / 0.08)',
                }}
              >
                <span className="nums digits-font font-bold" style={{ color: accent }}>
                  {formatPercent(pctOfYear, digits)}
                </span>
                <span className="text-text-muted text-[11px]">از کل سال</span>
              </span>

              {/* Transaction count pill */}
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-text-muted"
                style={{
                  background: 'rgb(var(--surface-2) / 0.85)',
                  border: '1px solid rgb(var(--text) / 0.08)',
                }}
              >
                <span className="nums digits-font font-bold text-text">
                  {digits === 'fa' ? faNum(totalCount) : totalCount}
                </span>
                <span className="text-[11px]">تراکنش</span>
              </span>
            </div>
          </div>
        </div>

        {/* Minimal Progress / Distribution Bar */}
        <div className="w-full mt-4 md:mt-5 pt-1">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgb(var(--text) / 0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, Math.max(pctOfYear > 0 ? 3 : 0, pctOfYear * 100))}%`,
                backgroundColor: accent,
              }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

