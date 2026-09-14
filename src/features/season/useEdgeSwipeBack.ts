'use client';

/* =========================================================================
   سرچشمه — useEdgeSwipeBack
   =========================================================================
   PRD §7: برگشت به صفحه قبل از لبه‌ی چپ (~۲۴px)، چپ→راست.
   ========================================================================= */

import { useEffect, useRef } from 'react';

interface UseEdgeSwipeBackOptions {
  onBack: () => void;
  edgeWidth?: number;
  threshold?: number;
  velocityThreshold?: number;
  disabled?: boolean;
}

export function useEdgeSwipeBack({
  onBack,
  edgeWidth = 24,
  threshold = 0.3,
  velocityThreshold = 500,
  disabled = false,
}: UseEdgeSwipeBackOptions) {
  const targetRef = useRef<HTMLDivElement>(null);

  const gestureState = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    startTime: 0,
    directionLocked: false,
    isHorizontal: false,
    viewportWidth: 0,
  });

  useEffect(() => {
    if (disabled) return;
    const target = targetRef.current;
    if (!target) return;

    const gs = gestureState.current;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (touch.clientX > edgeWidth) return;
      gs.isActive = true;
      gs.startX = touch.clientX;
      gs.startY = touch.clientY;
      gs.currentX = touch.clientX;
      gs.startTime = Date.now();
      gs.directionLocked = false;
      gs.isHorizontal = false;
      gs.viewportWidth = window.innerWidth;
      target.style.transition = 'none';
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    };

    const onTouchMove = (e: TouchEvent) => {
      const gs = gestureState.current;
      if (!gs.isActive) return;
      const touch = e.touches[0];
      if (!touch) return;
      const x = touch.clientX;
      const y = touch.clientY;
      const deltaX = x - gs.startX;
      const deltaY = y - gs.startY;
      if (!gs.directionLocked) {
        if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
        gs.directionLocked = true;
        gs.isHorizontal = deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY);
      }
      if (!gs.isHorizontal) {
        gs.isActive = false;
        target.style.transition = '';
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        return;
      }
      if (e.cancelable) e.preventDefault();
      gs.currentX = x;
      let translateX = deltaX;
      const maxWidth = gs.viewportWidth;
      if (translateX > maxWidth) {
        translateX = maxWidth + (translateX - maxWidth) * 0.3;
      }
      target.style.transform = `translate3d(${translateX}px, 0, 0)`;
    };

    const onTouchEnd = () => {
      const gs = gestureState.current;
      if (!gs.isActive) return;
      gs.isActive = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      target.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
      const deltaX = gs.currentX - gs.startX;
      const duration = Date.now() - gs.startTime;
      const velocity = (deltaX / duration) * 1000;
      const ratio = deltaX / gs.viewportWidth;
      if (ratio >= threshold || velocity >= velocityThreshold) {
        target.style.transform = `translate3d(${gs.viewportWidth}px, 0, 0)`;
        window.setTimeout(() => { onBack(); }, 300);
      } else {
        target.style.transform = 'translate3d(0, 0, 0)';
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onBack, edgeWidth, threshold, velocityThreshold, disabled]);

  return targetRef;
}
