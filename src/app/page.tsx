'use client';

/* =========================================================================
   ثمر — Dashboard + Season View (Phase 1 · Steps 4-8)
   =========================================================================
   The root page of the app. Shows:
   - Dashboard: header + year total + season cards grid + FAB
   - Season View: opens when a season card is tapped, with edge-swipe-back

   PRD §6 page 1 (Dashboard) + §6 page 2 (Transaction Form) + §6 page 3 (Season).
   ========================================================================= */

import { useMemo, useState, lazy, Suspense } from 'react';
import Image from 'next/image';
import { Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { YearSwitcher } from '@/components/dashboard/YearSwitcher';
import { SeasonCard } from '@/components/dashboard/SeasonCard';
import { CountUp } from '@/components/dashboard/CountUp';
import { Fab } from '@/components/dashboard/Fab';
import { BottomSheet } from '@/components/BottomSheet';
import { TransactionForm } from '@/features/transaction-form/TransactionForm';
import { SeasonView } from '@/components/season/SeasonView';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
const ReportsView = lazy(() => import('@/components/reports/ReportsView').then(m => ({ default: m.ReportsView })));
import { AppSplash } from '@/components/AppSplash';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';
import { useAvailableYears, useYearSummary } from '@/features/dashboard/useDashboardData';
import { formatAmount } from '@lib/format';
import { todayJalaliParts, jalaliSeason, faNum, type Season } from '@lib/jalali';
import { useLockedYears } from '@/features/settings/useLockedYears';
import { LockBadge } from '@/components/LockBadge';

const SEASONS: ReadonlyArray<Season> = ['spring', 'summer', 'autumn', 'winter'];

export default function HomePage() {
  const { ready, digits } = useAppSettings();
  const { years, currentYear, isLoading: yearsLoading } = useAvailableYears();

  // Current real-world Jalali year and season
  const todayInfo = useMemo(() => todayJalaliParts(), []);
  const currentJalaliYear = todayInfo.jy;
  const currentJalaliSeason = useMemo(() => jalaliSeason(new Date()), []);

  // Default to current jalali year if no data exists yet
  const fallbackYear = todayInfo.jy;
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Once years load, default to the most recent year present
  const effectiveYear = selectedYear ?? currentYear ?? fallbackYear;
  const { summary, isLoading: summaryLoading } = useYearSummary(effectiveYear);

  // FAB / bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);

  // Season view state — null = dashboard, otherwise show that season
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);

  // Settings sheet state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Reports view state
  const [showReports, setShowReports] = useState(false);

  // Year lock state
  const { isLocked } = useLockedYears();
  const yearLocked = isLocked(effectiveYear);

  // App is ready when DB is loaded or years are available
  const isReady = ready || !yearsLoading;

  const yearsToShow = years.length > 0 ? years : [effectiveYear];

  return (
    <>
      {/* In-app splash screen — shows for at least 1.5s on every load,
          even after JS hydrates. Bridges the gap between the native
          iOS/Android splash (which disappears instantly) and the app
          being fully interactive. PRD user feedback: splash was too
          short to see. */}
      <AppSplash ready={isReady} />

      <main className="min-h-safe pb-24">
        <DashboardHeader
          years={yearsToShow}
          selectedYear={effectiveYear}
          onSelectYear={setSelectedYear}
          digits={digits}
          onSettingsClick={() => setSettingsOpen(true)}
          onReportsClick={() => setShowReports(true)}
          isYearLocked={yearLocked}
        />

        {/* Content container */}
        <div className="px-4 space-y-4 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
          {/* Year total card with count-up */}
          <YearTotalCard
            totalAmount={summary.totalAmount}
            totalCount={summary.totalCount}
            isLoading={summaryLoading}
            digits={digits}
          />

          {/* Season cards grid — tap to open season view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {SEASONS.map((season) => (
              <SeasonCard
                key={season}
                season={season}
                totalAmount={summary.seasons[season].totalAmount}
                totalCount={summary.seasons[season].totalCount}
                yearTotal={summary.totalAmount}
                digits={digits}
                isCurrentSeason={effectiveYear === currentJalaliYear && season === currentJalaliSeason}
                onClick={() => setActiveSeason(season)}
              />
            ))}
          </div>
        </div>

        <Fab
          onAdd={() => setSheetOpen(true)}
          isOpen={sheetOpen}
        />

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="تراکنش جدید"
        >
          <TransactionForm
            dashboardYear={effectiveYear}
            onSubmit={() => setSheetOpen(false)}
          />
        </BottomSheet>
      </main>

      {/* Season View — rendered when activeSeason is set.
          Entry/exit animations are handled inside SeasonView via CSS
          transitions so the edge-swipe gesture can directly control
          the transform.
          The `key` prop remounts the component when year/season changes,
          which resets the filter state without needing useEffect. */}
      {activeSeason && (
        <SeasonView
          key={`${activeSeason}-${effectiveYear}`}
          year={effectiveYear}
          season={activeSeason}
          onBack={() => setActiveSeason(null)}
        />
      )}

      {/* Settings sheet — opened from the header settings icon */}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Reports view — lazy loaded to avoid loading recharts on initial page load */}
      {showReports && (
        <Suspense fallback={null}>
          <ReportsView year={effectiveYear} onBack={() => setShowReports(false)} />
        </Suspense>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */

function DashboardHeader({
  years,
  selectedYear,
  onSelectYear,
  digits,
  onSettingsClick,
  onReportsClick,
  isYearLocked,
}: {
  years: ReadonlyArray<number>;
  selectedYear: number;
  onSelectYear: (y: number) => void;
  digits: 'fa' | 'en';
  onSettingsClick?: () => void;
  onReportsClick?: () => void;
  isYearLocked: boolean;
}) {
  return (
    <header
      className="sticky top-0 z-30 px-4 py-3 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full flex items-center justify-between"
      style={{
        background: 'rgb(var(--bg) / 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgb(var(--text) / 0.06)',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Image
          src="/icons/icon.png"
          alt="ثمر"
          width={36}
          height={36}
          className="w-8 h-8 md:w-9 md:h-9 object-contain shrink-0 select-none"
          priority
          unoptimized
          referrerPolicy="no-referrer"
        />
        <h1 className="text-lg md:text-xl font-bold text-text">ثمر</h1>
      </div>

      <div className="flex items-center gap-2">
        {isYearLocked && <LockBadge year={selectedYear} digits={digits} />}
        <YearSwitcher
          years={years}
          selectedYear={selectedYear}
          onSelect={onSelectYear}
          digits={digits}
        />
        {onReportsClick && (
          <button
            type="button"
            onClick={onReportsClick}
            aria-label="گزارش‌ها"
            className="w-9 h-9 rounded-full flex items-center justify-center pressable"
            style={{
              background: 'rgb(var(--surface-2))',
              color: 'rgb(var(--text-muted))',
            }}
          >
            <BarChart3 size={18} strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          aria-label="تنظیمات"
          onClick={onSettingsClick}
          className="w-9 h-9 rounded-full flex items-center justify-center pressable"
          style={{
            background: 'rgb(var(--surface-2))',
            color: 'rgb(var(--text-muted))',
          }}
        >
          <SettingsIcon size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

function YearTotalCard({
  totalAmount,
  totalCount,
  isLoading,
  digits,
}: {
  totalAmount: number;
  totalCount: number;
  isLoading: boolean;
  digits: 'fa' | 'en';
}) {
  return (
    <section className="card p-5 md:p-7 lg:p-8 relative overflow-hidden">
      {/* Ambient Glow Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-45 transition-opacity"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 90% 25%, rgb(var(--brand-primary) / 0.18) 0%, transparent 70%), radial-gradient(ellipse 55% 55% at 15% 85%, rgb(var(--season-summer) / 0.22) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-text-muted">جمع درآمد سال</p>
          {isLoading ? (
            <div className="mt-2 h-9 md:h-12 w-40 md:w-56 rounded-lg animate-pulse" style={{ background: 'rgb(var(--surface-2))' }} />
          ) : (
            <CountUp value={totalAmount} duration={900}>
              {(current) => (
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mt-1 md:mt-2">
                  <span className="nums digits-font text-3xl sm:text-4xl md:text-5xl font-extrabold text-text tracking-tight leading-none">
                    {formatAmount(current, digits)}
                  </span>
                  <span className="text-sm md:text-base lg:text-lg font-normal text-text-muted select-none">
                    تومان
                  </span>
                </div>
              )}
            </CountUp>
          )}
          <div className="mt-3 md:mt-4 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-medium"
              style={{
                background: 'rgb(var(--surface-2) / 0.85)',
                border: '1px solid rgb(var(--text) / 0.08)',
              }}
            >
              <span className="nums digits-font font-bold text-text">
                {digits === 'fa' ? faNum(totalCount) : totalCount}
              </span>
              <span className="text-text-muted text-[11px] md:text-xs">تراکنش ثبت شده</span>
            </span>
          </div>
        </div>

        {/* Icon with dark-mode clarity and ambient backglow */}
        <div className="shrink-0 relative flex items-center justify-center">
          {/* Subtle glow behind emblem in dark mode */}
          <div
            className="absolute inset-0 rounded-full blur-xl pointer-events-none opacity-0 dark:opacity-75"
            style={{
              background: 'radial-gradient(circle, rgb(var(--brand-primary) / 0.45) 0%, transparent 70%)',
              transform: 'scale(1.35)',
            }}
          />
          <Image
            src="/icons/thamar.png"
            alt="ثمر"
            width={180}
            height={180}
            className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain select-none transition-transform duration-300 hover:scale-105 relative z-10 dark:brightness-115 dark:contrast-110 dark:drop-shadow-[0_0_18px_rgba(95,168,143,0.35)]"
            priority
            unoptimized
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-safe flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-6 text-center">
        <div className="inline-flex items-center justify-center mb-3">
          <Image
            src="/icons/icon.png"
            alt="ثمر"
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
            unoptimized
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-lg font-bold text-text mb-1">ثمر</h1>
        <p className="text-sm text-text-muted">در حال بارگذاری…</p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------- */
/* Small icons — drop/tear shape, matching the app's brand */

function DropIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 4C16 4 7 13.5 7 20a9 9 0 0 0 18 0c0-6.5-9-16-9-16Z"
        fill="currentColor"
        className="text-brand-primary"
        opacity="0.9"
      />
    </svg>
  );
}

function DropIconLarge() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 4C16 4 7 13.5 7 20a9 9 0 0 0 18 0c0-6.5-9-16-9-16Z"
        fill="currentColor"
        className="text-brand-primary"
        opacity="0.9"
      />
      <path
        d="M12 19a4 4 0 0 0 4 4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
