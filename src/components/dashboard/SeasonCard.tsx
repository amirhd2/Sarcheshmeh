'use client';

/* =========================================================================
   سرچشمه — SeasonCard
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

import { SeasonMotif } from './SeasonMotif';
import { CountUp } from './CountUp';
import { formatCompact, formatPercent } from '@lib/format';
import { SEASONS_FA, SEASON_MONTHS, JALALI_MONTHS_FA, type Season, type DigitPref } from '@lib/jalali';

interface SeasonCardProps {
  season: Season;
  totalAmount: number;
  totalCount: number;
  yearTotal: number; // for computing % of year
  digits: DigitPref;
  onClick?: () => void;
}

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
  onClick,
}: SeasonCardProps) {
  const months = SEASON_MONTHS[season];
  const monthRange = `${JALALI_MONTHS_FA[months[0] - 1]}–${JALALI_MONTHS_FA[months[2] - 1]}`;
  const pctOfYear = yearTotal > 0 ? totalAmount / yearTotal : 0;
  const accent = SEASON_ACCENT_VAR[season];

  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full p-4 text-right pressable relative overflow-hidden"
      style={{
        // Use the season's tint as background
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

      {/* Motif — top-left corner, low opacity */}
      <div
        className="absolute top-0 left-0 w-24 h-24 pointer-events-none"
        style={{ color: accent, opacity: 0.18 }}
      >
        <SeasonMotif season={season} className="w-full h-full" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-text">{SEASONS_FA[season]}</h3>
            <p className="text-xs text-text-muted mt-0.5">{monthRange}</p>
          </div>
        </div>

        <div className="mt-6">
          <CountUp value={totalAmount} duration={800}>
            {(current) => (
              <div className="nums digits-font text-2xl font-bold text-text leading-none">
                {formatCompact(current, digits)}
              </div>
            )}
          </CountUp>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-muted">
              <span className="nums digits-font font-medium text-text">
                {digits === 'fa' ? faNum(totalCount) : totalCount}
              </span>{' '}
              تراکنش
            </span>
            <span className="text-text-faint">·</span>
            <span className="nums digits-font text-xs font-medium" style={{ color: accent }}>
              {formatPercent(pctOfYear, digits)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function faNum(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}
