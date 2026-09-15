'use client';

/* =========================================================================
   سرچشمه — BottomSheet
   =========================================================================
   A reusable bottom sheet for mobile-style interactions.
   PRD §6 page 2 (Transaction Form):
   "مودال ۲ مرحله‌ای، bottom sheet موبایل / مودال مرکزی دسکتاپ"

   Features (PRD §7 motion rules):
   - Opens with spring animation (slides up from bottom)
   - Closes with smooth slide-down
   - Backdrop fades in/out with blur
   - Drag-to-dismiss: drag sheet DOWN past threshold → close
   - Sheet CANNOT be dragged UP (no detachment from bottom of screen)
   - Rubber-band effect when dragging downward
   - Safe-area-aware: respects bottom inset
   - Scroll lock on body when open
   - Respects prefers-reduced-motion

   Usage:
   <BottomSheet open={isOpen} onClose={() => setOpen(false)}>
     <content />
   </BottomSheet>
   ========================================================================= */

import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Sheet title shown in the header. Optional. */
  title?: string;
  /** Show a close (×) button in the header. Default true. */
  showCloseButton?: boolean;
  /** Disable drag-to-dismiss (e.g. when form is dirty). Default false. */
  disableDrag?: boolean;
  /** Max height as percentage of viewport. Default 90. */
  maxHeightPct?: number;
}

const DRAG_DISMISS_THRESHOLD = 120; // px — sheet closes if dragged past this
const DRAG_DISMISS_VELOCITY = 500; // px/s — close if flicked down fast enough

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  showCloseButton = true,
  disableDrag = false,
  maxHeightPct = 90,
}: BottomSheetProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // If dragged down past threshold (or with enough velocity), close
    if (info.offset.y > DRAG_DISMISS_THRESHOLD || info.velocity.y > DRAG_DISMISS_VELOCITY) {
      onClose();
    }
  };

  const sheetElement = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — fades in with blur, covers whole viewport */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              touchAction: 'none',
            }}
            onClick={onClose}
            onTouchMove={(e) => {
              // Prevent background scroll passing through backdrop
              e.stopPropagation();
            }}
          />

          {/* Sheet — slides up with spring, pinned strictly to bottom of viewport */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 350,
              mass: 0.8,
            }}
            drag={disableDrag ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex flex-col w-full max-w-[480px]"
            style={{
              maxHeight: `${maxHeightPct}vh`,
              background: 'rgb(var(--surface))',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              boxShadow: '0 -8px 32px -8px rgba(0, 0, 0, 0.25)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'rgb(var(--text) / 0.15)' }}
              />
            </div>

            {/* Header (optional) */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 py-3 shrink-0">
                <h2 className="text-base font-bold text-text">{title}</h2>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="بستن"
                    className="w-8 h-8 rounded-full flex items-center justify-center pressable"
                    style={{
                      background: 'rgb(var(--surface-2))',
                      color: 'rgb(var(--text-muted))',
                    }}
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            )}

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!isMounted) return null;

  return createPortal(sheetElement, document.body);
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M1 1L13 13M1 13L13 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
