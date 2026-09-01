'use client';

/* =========================================================================
   سرچشمه — Supabase client
   =========================================================================
   Single Supabase client instance shared across the app.
   Uses environment variables for URL and anon key.
   ========================================================================= */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// During SSR/build, env vars might not be available. Create a dummy
// client to avoid crashes — it won't be used on the server anyway.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createClient('https://dummy.supabase.co', 'dummy-anon-key', {
      auth: { persistSession: false },
    });
