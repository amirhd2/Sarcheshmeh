'use client';

/* =========================================================================
   ثمر — CatalogForm
   =========================================================================
   Add or edit a category/destination. Fields:
   - Name (text input)
   - Color (ColorPicker)
   - Icon (IconPicker)
   ========================================================================= */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { IconRenderer } from '@/components/IconRenderer';

export interface CatalogFormData {
  name: string;
  icon: string;
  color: string;
}

interface CatalogFormProps {
  initialData?: CatalogFormData;
  type: 'category' | 'destination';
  onSubmit: (data: CatalogFormData) => void;
  onCancel: () => void;
}

const DEFAULT_COLOR = '#5FA88F';
const DEFAULT_ICON = 'sparkles';

export function CatalogForm({ initialData, type, onSubmit, onCancel }: CatalogFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [icon, setIcon] = useState(initialData?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState(initialData?.color ?? DEFAULT_COLOR);

  const canSubmit = name.trim().length > 0;

  const typeLabel = type === 'category' ? 'دسته' : 'مقصد';

  return (
    <div className="px-5 py-3 space-y-5">
      {/* Preview — live preview of how the item will look */}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: `${color}15` }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${color}25` }}
          >
            <IconRenderer name={icon} size={20} strokeWidth={2.5} color={color} />
          </div>
          <span className="text-sm font-medium text-text">
            {name.trim() || `${typeLabel} جدید`}
          </span>
        </div>
      </div>

      {/* Name input */}
      <div>
        <label className="text-sm font-medium text-text block mb-2">نام {typeLabel}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`مثلاً: ${type === 'category' ? 'حق‌الزحمه' : 'حساب پس‌انداز'}`}
          maxLength={30}
          autoFocus
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
          style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit({ name: name.trim(), icon, color }); }}
        />
      </div>

      {/* Color picker */}
      <div>
        <label className="text-sm font-medium text-text block mb-2">رنگ</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {/* Icon picker */}
      <div>
        <label className="text-sm font-medium text-text block mb-2">آیکون</label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl text-sm font-medium pressable"
          style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text-muted))' }}
        >
          انصراف
        </button>
        <motion.button
          type="button"
          onClick={() => canSubmit && onSubmit({ name: name.trim(), icon, color })}
          disabled={!canSubmit}
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
          style={{
            background: canSubmit ? 'rgb(var(--brand-primary))' : 'rgb(var(--surface-2))',
            color: canSubmit ? 'white' : 'rgb(var(--text-faint))',
          }}
        >
          <Check size={16} strokeWidth={2.5} />
          تأیید
        </motion.button>
      </div>
    </div>
  );
}
