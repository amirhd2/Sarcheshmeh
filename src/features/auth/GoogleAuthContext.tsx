'use client';

/* =========================================================================
   سرچشمه — Google Auth context
   =========================================================================
   Replaces the previous Supabase-based AuthContext.

   "Signed in" here means: we have a valid (or refreshable) Google access
   token with scope `drive.appdata`. The app uses the token ONLY to talk
   to the Drive API — there is no backend, no user profile, no email
   (the app doesn't need any of that).

   If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is missing, the context still loads
   (offline-first): `signedIn` is false and `signIn` returns a friendly
   Persian error instead of an opaque network failure.
   ========================================================================= */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { isGoogleConfigured, getValidAccessToken, requestAccessToken, revokeToken } from '@/lib/google';

interface GoogleAuthContextValue {
  /** True if we currently have a valid (non-expired) access token. */
  signedIn: boolean;
  loading: boolean;
  /** True if NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured in .env. */
  configured: boolean;
  /** Open Google popup & request Drive.appdata permission. */
  signIn: () => Promise<{ error: string | null }>;
  /** Revoke token + clear storage. */
  signOut: () => Promise<void>;
}

const NOT_CONFIGURED_MSG =
  'همگام‌سازی با گوگل فعال نیست. در فایل .env پروژه، متغیر NEXT_PUBLIC_GOOGLE_CLIENT_ID رو از Google Cloud Console بردار، ذخیره کن و یک بار اپ رو ری‌بیلد کن.';

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, check if a valid token already exists in storage.
  useEffect(() => {
    if (!isGoogleConfigured) {
      setLoading(false);
      return;
    }
    const token = getValidAccessToken();
    setSignedIn(Boolean(token));
    setLoading(false);

    // Listen for token expiry while app is open — if token expires,
    // we mark the user as signed out (next action will prompt silent refresh).
    const interval = setInterval(() => {
      const stillValid = Boolean(getValidAccessToken());
      setSignedIn((prev) => (prev === stillValid ? prev : stillValid));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const signIn = useCallback(async () => {
    if (!isGoogleConfigured) return { error: NOT_CONFIGURED_MSG };
    try {
      await requestAccessToken({ silent: false });
      setSignedIn(true);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await revokeToken();
    } finally {
      setSignedIn(false);
    }
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{ signedIn, loading, configured: isGoogleConfigured, signIn, signOut }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  return ctx;
}
