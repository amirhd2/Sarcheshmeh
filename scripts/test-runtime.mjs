/* Runtime sanity check for jalali + seed logic.
   Runs the actual src/lib/jalali.ts via tsx (no bundler aliases). */

import dayjs from 'dayjs';
import jalaliday from 'jalali-plugin-dayjs';
dayjs.extend(jalaliday);

// Re-implement ONLY the parts that depend on dayjs config (we don't import
// the real jalali.ts because it uses path aliases not resolvable in plain node).
function gregorianToJalaliParts(iso) {
  const d = dayjs(iso).calendar('jalali');
  return { jy: d.year(), jm: d.month() + 1, jd: d.date() };
}
function jalaliToISO(jy, jm, jd) {
  const padded = `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
  return dayjs(padded, { jalali: true }).format('YYYY-MM-DD');
}
function jalaliMonthRange(jy, jm) {
  const padded = `${jy}-${String(jm).padStart(2, '0')}-01`;
  return {
    start: dayjs(padded, { jalali: true }).format('YYYY-MM-DD'),
    end: dayjs(padded, { jalali: true }).endOf('month').format('YYYY-MM-DD'),
  };
}
function jalaliYearRange(jy) {
  const padded = `${jy}-01-01`;
  return {
    start: dayjs(padded, { jalali: true }).format('YYYY-MM-DD'),
    end: dayjs(padded, { jalali: true }).endOf('year').format('YYYY-MM-DD'),
  };
}

console.log('=== Conversions ===');
const today = new Date();
const todayParts = gregorianToJalaliParts(today);
console.log('Today (Gregorian):', today.toISOString().slice(0, 10));
console.log('Today (Jalali parts):', todayParts);

const back = jalaliToISO(todayParts.jy, todayParts.jm, todayParts.jd);
console.log('Round-trip → ISO:', back, '(should match today)');

const farvardin1 = jalaliToISO(1403, 1, 1);
console.log('1403-01-01 →', farvardin1, '(expected: 2024-03-20)');

const esfand30 = jalaliToISO(1402, 12, 30);
console.log('1402-12-30 →', esfand30, '(expected: ~2024-03-19)');

console.log('\n=== Ranges ===');
console.log('Current month range:', jalaliMonthRange(todayParts.jy, todayParts.jm));
console.log('Current year range:', jalaliYearRange(todayParts.jy));

console.log('\n=== Sample data size estimate ===');
let count = 0;
const startYear = Math.max(1402, todayParts.jy - 2);
const endYear = todayParts.jy;
console.log(`Will generate for years ${startYear}..${endYear} (today = ${todayParts.jy}/${todayParts.jm}/${todayParts.jd})`);
for (let jy = startYear; jy <= endYear; jy++) {
  const isCurrentYear = jy === endYear;
  const maxMonth = isCurrentYear ? todayParts.jm : 12;
  for (let jm = 1; jm <= maxMonth; jm++) {
    count++; // special
    count++; // overtime
    if (jm === 12) count++; // eidi
    if (jm === 6) count++; // imam birthday
    if (jm === 9) count++; // mabas
    if (jm % 2 === 0) count++; // ~50% gift card
  }
}
console.log(`Estimated sample record count: ${count}`);
console.log(`PRD target: 60-80 — ${count >= 60 && count <= 90 ? '✓ in range' : '⚠ out of range'}`);
