'use client';

/* =========================================================================
   سرچشمه — AppSplash
   =========================================================================
   An in-app splash screen that shows on first load for a minimum
   duration (~1.5s). The native iOS/Android splash (apple-touch-startup-image)
   disappears as soon as JS hydrates — which can be < 300ms on fast
   connections, making it barely visible. This component bridges that gap
   by keeping the splash visible until the minimum duration has passed
   AND the app is ready.

   The splash has a subtle fade-out animation so it feels smooth.
   ========================================================================= */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const MIN_SPLASH_DURATION_MS = 1200;
const MAX_SPLASH_TIMEOUT_MS = 2500;

export function AppSplash({ ready }: { ready: boolean }) {
  const [minDurationPassed, setMinDurationPassed] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinDurationPassed(true);
    }, MIN_SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Safety fallback: dismiss splash after MAX_SPLASH_TIMEOUT_MS unconditionally
  useEffect(() => {
    const maxTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, MAX_SPLASH_TIMEOUT_MS);
    return () => window.clearTimeout(maxTimer);
  }, []);

  // Hide splash when both conditions are met (or when ready is true after min duration)
  useEffect(() => {
    if (minDurationPassed && ready) {
      const timer = window.setTimeout(() => setShowSplash(false), 250);
      return () => window.clearTimeout(timer);
    }
  }, [minDurationPassed, ready]);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none"
          style={{
            background: 'rgb(var(--bg))',
          }}
        >
          {/* Icon with subtle scale-in animation */}
          <motion.div
            initial={{ scale: 0.95, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            {/* Drop icon */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: 'rgb(var(--brand-primary) / 0.10)' }}
            >
              <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4C16 4 7 13.5 7 20a9 9 0 0 0 18 0c0-6.5-9-16-9-16Z"
                  fill="rgb(var(--brand-primary))"
                  opacity="0.9"
                />
                <path
                  d="M12 19a4 4 0 0 0 4 4"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </div>

            {/* App name */}
            <h1 className="text-xl font-bold text-text mb-1">
              سرچشمه
            </h1>

            {/* Tagline */}
            <p className="text-xs text-text-muted">
              سرچشمه‌ی درآمدت رو ببین
            </p>
          </motion.div>

          {/* Loading indicator — subtle dots */}
          <div className="absolute bottom-20 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgb(var(--brand-primary))' }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
