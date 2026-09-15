/* =========================================================================
   ثمر — Dashboard formatting helpers
   =========================================================================
   Small one-off helpers used only by dashboard components.
   ========================================================================= */

import { toPersianDigits, toEnglishDigits, type DigitPref } from '@lib/jalali';

/** Format a jalali year number according to digit preference. */
export function formatJalaliYearDigit(year: number, digits: DigitPref): string {
  return digits === 'fa' ? toPersianDigits(year) : toEnglishDigits(year);
}
