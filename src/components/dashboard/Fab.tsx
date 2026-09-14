'use client';

/* =========================================================================
   سرچشمه — FAB (Floating Action Button)
   =========================================================================
   PRD §6 page 1 (Dashboard):
   "FAB گرد پایین صفحه — چون RTL داریم پایین-چپ می‌شینه (آینه‌ی iOS)
    و با چرخش + به × باز می‌شه."

   For Phase 1 step 4, we only render the FAB visually — clicking it
   triggers an onAdd callback that the parent can wire up. The actual
   transaction form (Phase 1 step 5) will be a bottom sheet that the
   FAB opens.

   Visual recipe:
   - Circular, 56px diameter
   - Filled with brand primary color
   - White plus icon (rotates 45° to × when "open")
   - Soft shadow for elevation
   - Safe-area-aware bottom-left positioning
   - pressable: scale 0.92 on tap
   ========================================================================= */

import { Plus } from 'lucide-react';

interface FabProps {
  /** Called when the FAB is tapped. */
  onAdd?: () => void;
  /** When true, the + rotates 45° to become an ×. */
  isOpen?: boolean;
  /** Accessible label. */
  label?: string;
}

export function Fab({ onAdd, isOpen = false, label = 'افزودن تراکنش' }: FabProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={label}
      className="fixed z-40 flex items-center justify-center rounded-full pressable"
      style={{
        // 56px diameter — Apple HIG minimum touch target
        width: 56,
        height: 56,
        // Bottom-left because RTL mirrors iOS's bottom-right.
        // Inset from edges, respecting safe area.
        left: 'calc(20px + env(safe-area-inset-left, 0px))',
        bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        // Brand primary
        background: 'rgb(var(--brand-primary))',
        color: 'rgb(255 255 255)',
        // Soft shadow for elevation
        boxShadow:
          '0 4px 12px -2px rgb(var(--brand-primary) / 0.40), 0 8px 24px -8px rgb(var(--brand-primary) / 0.30)',
      }}
    >
      <Plus
        size={26}
        strokeWidth={2.5}
        className={`transition-transform duration-300`}
        style={{
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  );
}
