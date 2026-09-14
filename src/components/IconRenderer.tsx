'use client';

/* =========================================================================
   سرچشمه — Icon renderer
   =========================================================================
   Renders a Lucide icon by name. Used by category/destination chips.
   Falls back to a small colored dot if the name is not a valid Lucide
   icon (e.g. emoji strings).
   ========================================================================= */

import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface IconRendererProps extends LucideProps {
  name: string;
  fallbackColor?: string;
}

/** PascalCase a kebab-name: 'gift-card' → 'GiftCard' */
function toPascalCase(s: string): string {
  return s
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

export function IconRenderer({ name, fallbackColor, ...rest }: IconRendererProps) {
  // Try to find the icon in the LucideIcons namespace.
  // Lucide exports are PascalCase: 'GiftCard', 'CreditCard', etc.
  const pascal = toPascalCase(name);
  const Icon = (LucideIcons as Record<string, React.ComponentType<LucideProps>>)[pascal];

  if (Icon) {
    return <Icon {...rest} />;
  }

  // Fallback — colored dot
  return (
    <span
      className="inline-block w-4 h-4 rounded-full"
      style={{ background: fallbackColor ?? 'currentColor' }}
    />
  );
}
