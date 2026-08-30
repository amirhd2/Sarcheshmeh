'use client';

/* =========================================================================
   سرچشمه — WheelPicker
   =========================================================================
   A single-column iOS-style wheel picker. Used 3× side-by-side for the
   Jalali date picker (year/month/day).

   Implementation (revised per user feedback):
   - Native scroll-snap with `scroll-snap-type: y mandatory`
   - Each item is `scroll-snap-align: center`
   - On scroll, we compute the selected index from scrollTop (debounced)
   - Programmatic scroll via scrollTo with smooth behavior
   - **Magnify animation**: selected item is scaled up + full opacity;
     neighbors scale down + fade based on distance (1=0.75, 2=0.5, 3+=0.3)
     — this mimics Apple's wheel picker behavior.
   - **Increased opacity**: previously neighbors were 0.45/0.25/0.15 which
     made the wheel look "disabled". Now 0.85/0.55/0.30 so the wheel
     feels alive and readable.
   - Fade masks at top and bottom are shorter and softer.
   - Selection highlight band uses brand primary at low opacity for a
     subtle "selected row" feel without being too heavy.
   - **overscroll-behavior: contain** prevents scroll chaining to body
     when the user scrolls past the wheel's bounds (PRD user feedback #5).

   PRD §6 page 2: "دیت‌پیکر: wheel سه‌ستونه (سال/ماه/روز) شمسی با scroll-snap،
                    پیش‌فرض امروز"
   ========================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Extra class names. */
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
  // Live center index drives the magnify/fade animation. We use state
  // (not a ref) so re-render happens when it changes. The scroll handler
  // updates this on every scroll event.
  const [liveCenterIndex, setLiveCenterIndex] = useState<number>(0);

  const containerHeight = itemHeight * visibleCount;
  const padTop = (containerHeight - itemHeight) / 2;

  // Find the index of the selected value
  const selectedIndex = items.findIndex((i) => i.value === selectedValue);
  const safeIndex = selectedIndex === -1 ? 0 : selectedIndex;

  // Keep liveCenterIndex in sync with selectedValue when not actively
  // scrolling (e.g. when the parent updates selectedValue programmatically).
  useEffect(() => {
    setLiveCenterIndex(safeIndex);
  }, [safeIndex]);

  // Scroll to the selected index on mount and when selectedValue changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetTop = safeIndex * itemHeight;
    isProgrammaticScroll.current = true;
    el.scrollTo({ top: targetTop, behavior: 'smooth' });
    const t = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
    return () => window.clearTimeout(t);
  }, [safeIndex, itemHeight]);

  // On user scroll, update live center index (for magnify) + debounced commit
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Update live center index — drives magnify animation
    const idx = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    setLiveCenterIndex(clamped);

    if (isProgrammaticScroll.current) return;

    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
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

  /** Compute magnify + opacity for a given item index based on live scroll. */
  const getItemStyle = (idx: number) => {
    const distance = Math.abs(idx - liveCenterIndex);
    if (distance === 0) {
      return { opacity: 1, scale: 1.15, fontWeight: 700, fontSize: 18, color: 'rgb(var(--text))' };
    }
    if (distance === 1) {
      return { opacity: 0.75, scale: 0.95, fontWeight: 500, fontSize: 15, color: 'rgb(var(--text-muted))' };
    }
    if (distance === 2) {
      return { opacity: 0.5, scale: 0.85, fontWeight: 500, fontSize: 15, color: 'rgb(var(--text-muted))' };
    }
    return { opacity: 0.3, scale: 0.75, fontWeight: 500, fontSize: 15, color: 'rgb(var(--text-muted))' };
  };

  return (
    <div
      className={`relative flex-1 ${className}`}
      style={{ height: containerHeight }}
      role="listbox"
      aria-label={label}
    >
      {/* Top fade mask — shorter and softer */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: padTop,
          background:
            'linear-gradient(to bottom, rgb(var(--surface)) 30%, rgb(var(--surface) / 0) 100%)',
        }}
      />
      {/* Bottom fade mask */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: padTop,
          background:
            'linear-gradient(to top, rgb(var(--surface)) 30%, rgb(var(--surface) / 0) 100%)',
        }}
      />

      {/* Selection highlight band — subtle primary tint + border */}
      <div
        className="absolute left-2 right-2 pointer-events-none rounded-xl"
        style={{
          top: padTop,
          height: itemHeight,
          background: 'rgb(var(--brand-primary) / 0.08)',
          border: '1px solid rgb(var(--brand-primary) / 0.15)',
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
          // Prevent scroll chaining — wheel scroll inside the picker
          // should NOT bubble up to the page (PRD user feedback #5).
          overscrollBehavior: 'contain',
        }}
      >
        {/* Top padding (transparent spacers) */}
        <div style={{ height: padTop }} />

        {items.map((item, idx) => {
          const style = getItemStyle(idx);
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
                animate={{ opacity: style.opacity, scale: style.scale }}
                transition={{ duration: 0.08 }}
                className="nums digits-font"
                style={{
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  color: style.color,
                }}
              >
                {item.label}
              </motion.span>
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: padTop }} />
      </div>
    </div>
  );
}
