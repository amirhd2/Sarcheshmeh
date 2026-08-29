'use client';

/* =========================================================================
   سرچشمه — Phase 1 · Steps 1–3 health check screen (Next.js)
   =========================================================================
   Verifies:
   - Tailwind tokens resolve (light/dark switch works)
   - Dexie schema initializes cleanly
   - Default categories & destinations seed correctly
   - Sample transactions seed with the right shape & count (~80)
   - Jalali conversion + Persian/English digit formatting work
   - Digit font slot falls back to Vazirmatn without errors

   Phase 1 step 4 (dashboard) will replace this screen entirely.
   ========================================================================= */

import { useEffect, useMemo, useState } from 'react';
import { db, type Settings, type ThemePref, type DigitPref } from '@/db/schema';
import { initDatabase, updateSettings } from '@/db/init';
import {
  formatToman,
  formatCompact,
  groupDigits,
  parseAmountInput,
  formatPercent,
} from '@lib/format';
import {
  formatJalaliLong,
  formatJalaliShort,
  formatJalaliMonthYear,
  jalaliYear,
  jalaliSeason,
  SEASONS_FA,
} from '@lib/jalali';

interface BootResult {
  ok: boolean;
  error?: string;
  settings?: Settings;
  counts?: { transactions: number; categories: number; destinations: number };
  sampleCount?: number;
}

