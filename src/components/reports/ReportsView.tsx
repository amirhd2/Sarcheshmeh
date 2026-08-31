'use client';

/* =========================================================================
   سرچشمه — ReportsView
   =========================================================================
   PRD §6 page 4 (Reports):
   - Bar chart: 12 months income
   - Donut: categories share
   - Donut: destinations share
   - Year comparison: grouped bars + growth %
   ========================================================================= */

import { useState, useMemo, useRef } from 'react';
import { ChevronRight, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { jalaliYearRange, jalaliMonth, JALALI_MONTHS_FA } from '@lib/jalali';
import { useAppSettings } from '@/features/dashboard/AppSettingsContext';
import { useEdgeSwipeBack } from '@/features/season/useEdgeSwipeBack';
import { formatCompact, formatToman } from '@lib/format';

interface ReportsViewProps {
  year: number;
  onBack: () => void;
}

export function ReportsView({ year, onBack }: ReportsViewProps) {
  const { digits } = useAppSettings();
  const [isExiting, setIsExiting] = useState(false);
  const [compareYear, setCompareYear] = useState(year - 1);
  const exitTimeoutRef = useRef<number | null>(null);

  const handleBack = () => {
    if (isExiting) return;
    setIsExiting(true);
    exitTimeoutRef.current = window.setTimeout(() => onBack(), 300);
  };

  const swipeBackRef = useEdgeSwipeBack({ onBack: handleBack, disabled: isExiting });

  const data = useLiveQuery(async () => {
    const { start, end } = jalaliYearRange(year);
    const txs = await db.transactions
      .where('date')
      .between(start, end, true, true)
      .filter((t) => !t.deletedAt)
      .toArray();
    const cats = await db.categories.filter((c) => !c.deletedAt).toArray();
    const dsts = await db.destinations.filter((d) => !d.deletedAt).toArray();
    return { txs, cats, dsts };
  }, [year]);

  const compareData = useLiveQuery(async () => {
    const { start, end } = jalaliYearRange(compareYear);
    const txs = await db.transactions
      .where('date')
      .between(start, end, true, true)
      .filter((t) => !t.deletedAt)
      .toArray();
    return txs;
  }, [compareYear]);

  const monthlyData = useMemo(() => {
    if (!data) return [];
    const months = Array(12).fill(0);
    for (const tx of data.txs) {
      months[jalaliMonth(tx.date) - 1] += tx.amount;
    }
    return months.map((amount, i) => ({
      month: JALALI_MONTHS_FA[i]?.slice(0, 3) ?? '',
      amount,
    }));
  }, [data]);

  const categoryData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const tx of data.txs) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    return data.cats
      .map((cat) => ({ name: cat.name, value: map.get(cat.id) ?? 0, color: cat.color }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const destinationData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const tx of data.txs) map.set(tx.destinationId, (map.get(tx.destinationId) ?? 0) + tx.amount);
    return data.dsts
      .map((dst) => ({ name: dst.name, value: map.get(dst.id) ?? 0, color: dst.color }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const comparisonData = useMemo(() => {
    if (!data || !compareData) return [];
    const cur = Array(12).fill(0);
    const cmp = Array(12).fill(0);
    for (const tx of data.txs) cur[jalaliMonth(tx.date) - 1] += tx.amount;
    for (const tx of compareData) cmp[jalaliMonth(tx.date) - 1] += tx.amount;
    return JALALI_MONTHS_FA.map((name, i) => ({
      month: name.slice(0, 3),
      [year]: cur[i],
      [compareYear]: cmp[i],
    }));
  }, [data, compareData, year, compareYear]);

  const yearTotal = monthlyData.reduce((s, d) => s + d.amount, 0);
  const compareTotal = compareData?.reduce((s, t) => s + t.amount, 0) ?? 0;
  const growthPercent = compareTotal > 0 ? ((yearTotal - compareTotal) / compareTotal) * 100 : 0;
  const isLoading = !data;

  const tooltipStyle = {
    background: 'rgb(var(--surface))',
    border: '1px solid rgb(var(--text) / 0.08)',
    borderRadius: '12px',
    fontSize: '12px',
  };

  return (
    <div
      ref={swipeBackRef}
      className={`season-view-enter fixed inset-0 z-40 overflow-y-auto no-scrollbar${isExiting ? ' is-exiting' : ''}`}
      style={{
        background: 'rgb(var(--bg))',
        transform: isExiting ? 'translate3d(100%, 0, 0)' : undefined,
        transition: isExiting ? 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)' : undefined,
        willChange: 'transform',
      }}
    >
      <style>{`
        @keyframes season-view-enter { from { transform: translate3d(100%, 0, 0); } to { transform: translate3d(0, 0, 0); } }
        .season-view-enter { animation: season-view-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .season-view-enter.is-exiting { animation: none; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-30 w-full" style={{ background: 'rgb(var(--bg))' }}>
        <header className="px-4 py-3 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleBack} aria-label="بازگشت"
              className="w-9 h-9 rounded-full flex items-center justify-center pressable shrink-0"
              style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}>
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-text">گزارش‌ها</h1>
              <p className="text-xs text-text-muted">سال <span className="nums digits-font">{digits === 'fa' ? faNum(year) : year}</span></p>
            </div>
          </div>
        </header>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
              style={{ borderTopColor: 'rgb(var(--brand-primary))', borderRightColor: 'rgb(var(--brand-primary))' }} />
          </div>
        ) : data.txs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 size={48} className="text-text-faint mb-3" />
            <p className="text-sm text-text-muted">هنوز تراکنشی برای سال {digits === 'fa' ? faNum(year) : year} ثبت نشده</p>
          </div>
        ) : (
          <>
            {/* Monthly bar chart */}
            <ChartCard title="درآمد ماهانه">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatCompact(v, digits)} tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v: number) => [formatToman(v, digits), 'درآمد']} contentStyle={tooltipStyle} />
                  <Bar dataKey="amount" fill="rgb(var(--brand-primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Category donut */}
            {categoryData.length > 0 && (
              <ChartCard title="سهم دسته‌ها">
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatToman(v, digits)} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 pr-2">
                    {categoryData.slice(0, 5).map((cat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                        <span className="text-xs text-text flex-1 truncate">{cat.name}</span>
                        <span className="text-xs text-text-muted nums digits-font">
                          {digits === 'fa' ? faNum(Math.round(cat.value / yearTotal * 100)) : Math.round(cat.value / yearTotal * 100)}٪
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}

            {/* Destination donut */}
            {destinationData.length > 0 && (
              <ChartCard title="سهم مقصدها">
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={destinationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {destinationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatToman(v, digits)} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 pr-2">
                    {destinationData.map((dst, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: dst.color }} />
                        <span className="text-xs text-text flex-1 truncate">{dst.name}</span>
                        <span className="text-xs text-text-muted nums digits-font">
                          {digits === 'fa' ? faNum(Math.round(dst.value / yearTotal * 100)) : Math.round(dst.value / yearTotal * 100)}٪
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}

            {/* Year comparison */}
            <ChartCard title={`مقایسه ${digits === 'fa' ? faNum(year) : year} با ${digits === 'fa' ? faNum(compareYear) : compareYear}`}>
              <div className="flex gap-2 mb-3">
                <select value={compareYear} onChange={(e) => setCompareYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}>
                  {[year - 1, year - 2, year - 3].map((y) => (
                    <option key={y} value={y}>{digits === 'fa' ? faNum(y) : y}</option>
                  ))}
                </select>
                {compareTotal > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{
                      background: growthPercent >= 0 ? 'rgb(var(--success) / 0.12)' : 'rgb(var(--danger) / 0.12)',
                      color: growthPercent >= 0 ? 'rgb(var(--success))' : 'rgb(var(--danger))',
                    }}>
                    {growthPercent >= 0 ? '▲' : '▼'} {digits === 'fa' ? faNum(Math.abs(Math.round(growthPercent))) : Math.abs(Math.round(growthPercent))}٪
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatCompact(v, digits)} tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v: number, name: number) => [formatToman(v, digits), String(name)]} contentStyle={tooltipStyle} />
                  <Bar dataKey={compareYear} fill="rgb(var(--text) / 0.2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={year} fill="rgb(var(--brand-primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgb(var(--text) / 0.2)' }} />
                  <span className="text-xs text-text-muted">{digits === 'fa' ? faNum(compareYear) : compareYear}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgb(var(--brand-primary))' }} />
                  <span className="text-xs text-text-muted">{digits === 'fa' ? faNum(year) : year}</span>
                </div>
              </div>
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-bold text-text mb-3">{title}</h2>
      {children}
    </section>
  );
}

function faNum(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}
