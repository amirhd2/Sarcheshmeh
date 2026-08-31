'use client';

/* =========================================================================
   سرچشمه — useHorizontalDragScroll
   =========================================================================
   Enables click-and-drag horizontal scrolling on a container.
   Works with both mouse and touch. The container must have overflow-x: auto.

   Usage:
   const ref = useHorizontalDragScroll<HTMLDivElement>();
   <div ref={ref} className="overflow-x-auto">...</div>
   ========================================================================= */

import { useEffect, useRef } from 'react';

export function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      hasMoved = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const onMouseLeave = () => {
      isDown = false;
      el.style.cursor = '';
      el.style.userSelect = '';
    };

    const onMouseUp = () => {
      isDown = false;
      el.style.cursor = '';
      el.style.userSelect = '';
      // Prevent click events right after drag
      if (hasMoved) {
        const stopClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          el.removeEventListener('click', stopClick, true);
        };
        el.addEventListener('click', stopClick, true);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5; // scroll speed multiplier
      if (Math.abs(walk) > 3) hasMoved = true;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return ref;
}
