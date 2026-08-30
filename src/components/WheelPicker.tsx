'use client';

/* =========================================================================
   سرچشمه — WheelPicker
   =========================================================================
   A single-column iOS-style wheel picker. Used 3× side-by-side for the
   Jalali date picker (year/month/day).

   Performance notes (revised per user feedback):
   - Previously we called setState on every scroll event, causing React
     to re-render on every frame — this made scrolling feel "janky" and
     sometimes skip the magnify animation.
   - Now we use a single requestAnimationFrame-batched state update per
     frame, which lets the browser batch scroll events efficiently.
   - transition duration on motion.span reduced from 0.08s to 0.05s so
     the magnify "snaps" instead of lagging behind the scroll.
   - We also avoid React state entirely for the live center index when
     the scroll is in-flight — instead, we apply transforms directly
     via CSS variables on the scroll container's children. This is the
     approach Apple-style wheel pickers use for buttery scrolling.

   Implementation:
   - Native scroll-snap with `scroll-snap-type: y mandatory`
   - 5 visible items per column (2 above + selected + 2 below)
   - Magnify: selected item scale 1.15, neighbors scale down by distance
   - overscrollBehavior: contain prevents scroll chaining to body
   ========================================================================= */

import { useCallback, useEffect, useRef } from 'react';

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
const SCROLL_DEBOUNCE_MS = 100;

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
  const rafId = useRef<number | null>(null);
  // We DON'T use React state for the live center index — that causes
  // re-renders on every scroll frame and breaks the smooth feel.
  // Instead, we directly update DOM transforms in handleScroll.

  const containerHeight = itemHeight * visibleCount;
  const padTop = (containerHeight - itemHeight) / 2;

  // Find the index of the selected value
  const selectedIndex = items.findIndex((i) => i.value === selectedValue);
  const safeIndex = selectedIndex === -1 ? 0 : selectedIndex;

  // Apply magnify/opacity directly to DOM nodes — bypasses React
  // entirely for the live scroll updates. This is the key to smooth
  // scrolling: zero React re-renders during scroll.
  const applyMagnify = useCallback(
    (centerIdx: number) => {
      const container = scrollRef.current;
      if (!container) return;
      // Select all item spans (skip the padding divs)
      const itemSpans = container.querySelectorAll<HTMLElement>('[data-item-idx]');
      itemSpans.forEach((span) => {
        const idx = Number(span.dataset.itemIdx);
        const distance = Math.abs(idx - centerIdx);
        let opacity: number;
        let scale: number;
        let fontSize: number;
        let fontWeight: number;
        let color: string;
        if (distance === 0) {
          opacity = 1;
          scale = 1.15;
          fontSize = 18;
          fontWeight = 700;
          color = 'rgb(var(--text))';
        } else if (distance === 1) {
          opacity = 0.85;
          scale = 0.95;
          fontSize = 15;
          fontWeight = 500;
          color = 'rgb(var(--text))';
        } else if (distance === 2) {
          opacity = 0.65;
          scale = 0.85;
          fontSize = 15;
          fontWeight = 500;
          color = 'rgb(var(--text-muted))';
        } else {
          opacity = 0.4;
          scale = 0.75;
          fontSize = 15;
          fontWeight = 500;
          color = 'rgb(var(--text-muted))';
        }
        // Direct DOM mutation — no React re-render
        span.style.opacity = String(opacity);
        span.style.transform = `scale(${scale})`;
        span.style.fontSize = `${fontSize}px`;
        span.style.fontWeight = String(fontWeight);
        span.style.color = color;
      });
    },
    [],
  );

  // Initial magnify on mount + when selectedValue changes externally
  useEffect(() => {
    applyMagnify(safeIndex);
  }, [safeIndex, applyMagnify]);

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

  // On user scroll:
  // 1. Schedule a rAF-batched magnify update (smooth, no React re-render)
  // 2. Debounce the onChange commit (so we don't spam the parent)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // rAF-batched magnify update — at most one per frame
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }
    rafId.current = requestAnimationFrame(() => {
      const idx = Math.round(el.scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      applyMagnify(clamped);
      rafId.current = null;
    });

    // Debounced onChange commit
    if (isProgrammaticScroll.current) return;
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
  }, [items, itemHeight, selectedValue, onChange, applyMagnify]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
      }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
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
      {/* Top fade mask — very soft so all 5 items remain readable */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: padTop * 0.5,
          background:
            'linear-gradient(to bottom, rgb(var(--surface)) 0%, rgb(var(--surface) / 0) 100%)',
        }}
      />
      {/* Bottom fade mask */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: padTop * 0.5,
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
          overscrollBehavior: 'contain',
        }}
      >
        {/* Top padding */}
        <div style={{ height: padTop }} />

        {items.map((item, idx) => {
          // Initial style — will be overridden by applyMagnify on mount
          // and on every scroll frame.
          const distance = Math.abs(idx - safeIndex);
          const initialOpacity = distance === 0 ? 1 : distance === 1 ? 0.85 : distance === 2 ? 0.65 : 0.4;
          const initialScale = distance === 0 ? 1.15 : distance === 1 ? 0.95 : distance === 2 ? 0.85 : 0.75;
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
              <span
                data-item-idx={idx}
                className="nums digits-font"
                style={{
                  fontSize: distance === 0 ? 18 : 15,
                  fontWeight: distance === 0 ? 700 : 500,
                  color: distance === 0 ? 'rgb(var(--text))' : 'rgb(var(--text-muted))',
                  opacity: initialOpacity,
                  transform: `scale(${initialScale})`,
                  transition: 'opacity 0.05s, transform 0.05s',
                  willChange: 'opacity, transform',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: padTop }} />
      </div>
    </div>
  );
}
