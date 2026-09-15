'use client';

/* =========================================================================
   ثمر — Icon renderer
   =========================================================================
   Renders a Lucide icon by name using an explicit, tree-shaking safe registry.
   Guarantees that all category, destination, and catalog icons render
   reliably in all environments (Next.js production bundles, PWA offline, etc.).
   Falls back gracefully for emojis or unknown icons.
   ========================================================================= */

import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Gift,
  Clock,
  Sparkles,
  PartyPopper,
  MoonStar,
  Star,
  Landmark,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  PiggyBank,
  Briefcase,
  Building,
  Home,
  Car,
  Plane,
  Train,
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  Box,
  Tag,
  Award,
  Medal,
  Trophy,
  Crown,
  Gem,
  Diamond,
  Heart,
  ThumbsUp,
  Smile,
  Sun,
  Cloud,
  Umbrella,
  Coffee,
  Utensils,
  Cake,
  IceCream,
  Apple,
  Cherry,
  Book,
  PenTool,
  Paintbrush,
  Camera,
  Music,
  Film,
  Phone,
  Mail,
  MessageCircle,
  Bell,
  Calendar,
  Timer,
  Zap,
  Flame,
  Snowflake,
  Leaf,
  Flower,
  Trees,
  Anchor,
  Compass,
  MapPin,
  Globe,
  Rocket,
  Satellite,
  DollarSign,
  Percent,
  Receipt,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  User,
  Users,
  Lock,
  Unlock,
  Eye,
  FileText,
  Folder,
  Plus,
  Minus,
  Check,
  X,
  Trash2,
  Edit,
  Edit2,
  Edit3,
  Search,
  Settings,
  BarChart,
  BarChart2,
  BarChart3,
  PieChart,
  Activity,
  CircleDot,
  BadgePercent,
  Layers,
  Key,
  Laptop,
  Smartphone,
  Tv,
  Headphones,
  Fuel,
  Truck,
  Shirt,
  Scissors,
  Wrench,
  Hammer,
  Cpu,
  Database,
  Calculator,
  Compass as CompassIcon,
} from 'lucide-react';

interface IconRendererProps extends LucideProps {
  name: string;
  fallbackColor?: string;
}

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  // Catalogs & Defaults
  gift: Gift,
  clock: Clock,
  sparkles: Sparkles,
  'party-popper': PartyPopper,
  partypopper: PartyPopper,
  'moon-star': MoonStar,
  moonstar: MoonStar,
  star: Star,
  landmark: Landmark,
  'credit-card': CreditCard,
  creditcard: CreditCard,
  wallet: Wallet,
  banknote: Banknote,
  coins: Coins,
  'piggy-bank': PiggyBank,
  piggybank: PiggyBank,
  briefcase: Briefcase,
  building: Building,
  home: Home,
  car: Car,
  plane: Plane,
  train: Train,
  'shopping-bag': ShoppingBag,
  shoppingbag: ShoppingBag,
  'shopping-cart': ShoppingCart,
  shoppingcart: ShoppingCart,
  store: Store,
  package: Package,
  box: Box,
  tag: Tag,
  award: Award,
  medal: Medal,
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
  diamond: Diamond,
  heart: Heart,
  'thumbs-up': ThumbsUp,
  thumbsup: ThumbsUp,
  smile: Smile,
  sun: Sun,
  cloud: Cloud,
  umbrella: Umbrella,
  coffee: Coffee,
  utensils: Utensils,
  cake: Cake,
  'ice-cream': IceCream,
  icecream: IceCream,
  apple: Apple,
  cherry: Cherry,
  book: Book,
  'pen-tool': PenTool,
  pentool: PenTool,
  paintbrush: Paintbrush,
  camera: Camera,
  music: Music,
  film: Film,
  phone: Phone,
  mail: Mail,
  'message-circle': MessageCircle,
  messagecircle: MessageCircle,
  bell: Bell,
  calendar: Calendar,
  timer: Timer,
  zap: Zap,
  flame: Flame,
  snowflake: Snowflake,
  leaf: Leaf,
  flower: Flower,
  trees: Trees,
  anchor: Anchor,
  compass: Compass,
  'map-pin': MapPin,
  mappin: MapPin,
  globe: Globe,
  rocket: Rocket,
  satellite: Satellite,
  // Finance & Stats
  'dollar-sign': DollarSign,
  dollarsign: DollarSign,
  percent: Percent,
  receipt: Receipt,
  'trending-up': TrendingUp,
  trendingup: TrendingUp,
  'trending-down': TrendingDown,
  trendingdown: TrendingDown,
  shield: Shield,
  'shield-check': ShieldCheck,
  shieldcheck: ShieldCheck,
  user: User,
  users: Users,
  lock: Lock,
  unlock: Unlock,
  eye: Eye,
  'file-text': FileText,
  filetext: FileText,
  folder: Folder,
  plus: Plus,
  minus: Minus,
  check: Check,
  x: X,
  'trash-2': Trash2,
  trash2: Trash2,
  edit: Edit,
  'edit-2': Edit2,
  edit2: Edit2,
  'edit-3': Edit3,
  edit3: Edit3,
  search: Search,
  settings: Settings,
  'bar-chart': BarChart,
  barchart: BarChart,
  'bar-chart-2': BarChart2,
  barchart2: BarChart2,
  'bar-chart-3': BarChart3,
  barchart3: BarChart3,
  'pie-chart': PieChart,
  piechart: PieChart,
  activity: Activity,
  'circle-dot': CircleDot,
  circledot: CircleDot,
  'badge-percent': BadgePercent,
  badgepercent: BadgePercent,
  layers: Layers,
  key: Key,
  laptop: Laptop,
  smartphone: Smartphone,
  tv: Tv,
  headphones: Headphones,
  fuel: Fuel,
  truck: Truck,
  shirt: Shirt,
  scissors: Scissors,
  wrench: Wrench,
  hammer: Hammer,
  cpu: Cpu,
  database: Database,
  calculator: Calculator,
};

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[-_\s]/g, '');
}

export function IconRenderer({ name, fallbackColor, ...rest }: IconRendererProps) {
  if (!name) {
    return <Sparkles {...rest} />;
  }

  // 1. Direct or normalized lookup in ICON_MAP
  const directMatch = ICON_MAP[name] || ICON_MAP[name.toLowerCase()];
  if (directMatch) {
    const Component = directMatch;
    return <Component {...rest} />;
  }

  const cleanKey = normalizeKey(name);
  const normalizedMatch = ICON_MAP[cleanKey];
  if (normalizedMatch) {
    const Component = normalizedMatch;
    return <Component {...rest} />;
  }

  // 2. Check if name is an emoji
  if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
    return (
      <span
        className="inline-flex items-center justify-center leading-none select-none"
        style={{ fontSize: (rest.size as number) ?? 20 }}
      >
        {name}
      </span>
    );
  }

  // 3. Fallback to Sparkles or Tag or subtle colored dot
  if (fallbackColor) {
    return (
      <span
        className="inline-block w-4 h-4 rounded-full"
        style={{ background: fallbackColor }}
      />
    );
  }

  return <Sparkles {...rest} />;
}
