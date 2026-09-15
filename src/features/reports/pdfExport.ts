'use client';

/* =========================================================================
   سرچشمه — PDF Export
   =========================================================================
   Generates a print-friendly PDF report using the browser's print
   functionality. Opens a new window with print-optimized HTML,
   then triggers window.print().

   The report includes:
   - App name + year
   - Monthly breakdown table
   - Category breakdown
   - Destination breakdown
   - Grand total
   ========================================================================= */

import type { Transaction, Category, Destination } from '@/db/schema';
import { jalaliMonth, JALALI_MONTHS_FA, faNum, formatJalaliLong } from '@lib/jalali';
import { formatToman } from '@lib/format';

interface PDFReportData {
  year: number;
  transactions: Transaction[];
  categories: Category[];
  destinations: Destination[];
  digits: 'fa' | 'en';
}

export function generatePDFReport(data: PDFReportData): void {
  const { year, transactions, categories, destinations, digits } = data;

  const monthlyTotals = Array(12).fill(0);
  const monthlyCounts = Array(12).fill(0);
  for (const tx of transactions) {
    const m = jalaliMonth(tx.date) - 1;
    monthlyTotals[m] += tx.amount;
    monthlyCounts[m] += 1;
  }

  const catMap = new Map<string, number>();
  for (const tx of transactions) {
    catMap.set(tx.categoryId, (catMap.get(tx.categoryId) ?? 0) + tx.amount);
  }
  const catData = categories
    .map((c) => ({ name: c.name, value: catMap.get(c.id) ?? 0, color: c.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const dstMap = new Map<string, number>();
  for (const tx of transactions) {
    dstMap.set(tx.destinationId, (dstMap.get(tx.destinationId) ?? 0) + tx.amount);
  }
  const dstData = destinations
    .map((d) => ({ name: d.name, value: dstMap.get(d.id) ?? 0, color: d.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const grandTotal = transactions.reduce((s, t) => s + t.amount, 0);
  const totalCount = transactions.length;
  const num = (n: number) => (digits === 'fa' ? faNum(n) : String(n));
  const today = formatJalaliLong(new Date().toISOString().slice(0, 10), digits);

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش سال ${num(year)}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: 'Vazirmatn', 'Tahoma', sans-serif; color: #1a1d1f; background: white; padding: 20px; font-size: 13px; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3E7C6B; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 22px; color: #3E7C6B; }
  .header .meta { text-align: left; font-size: 11px; color: #6B7280; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 15px; color: #3E7C6B; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f4f2ef; padding: 8px 10px; text-align: right; font-weight: 600; border: 1px solid #e5e7eb; }
  td { padding: 6px 10px; border: 1px solid #e5e7eb; }
  .total-row td { font-weight: 700; background: #f4f2ef; border-top: 2px solid #3E7C6B; }
  .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-left: 6px; vertical-align: middle; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>گزارش درآمد سال ${num(year)}</h1>
    <div class="meta">ثمر — دفترچه‌ی درآمد شخصی<br>تاریخ گزارش: ${today}</div>
  </div>
  <div class="section">
    <h2>خلاصه</h2>
    <table>
      <tr>
        <td>تعداد تراکنش‌ها</td><td><strong>${num(totalCount)}</strong></td>
        <td>جمع کل درآمد</td><td><strong>${formatToman(grandTotal, digits)}</strong></td>
      </tr>
    </table>
  </div>
  <div class="section">
    <h2>درآمد ماهانه</h2>
    <table>
      <thead><tr><th>ماه</th><th>تعداد</th><th>مبلغ</th></tr></thead>
      <tbody>
        ${monthlyTotals.map((amount, i) => `<tr><td>${JALALI_MONTHS_FA[i]}</td><td>${num(monthlyCounts[i])}</td><td>${formatToman(amount, digits)}</td></tr>`).join('')}
        <tr class="total-row"><td>جمع کل</td><td>${num(totalCount)}</td><td>${formatToman(grandTotal, digits)}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>تفکیک دسته‌ها</h2>
    <table>
      <thead><tr><th>دسته</th><th>مبلغ</th><th>درصد</th></tr></thead>
      <tbody>
        ${catData.map((c) => `<tr><td><span class="color-dot" style="background:${c.color}"></span>${c.name}</td><td>${formatToman(c.value, digits)}</td><td>${num(Math.round(c.value / grandTotal * 100))}٪</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>تفکیک مقصدها</h2>
    <table>
      <thead><tr><th>مقصد</th><th>مبلغ</th><th>درصد</th></tr></thead>
      <tbody>
        ${dstData.map((d) => `<tr><td><span class="color-dot" style="background:${d.color}"></span>${d.name}</td><td>${formatToman(d.value, digits)}</td><td>${num(Math.round(d.value / grandTotal * 100))}٪</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="footer">این گزارش توسط اپلیکیشن ثمر تولید شده است.</div>
  <script>
    window.onload = function() {
      window.print();
      // Close the print window after print dialog is dismissed.
      // setTimeout ensures the print dialog has time to appear first.
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
