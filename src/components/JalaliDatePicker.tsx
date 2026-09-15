'use client';

/* =========================================================================
   ثمر — JalaliDatePicker
   =========================================================================
   Three-column wheel picker for selecting a Jalali date:
   Year | Month | Day

   PRD §6 page 2: "دیت‌پیکر: wheel سه‌ستونه (سال/ماه/روز) شمسی با scroll-snap،
                    پیش‌فرض امروز"

   Features:
   - Default to "today" when first opened
   - Year range: 5 years back to 2 years forward (1402..current+2)
   - Month: 1..12 with Persian names
   - Day: 1..31 (clamped to actual month length — Jalali months are
     31 days for months 1-6, 30 days for months 7-11, and 29/30 for
     Esfand depending on leap year)
   - When month changes and current day exceeds new month's length,
     day is clamped down automatically
   ========================================================================= */

import { useMemo } from 'react';
import { WheelPicker, type WheelColumnItem } from '@/components/WheelPicker';
import {
  JALALI_MONTHS_FA,
  todayJalaliParts,
  jalaliToISO,
  gregorianToJalaliParts,
  toPersianDigits,
  toEnglishDigits,
  type DigitPref,
  type JalaliParts,
} from '@lib/jalali';
import dayjs from 'dayjs';
import jalaliday from 'jalali-plugin-dayjs';

dayjs.extend(jalaliday);

interface JalaliDatePickerProps {
  /** ISO date string (YYYY-MM-DD). */
  value: string;
  onChange: (iso: string) => void;
  digits: DigitPref;
}

/** Number of days in a Jalali month. Months 1-6 = 31, 7-11 = 30, 12 = 29/30. */
function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand (month 12) — 30 in leap years, 29 otherwise
  const padded = `${jy}-12-01`;
  return dayjs(padded, { jalali: true }).calendar('jalali').endOf('month').date();
}

export function JalaliDatePicker({ value, onChange, digits }: JalaliDatePickerProps) {
  // Convert ISO → Jalali parts
  const parts: JalaliParts = useMemo(() => gregorianToJalaliParts(value), [value]);

  // Today for default + year range bounds
  // PRD user feedback #2: years should not be limited. We use a wide
  // range (1380..1450) so the picker works for long-term use without
  // being truly infinite (which would hurt scroll performance).
  // 1380 is well before any realistic transaction date; 1450 is ~50
  // years in the future — more than enough for any planning use case.
  // If needed, we can extend this range later without a migration.
  const today = useMemo(() => todayJalaliParts(), []);
  const minYear = 1380;
  const maxYear = Math.max(today.jy + 50, 1450);

  // Year items
  const yearItems = useMemo<WheelColumnItem<number>[]>(() => {
    const out: WheelColumnItem<number>[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      out.push({
        value: y,
        label: digits === 'fa' ? toPersianDigits(y) : String(y),
      });
    }
    return out;
  }, [minYear, maxYear, digits]);

  // Month items — always 1..12
  const monthItems = useMemo<WheelColumnItem<number>[]>(() => {
    return JALALI_MONTHS_FA.map((name, i) => ({
      value: i + 1,
      label: name,
    }));
  }, []);

  // Day items — depends on year + month (for Esfand leap year)
  const maxDay = daysInJalaliMonth(parts.jy, parts.jm);
  const dayItems = useMemo<WheelColumnItem<number>[]>(() => {
    const out: WheelColumnItem<number>[] = [];
    for (let d = 1; d <= maxDay; d++) {
      out.push({
        value: d,
        label: digits === 'fa' ? toPersianDigits(d) : String(d),
      });
    }
    return out;
  }, [maxDay, digits]);

  const handleYearChange = (y: number) => {
    // If day exceeds new month's length, clamp
    const maxD = daysInJalaliMonth(y, parts.jm);
    const day = Math.min(parts.jd, maxD);
    onChange(jalaliToISO(y, parts.jm, day));
  };

  const handleMonthChange = (m: number) => {
    const maxD = daysInJalaliMonth(parts.jy, m);
    const day = Math.min(parts.jd, maxD);
    onChange(jalaliToISO(parts.jy, m, day));
  };

  const handleDayChange = (d: number) => {
    onChange(jalaliToISO(parts.jy, parts.jm, d));
  };

  return (
    <div className="flex flex-row items-stretch justify-center gap-1 px-2">
      {/* All three columns get flex-1 so they have EQUAL width on every
          screen size (mobile, tablet, desktop). Previously month was
          flex-[1.5] which made it wider than year/day — looked uneven
          on tablets. PRD user feedback (this iteration). */}
      <WheelPicker
        items={yearItems}
        selectedValue={parts.jy}
        onChange={handleYearChange}
        label="سال"
        className="flex-1"
      />
      <WheelPicker
        items={monthItems}
        selectedValue={parts.jm}
        onChange={handleMonthChange}
        label="ماه"
        className="flex-1"
      />
      <WheelPicker
        items={dayItems}
        selectedValue={parts.jd}
        onChange={handleDayChange}
        label="روز"
        className="flex-1"
      />
    </div>
  );
}