export default function HomePage() {
  const [boot, setBoot] = useState<BootResult>({ ok: false });
  const [digits, setDigits] = useState<DigitPref>('fa');
  const [theme, setTheme] = useState<ThemePref>('system');

  /* ---- Boot DB on mount ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await initDatabase();
        const [transactions, categories, destinations] = await Promise.all([
          db.transactions.count(),
          db.categories.count(),
          db.destinations.count(),
        ]);
        const sampleCount = await db.transactions.where('isDemo').equals(1).count();
        if (cancelled) return;
        setBoot({
          ok: true,
          settings,
          counts: { transactions, categories, destinations },
          sampleCount,
        });
        setDigits(settings.digits);
        setTheme(settings.theme);
      } catch (e) {
        if (cancelled) return;
        setBoot({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Apply theme to <html class="dark"> + data-theme ---- */
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: 'light' | 'dark') => {
      if (mode === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      root.setAttribute('data-theme', mode);
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    apply(theme);
  }, [theme]);

  /* ---- Persist settings changes ---- */
  const persistDigits = async (d: DigitPref) => {
    setDigits(d);
    await updateSettings({ digits: d });
  };
  const persistTheme = async (t: ThemePref) => {
    setTheme(t);
    await updateSettings({ theme: t });
  };

  if (!boot.ok) {
    return (
      <main className="min-h-safe flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-6 text-center">
          <h1 className="text-lg font-bold text-text mb-2">سرچشمه</h1>
          <p className="text-sm text-text-muted">
            {boot.error ? `خطا: ${boot.error}` : 'در حال راه‌اندازی…'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <HealthScreen
      boot={boot}
      digits={digits}
      theme={theme}
      onDigits={persistDigits}
      onTheme={persistTheme}
    />
  );
}

/* ------------------------------------------------------------------------- */

interface HealthScreenProps {
  boot: BootResult;
  digits: DigitPref;
  theme: ThemePref;
  onDigits: (d: DigitPref) => void;
  onTheme: (t: ThemePref) => void;
}

function HealthScreen({ boot, digits, theme, onDigits, onTheme }: HealthScreenProps) {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <main className="min-h-safe px-4 py-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <header className="text-center pt-2 pb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-3"
             style={{ background: 'rgb(var(--brand-primary) / 0.1)' }}>
          <DropIcon />
        </div>
        <h1 className="text-2xl font-bold text-text">سرچشمه</h1>
        <p className="text-sm text-text-muted mt-1">
          مرحله ۱ تا ۳ فاز ۱ — راه‌اندازی موفق
        </p>
      </header>

      {/* Boot status */}
      <section className="card p-4 space-y-3">
        <SectionTitle>وضعیت دیتابیس</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="تراکنش‌ها" value={boot.counts?.transactions ?? 0} digits={digits} />
          <Stat label="دسته‌ها" value={boot.counts?.categories ?? 0} digits={digits} />
          <Stat label="مقصدها" value={boot.counts?.destinations ?? 0} digits={digits} />
        </div>
        <div className="text-xs text-text-muted">
          از این تعداد، <span className="nums digits-font font-medium text-text">{fa(boot.sampleCount ?? 0)}</span> رکورد نمونه‌اند (با فلگ <code className="text-[11px]">isDemo</code>) — قابل حذف انتخابی از تنظیمات.
        </div>
      </section>

      {/* Theme switcher */}
      <section className="card p-4 space-y-3">
        <SectionTitle>تم</SectionTitle>
        <SegmentedControl
          value={theme}
          options={[
            { value: 'system', label: 'سیستم' },
            { value: 'light', label: 'روشن' },
            { value: 'dark', label: 'تاریک' },
          ]}
          onChange={(v) => onTheme(v as ThemePref)}
        />
        <p className="text-xs text-text-muted">
          کارت‌ها در هر دو تم باید از پس‌زمینه متمایز دیده بشن — در تاریک با حاشیه + هایلایت بالای کارت.
        </p>
      </section>

      {/* Digits switcher */}
      <section className="card p-4 space-y-3">
        <SectionTitle>اعداد</SectionTitle>
        <SegmentedControl
          value={digits}
          options={[
            { value: 'fa', label: 'فارسی ۱۲۳' },
            { value: 'en', label: 'انگلیسی 123' },
          ]}
          onChange={(v) => onDigits(v as DigitPref)}
        />
        <div className="space-y-1.5">
          <SampleRow label="مبلغ بلند" value={formatToman(12345678, digits)} />
          <SampleRow label="مبلغ فشرده" value={formatCompact(12_500_000, digits)} />
          <SampleRow label="گروه‌بندی ورودی" value={groupDigits('1234567', digits)} />
          <SampleRow label="پارس ورودی" value={String(parseAmountInput('۱٬۲۳۴٬۵۶۷'))} />
          <SampleRow label="درصد از سال" value={formatPercent(0.345, digits)} />
        </div>
      </section>

      {/* Jalali */}
      <section className="card p-4 space-y-3">
        <SectionTitle>تقویم جلالی</SectionTitle>
        <div className="space-y-1.5">
          <SampleRow label="امروز" value={formatJalaliLong(todayISO, digits)} />
          <SampleRow label="کوتاه" value={formatJalaliShort(todayISO, digits)} />
          <SampleRow label="ماه-سال" value={formatJalaliMonthYear(todayISO, digits)} />
          <SampleRow label="سال" value={String(jalaliYear(todayISO))} />
          <SampleRow label="فصل" value={SEASONS_FA[jalaliSeason(todayISO)]} />
        </div>
        <div className="text-xs text-text-muted">
          ذخیره‌سازی به‌صورت ISO میلادی (<code className="text-[11px]">{todayISO}</code>) — جلالی فقط برای نمایش.
        </div>
      </section>

      {/* Card separation demo */}
      <section className="card p-4 space-y-3">
        <SectionTitle>تفکیک کارت از صفحه</SectionTitle>
        <p className="text-xs text-text-muted">
          در تم روشن: حاشیه‌ی مویی + سایه‌ی دولایه + گوشه‌ی ۲۰px.
          در تم تاریک: حاشیه + هایلایت بالای کارت (سایه بی‌فایده‌ست).
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="card p-3">
            <div className="text-[11px] text-text-muted">کارت ۱</div>
            <div className="nums digits-font text-lg font-bold text-text mt-1">
              {formatCompact(4_500_000, digits)}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[11px] text-text-muted">کارت ۲</div>
            <div className="nums digits-font text-lg font-bold text-text mt-1">
              {formatCompact(12_300_000, digits)}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-[11px] text-text-faint pt-4 pb-2">
        v0.1 · مرحله ۱ تا ۳ آماده است — منتظر فونت رقم‌ها برای ادامه.
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------------- */
/* Small presentational helpers                                              */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-text">{children}</h2>;
}

function Stat({ label, value, digits }: { label: string; value: number; digits: DigitPref }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: 'rgb(var(--surface-2))' }}>
      <div className="nums digits-font text-xl font-bold text-text">
        {digits === 'fa' ? fa(value) : value}
      </div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}

function SampleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="nums digits-font font-medium text-text">{value}</span>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl p-1 flex" style={{ background: 'rgb(var(--surface-2))' }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 text-sm rounded-xl transition-colors ${
              active
                ? 'bg-surface text-text shadow-sm font-medium'
                : 'text-text-muted hover:text-text'
            }`}
            style={active ? { background: 'rgb(var(--surface))' } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function DropIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 4C16 4 7 13.5 7 20a9 9 0 0 0 18 0c0-6.5-9-16-9-16Z"
        fill="currentColor"
        className="text-brand-primary"
        opacity="0.85"
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

function fa(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}
