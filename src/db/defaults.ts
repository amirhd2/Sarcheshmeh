/* =========================================================================
   سرچشمه — Default categories & destinations
   =========================================================================
   PRD §4. All editable, draggable. Hard-coded seed runs once on first
   launch (after that, user owns them — including ordering).

   Colors are "calm" per spec — muted, low-saturation, paired with
   lucide icon names so we can render via <Lucide icon=... />.
   ========================================================================= */

import type { Category, Destination } from './schema';

/* -------------------------------------------------------------------------
   Categories — 6 default
   ------------------------------------------------------------------------- */

export const DEFAULT_CATEGORIES: ReadonlyArray<Omit<Category, 'createdAt' | 'updatedAt' | 'deletedAt'>> = [
  {
    id: 'cat-gift-card',
    name: 'کارت هدیه',
    icon: 'gift',           // 🎁
    color: '#C9718F',       // rose pink
    order: 1,
    isDemo: true,
  },
  {
    id: 'cat-overtime',
    name: 'اضافه‌کار',
    icon: 'clock',          // ⏰
    color: '#D9963E',       // amber
    order: 2,
    isDemo: true,
  },
  {
    id: 'cat-special-bonus',
    name: 'فوق‌العاده خاص',
    icon: 'sparkles',       // ✨
    color: '#8E7CC3',       // soft purple
    order: 3,
    isDemo: true,
  },
  {
    id: 'cat-eidi',
    name: 'عیدی',
    icon: 'party-popper',   // 🎊
    color: '#C96F5E',       // coral
    order: 4,
    isDemo: true,
  },
  {
    id: 'cat-imam-birthday',
    name: 'تولد امام',
    icon: 'moon-star',      // 🌙
    color: '#5E9EA0',       // turquoise
    order: 5,
    isDemo: true,
  },
  {
    id: 'cat-mabas',
    name: 'مبعث',
    icon: 'star',           // ⭐
    color: '#6B8CC3',       // soft blue
    order: 6,
    isDemo: true,
  },
];

/* -------------------------------------------------------------------------
   Destinations — 3 default
   Notes:
   - "کارت مهر" and "کارت نقدی مهر" have similar names but are
     deliberately separate destinations per PRD. Their colors and icons
     are maximally distinct to prevent filter confusion.
   ------------------------------------------------------------------------- */

export const DEFAULT_DESTINATIONS: ReadonlyArray<Omit<Destination, 'createdAt' | 'updatedAt' | 'deletedAt'>> = [
  {
    id: 'dst-bank-melli',
    name: 'بانک ملی',
    icon: 'landmark',       // 🏛
    color: '#5B7DA8',       // muted navy
    order: 1,
    isDemo: true,
  },
  {
    id: 'dst-cash-mehr',
    name: 'کارت نقدی مهر',
    icon: 'credit-card',    // 💳
    color: '#4E9678',       // green
    order: 2,
    isDemo: true,
  },
  {
    id: 'dst-mehr-card',
    name: 'کارت مهر',
    icon: 'wallet',         // 👛
    color: '#C98A4E',       // earthy orange
    order: 3,
    isDemo: true,
  },
];

/* -------------------------------------------------------------------------
   IDs exported as constants so the seed generator and tests can refer
   to them symbolically instead of hard-coding strings.
   ------------------------------------------------------------------------- */

export const CATEGORY_IDS = {
  giftCard: 'cat-gift-card',
  overtime: 'cat-overtime',
  specialBonus: 'cat-special-bonus',
  eidi: 'cat-eidi',
  imamBirthday: 'cat-imam-birthday',
  mabas: 'cat-mabas',
} as const;

export const DESTINATION_IDS = {
  bankMelli: 'dst-bank-melli',
  cashMehr: 'dst-cash-mehr',
  mehrCard: 'dst-mehr-card',
} as const;
