'use client';

/* =========================================================================
   سرچشمه — ColorPicker
   =========================================================================
   A palette of calm, muted colors + a custom color input.
   Used in the catalog (category/destination) add/edit form.
   ========================================================================= */

import { motion } from 'framer-motion';

const PRESET_COLORS = [
  '#C9718F', // rose pink (gift card)
  '#D9963E', // amber (overtime)
  '#8E7CC3', // soft purple (special bonus)
  '#C96F5E', // coral (eidi)
  '#5E9EA0', // turquoise (imam birthday)
  '#6B8CC3', // soft blue (mabas)
  '#5B7DA8', // muted navy (bank melli)
  '#4E9678', // green (cash mehr)
  '#C98A4E', // earthy orange (mehr card)
  '#7BA87B', // sage green
  '#B07CC6', // mauve
  '#5FA88F', // brand primary
  '#E07B5A', // terracotta
  '#6C8B9B', // slate blue
  '#A88B4E', // mustard
  '#8B6B9B', // wisteria
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      {/* Preset colors grid */}
      <div className="grid grid-cols-8 gap-2">
        {PRESET_COLORS.map((color) => {
          const active = value.toLowerCase() === color.toLowerCase();
          return (
            <motion.button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              whileTap={{ scale: 0.85 }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: color,
                border: active ? '2px solid rgb(var(--text))' : '2px solid transparent',
                transform: active ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {active && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7L5 11L13 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-text-muted">رنگ سفارشی:</label>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-xl cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
        <span className="text-xs text-text-faint nums digits-font">{value}</span>
      </div>
    </div>
  );
}
