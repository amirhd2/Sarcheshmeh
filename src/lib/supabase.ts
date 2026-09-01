'use client';

/* =========================================================================
   سرچشمه — Supabase client
   =========================================================================
   Single Supabase client instance shared across the app.
   Uses environment variables for URL and anon key.

   If env vars are missing, we create a "dummy" client and export a flag
   `isSupabaseConfigured` so the rest of the app can show a friendly Persian
   error message instead of the cryptic "Failed to fetch".
   ========================================================================= */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** True only when BOTH env vars are present and non-empty. */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 20 // JWT tokens are long
);

let client: SupabaseClient;

if (isSupabaseConfigured) {
  client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} else {
  // Dummy client — every call will fail, but we catch that case before the
  // call happens (see AuthContext / AuthScreen).
  client = createClient('https://invalid.supabase.co', 'invalid-anon-key', {
    auth: { persistSession: false },
  });
}

export const supabase = client;
