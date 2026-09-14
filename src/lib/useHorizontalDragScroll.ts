'use client';

/* =========================================================================
   سرچشمه — useHorizontalDragScroll
   =========================================================================
   Enables click-and-drag horizontal scrolling on a container.
   Uses React event handlers (not addEventListener) to avoid conflicts
   with framer-motion's drag handlers in BottomSheet.
   ========================================================================= */

import { useRef, useCallback } from 'react';

export function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const state = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const s = state.current;
    s.isDown = true;
    s.hasMoved = false;
    const rect = el.getBoundingClientRect();
    s.startX = e.clientX - rect.left;
    s.scrollLeft = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const s = state.current;
    if (!s.isDown) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const walk = (x - s.startX) * 1.5;
    if (Math.abs(walk) > 3) s.hasMoved = true;
    el.scrollLeft = s.scrollLeft - walk;
  }, []);

  const stopDrag = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const s = state.current;
    if (!s.isDown) return;
    s.isDown = false;
    el.style.cursor = '';
    el.style.userSelect = '';
    if (s.hasMoved) {
      // Prevent click events right after drag
      const stopClick = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
        el.removeEventListener('click', stopClick, true);
      };
      el.addEventListener('click', stopClick, true);
    }
  }, []);

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: stopDrag,
    onMouseLeave: stopDrag,
    style: { cursor: 'grab' },
  };
}
