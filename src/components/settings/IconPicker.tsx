'use client';

/* =========================================================================
   سرچشمه — IconPicker
   =========================================================================
   A searchable grid of Lucide icons. Used in the catalog add/edit form.
   ========================================================================= */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { IconRenderer } from '@/components/IconRenderer';
import { Search } from 'lucide-react';

// Curated list of relevant icons for a finance/income app
const ICON_LIST = [
  'gift', 'clock', 'sparkles', 'party-popper', 'moon-star', 'star',
  'landmark', 'credit-card', 'wallet', 'banknote', 'coins', 'piggy-bank',
  'briefcase', 'building', 'home', 'car', 'plane', 'train',
  'shopping-bag', 'shopping-cart', 'store', 'package', 'box', 'tag',
  'award', 'medal', 'trophy', 'crown', 'gem', 'diamond',
  'heart', 'thumbs-up', 'smile', 'sun', 'cloud', 'umbrella',
  'coffee', 'utensils', 'cake', 'ice-cream', 'apple', 'cherry',
  'book', 'pen-tool', 'paintbrush', 'camera', 'music', 'film',
  'phone', 'mail', 'message-circle', 'bell', 'calendar', 'timer',
  'zap', 'flame', 'snowflake', 'leaf', 'flower', 'trees',
  'anchor', 'compass', 'map-pin', 'globe', 'rocket', 'satellite',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ICON_LIST;
    const q = search.toLowerCase();
    return ICON_LIST.filter((name) => name.includes(q));
  }, [search]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: 'rgb(var(--surface-2))' }}>
        <Search size={16} className="text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی آیکون..."
          className="flex-1 bg-transparent text-sm text-text outline-none"
        />
      </div>

      {/* Icon grid */}
      <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
        {filteredIcons.map((iconName) => {
          const active = value === iconName;
          return (
            <motion.button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              whileTap={{ scale: 0.9 }}
              className="aspect-square rounded-xl flex items-center justify-center"
              style={{
                background: active ? 'rgb(var(--brand-primary) / 0.12)' : 'rgb(var(--surface-2))',
                border: active ? '2px solid rgb(var(--brand-primary))' : '2px solid transparent',
              }}
            >
              <IconRenderer
                name={iconName}
                size={20}
                strokeWidth={2}
                color={active ? 'rgb(var(--brand-primary))' : 'rgb(var(--text-muted))'}
              />
            </motion.button>
          );
        })}
      </div>

      {filteredIcons.length === 0 && (
        <p className="text-center text-xs text-text-faint py-4">آیکونی پیدا نشد</p>
      )}
    </div>
  );
}
