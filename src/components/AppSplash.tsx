'use client';

/* =========================================================================
   ثمر — AppSplash
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
import Image from 'next/image';
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
            {/* App icon */}
            <div className="flex items-center justify-center mb-5">
              <Image
                src="/icons/icon.webp"
                alt="ثمر"
                width={88}
                height={88}
                className="w-20 h-20 md:w-24 md:h-24 object-contain select-none"
                priority
                referrerPolicy="no-referrer"
              />
            </div>

            {/* App name */}
            <h1 className="text-xl font-bold text-text mb-1">
              ثمر
            </h1>

            {/* Tagline */}
            <p className="text-xs text-text-muted">
              ثمره‌ی تلاشت رو ببین
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
