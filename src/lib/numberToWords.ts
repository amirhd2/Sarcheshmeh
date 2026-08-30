/* =========================================================================
   سرچشمه — number-to-Persian-words
   =========================================================================
   Converts an integer amount to its Persian word form, e.g.:
   - 0           → "صفر"
   - 1           → "یک"
   - 12          → "دوازده"
   - 145         → "صد و چهل و پنج"
   - 1234        → "یک هزار و دویست و سی و چهار"
   - 4500000     → "چهار میلیون و پانصد هزار"
   - 12345678    → "دوازده میلیون و سیصد و چهل و پنج هزار و ششصد و هفتاد و هشت"

   Rules:
   - Triple-grouped (like English): ones, thousands, millions, billions
   - Persian groups: هزار، میلیون، میلیارد، بیلیون (we go up to میلیارد)
   - "و" inserted between groups and between hundreds/tens/ones within a group
   - Returns the empty string for 0 (caller decides what to show)
   - Returns just the number-as-words (without "تومان" suffix — caller adds)

   This is a small, dependency-free implementation suitable for amounts
   up to ~999 میلیارد (999,000,000,000) — way beyond realistic toman amounts.
   ========================================================================= */

const ONES = [
  '', // 0 — special-cased
  'یک',
  'دو',
  'سه',
  'چهار',
  'پنج',
  'شش',
  'هفت',
  'هشت',
  'نه',
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده',
];

const TENS = [
  '', // 0
  '', // 10 — handled by ONES[10..19]
  'بیست',
  'سی',
  'چهل',
  'پنجاه',
  'شصت',
  'هفتاد',
  'هشتاد',
  'نود',
];

const HUNDREDS = [
  '', // 0
  'صد',
  'دویست',
  'سیصد',
  'چهارصد',
  'پانصد',
  'ششصد',
  'هفتصد',
  'هشتصد',
  'نهصد',
];

const GROUP_NAMES = [
  '', // ones group
  'هزار',
  'میلیون',
  'میلیارد',
];

/** Convert a 3-digit number (0..999) to Persian words. */
function tripleToWords(n: number): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(HUNDREDS[h]!);
  if (rest > 0) {
    if (rest < 20) {
      parts.push(ONES[rest]!);
    } else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      parts.push(TENS[t]!);
      if (o > 0) parts.push(ONES[o]!);
    }
  }
  return parts.join(' و ');
}

/**
 * Convert an integer to Persian words.
 * Returns '' for 0 (caller decides what to show).
 * Returns the number as words for 1..999,999,999,999.
 */
export function numberToPersianWords(n: number): string {
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(Math.trunc(n));
  if (abs === 0) return 'صفر';

  // Split into groups of 3 from the right
  const groups: number[] = [];
  let remaining = abs;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  // groups[0] = ones, groups[1] = thousands, groups[2] = millions, etc.

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]!;
    if (g === 0) continue;
    const words = tripleToWords(g);
    const groupName = GROUP_NAMES[i] ?? '';
    if (groupName) {
      parts.push(`${words} ${groupName}`);
    } else {
      parts.push(words);
    }
  }

  return parts.join(' و ');
}

/**
 * Format an amount as "X تومان" where X is the Persian words form.
 * Example: 4_500_000 → "چهار میلیون و پانصد هزار تومان"
 */
export function formatTomanWords(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '';
  return `${numberToPersianWords(amount)} تومان`;
}
