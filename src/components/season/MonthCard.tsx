'use client';

import { motion } from 'framer-motion';
import { CountUp } from '@/components/dashboard/CountUp';
import { formatCompactParts } from '@lib/format';
import { JALALI_MONTHS_FA, faNum, type DigitPref } from '@lib/jalali';

interface MonthCardProps {
  month: number;
  totalAmount: number;
  totalCount: number;
  digits: DigitPref;
  isActive?: boolean;
  onTap?: () => void;
}

export function MonthCard({ month, totalAmount, totalCount, digits, isActive = false, onTap }: MonthCardProps) {
  const monthName = JALALI_MONTHS_FA[month - 1] ?? '';
  return (
    <motion.button type="button" onClick={onTap} whileTap={{ scale: 0.96 }} transition={{ duration: 0.1 }}
      className="card flex-1 p-3 text-center pressable"
      style={{ background: isActive ? 'rgb(var(--brand-primary) / 0.08)' : 'rgb(var(--surface))', borderColor: isActive ? 'rgb(var(--brand-primary) / 0.25)' : undefined }}>
      <div className="text-xs font-medium text-text-muted mb-1">{monthName}</div>
      <CountUp value={totalAmount} duration={600}>
        {(current) => {
          if (current <= 0) {
            return (
              <div className="nums digits-font text-base sm:text-lg font-bold text-text leading-none">
                ۰
              </div>
            );
          }
          const parts = formatCompactParts(current, digits);
          return (
            <div className="nums digits-font text-base sm:text-lg font-bold text-text leading-none whitespace-nowrap">
              <span>{parts.value}</span>
              {parts.unitShort && (
                <>
                  <span className="text-xs font-medium text-text-muted mr-1 sm:hidden">
                    {parts.unitShort}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-text-muted mr-1 hidden sm:inline">
                    {parts.unitLong}
                  </span>
                </>
              )}
            </div>
          );
        }}
      </CountUp>
      <div className="text-[10px] text-text-faint mt-1">{digits === 'fa' ? faNum(totalCount) : totalCount} تراکنش</div>
    </motion.button>
  );
}

