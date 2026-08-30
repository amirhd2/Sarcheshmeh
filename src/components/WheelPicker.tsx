'use client';

/* =========================================================================
   سرچشمه — WheelPicker
   =========================================================================
   A single-column iOS-style wheel picker. Used 3× side-by-side for the
   Jalali date picker (year/month/day).

   Implementation:
   - Native scroll-snap with `scroll-snap-type: y mandatory`
   - Each item is `scroll-snap-align: center`
   - On scroll, we compute the selected index from scrollTop
   - Programmatic scroll via scrollTo with smooth behavior
   - Selected item is highlighted (full opacity + primary color);
     neighbors fade out (opacity gradient)

   The wheel has a fixed item height (40px) and shows ~5 items at once
   with fade masks at top and bottom.

   PRD §6 page 2: "دیت‌پیکر: wheel سه‌ستونه (سال/ماه/روز) شمسی با scroll-snap،
                    پیش‌فرض امروز"
   ========================================================================= */

import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface WheelColumnItem<T = string | number> {
  value: T;
  label: string;
}

interface WheelPickerProps<T = string | number> {
  items: ReadonlyArray<WheelColumnItem<T>>;
  selectedValue: T;
  onChange: (value: T) => void;
  /** Item height in px. Default 40. */
  itemHeight?: number;
  /** Number of visible items (should be odd for center alignment). Default 5. */
  visibleCount?: number;
  /** Accessible label for the column. */
  label?: string;
  /** Digit preference — affects whether labels use tabular-nums. */
  className?: string;
}

const DEFAULT_ITEM_HEIGHT = 40;
const DEFAULT_VISIBLE_COUNT = 5;
const SCROLL_DEBOUNCE_MS = 80;

export function WheelPicker<T extends string | number>({
  items,
  selectedValue,
  onChange,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  visibleCount = DEFAULT_VISIBLE_COUNT,
  label,
  className = '',
}: WheelPickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  const containerHeight = itemHeight * visibleCount;
  // Padding so the first item can center
  const padTop = (containerHeight - itemHeight) / 2;

  // Find the index of the selected value
  const selectedIndex = items.findIndex((i) => i.value === selectedValue);
  const safeIndex = selectedIndex === -1 ? 0 : selectedIndex;

  // Scroll to the selected index on mount and when selectedValue changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetTop = safeIndex * itemHeight;
    isProgrammaticScroll.current = true;
    el.scrollTo({ top: targetTop, behavior: 'smooth' });
    // Reset flag after scroll settles
    const t = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
    return () => window.clearTimeout(t);
  }, [safeIndex, itemHeight]);

  // On user scroll, determine which item is centered and call onChange
  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;

    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const currentItem = items[clamped];
      if (currentItem && currentItem.value !== selectedValue) {
        onChange(currentItem.value);
      }
    }, SCROLL_DEBOUNCE_MS);
  }, [items, itemHeight, selectedValue, onChange]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div
      className={`relative flex-1 ${className}`}
      style={{ height: containerHeight }}
      role="listbox"
      aria-label={label}
    >
      {/* Top fade mask */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: padTop,
          background:
            'linear-gradient(to bottom, rgb(var(--surface)) 0%, rgb(var(--surface) / 0) 100%)',
        }}
      />
      {/* Bottom fade mask */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: padTop,
          background:
            'linear-gradient(to top, rgb(var(--surface)) 0%, rgb(var(--surface) / 0) 100%)',
        }}
      />

      {/* Selection highlight band */}
      <div
        className="absolute left-2 right-2 pointer-events-none rounded-xl"
        style={{
          top: padTop,
          height: itemHeight,
          background: 'rgb(var(--surface-2))',
          zIndex: 1,
        }}
      />

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto no-scrollbar"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Top padding (transparent spacers) */}
        <div style={{ height: padTop, scrollSnapAlign: 'none' as never }} />

        {items.map((item, idx) => {
          const distance = Math.abs(idx - safeIndex);
          const isSelected = distance === 0;
          const opacity = isSelected ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.25 : 0.15;
          const scale = isSelected ? 1 : 0.92;
          return (
            <div
              key={String(item.value)}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.span
                animate={{ opacity, scale }}
                transition={{ duration: 0.15 }}
                className={`nums digits-font text-base ${
                  isSelected ? 'font-bold text-text' : 'font-medium text-text-muted'
                }`}
              >
                {item.label}
              </motion.span>
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: padTop, scrollSnapAlign: 'none' as never }} />
      </div>
    </div>
  );
}
