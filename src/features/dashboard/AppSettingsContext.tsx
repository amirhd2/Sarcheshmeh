'use client';

/* =========================================================================
   سرچشمه — AppSettings context
   =========================================================================
   Provides theme + digit preference to the entire app, synced with the
   Dexie settings row. The provider boots the database, applies the theme
   to <html>, and exposes the current settings + setters via useAppSettings().

   - Theme application: <html class="dark" data-theme="dark|light">
   - When theme is "system", we listen to prefers-color-scheme and update
     live when the OS preference changes.
   - Digit preference is stored in settings.digits and exposed to all
     formatters via the context.
   ========================================================================= */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initDatabase, updateSettings } from '@/db/init';
import type { Settings, ThemePref, DigitPref } from '@/db/schema';

interface AppSettingsValue {
  ready: boolean;
  theme: ThemePref;
  digits: DigitPref;
  setTheme: (t: ThemePref) => Promise<void>;
  setDigits: (d: DigitPref) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [digits, setDigitsState] = useState<DigitPref>('fa');

  // Boot DB on mount with timeout guard
  useEffect(() => {
    let cancelled = false;
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        setReady(true);
      }
    }, 1500);

    (async () => {
      try {
        const s = await initDatabase();
        if (cancelled) return;
        clearTimeout(safetyTimeout);
        setThemeState(s.theme);
        setDigitsState(s.digits);
        setReady(true);
      } catch (e) {
        console.error('Failed to initialize database:', e);
        if (cancelled) return;
        clearTimeout(safetyTimeout);
        // Even on failure, mark ready so the UI can show
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const apply = (mode: 'light' | 'dark') => {
      if (mode === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      root.setAttribute('data-theme', mode);
      // Update theme-color meta tags live
      const lightColor = '#F4F2EF';
      const darkColor = '#141619';
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      metas.forEach((m) => {
        m.setAttribute('content', mode === 'dark' ? darkColor : lightColor);
      });
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    apply(theme);
  }, [theme, ready]);

  const setTheme = useCallback(async (t: ThemePref) => {
    setThemeState(t);
    await updateSettings({ theme: t });
  }, []);

  const setDigits = useCallback(async (d: DigitPref) => {
    setDigitsState(d);
    await updateSettings({ digits: d });
  }, []);

  return (
    <AppSettingsContext.Provider value={{ ready, theme, digits, setTheme, setDigits }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return ctx;
}

/** Re-export types for convenience. */
export type { Settings, ThemePref, DigitPref };
