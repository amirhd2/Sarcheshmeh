'use client';

import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      style={
        {
          '--normal-bg': 'rgb(var(--surface))',
          '--normal-text': 'rgb(var(--text))',
          '--normal-border': 'rgb(var(--text) / 0.08)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
