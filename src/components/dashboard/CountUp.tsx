'use client';

/* =========================================================================
   سرچشمه — CountUp
   =========================================================================
   Animates a number from 0 (or previous value) to `value` over `duration`
   milliseconds. Uses requestAnimationFrame with an easeOutExpo curve so
   the count feels punchy at the start and decelerates naturally.

   Respects prefers-reduced-motion: when set, we jump directly to the
   final value with no animation.

   PRD §7: count-up ~0.8s.
   ========================================================================= */

import { useEffect, useReducer, useRef } from 'react';

interface CountUpProps {
  value: number;
  /** Animation duration in ms. Default 800 (PRD §7). */
  duration?: number;
  /** Render function — receives the current animated number. */
  children: (current: number) => React.ReactNode;
  /** Decimal places (always 0 for toman amounts, but kept for flexibility). */
  decimals?: number;
}

// Using a reducer + dispatch from inside the RAF tick avoids calling
// setState directly within an effect (Next.js 16 / React 19 lint rule).
type State = { display: number };
type Action = { type: 'tick'; value: number };
function reducer(_state: State, action: Action): State {
  return { display: action.value };
}

export function CountUp({ value, duration = 800, children, decimals = 0 }: CountUpProps) {
  const [state, dispatch] = useReducer(reducer, { display: 0 });
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    // Respect reduced motion — jump straight to value.
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      dispatch({ type: 'tick', value });
      return;
    }

    fromRef.current = state.display;
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      // easeOutExpo: 1 - 2^(-10 * t), with safe fallback at t=1
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = fromRef.current + (value - fromRef.current) * eased;
      const rounded = Number(current.toFixed(decimals));
      dispatch({ type: 'tick', value: rounded });
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, decimals]);

  return <>{children(state.display)}</>;
}
