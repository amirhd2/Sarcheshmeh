'use client';

/* =========================================================================
   سرچشمه — Auth context
   =========================================================================
   Manages user authentication state (signed in / signed out).
   Provides signUp, signIn, signOut functions.

   If Supabase env vars are missing, all operations return a friendly
   Persian error instead of "Failed to fetch".
   ========================================================================= */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
}

const NOT_CONFIGURED_MSG =
  'سینک ابری هنوز فعال نیست. لطفاً در تنظیمات پروژه، مقادیر NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را در فایل .env وارد کن و یک بار اپ رو ری‌بیلد کن.';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // No Supabase — skip session fetch so the app loads offline-first.
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_MSG, user: null };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null, user: data?.user ?? null };
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_MSG, user: null };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null, user: data?.user ?? null };
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, configured: isSupabaseConfigured, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
