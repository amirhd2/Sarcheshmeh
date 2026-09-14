---
Task ID: google-migration
Agent: main
Task: جایگزینی Supabase با Google Drive sync (appDataFolder) + Google Identity Services

Work Log:
- علت خطای "Failed to fetch" کاربر: NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY در .env نبودن، کد به dummy client می‌رفت.
- مقاوم‌سازی اولیه: isSupabaseConfigured فلگ + بنر زرد در AuthScreen.
- سپس مهاجرت کامل به Google Drive:
  - src/lib/google.ts: لودر GIS + initTokenClient + ذخیره توکن در sessionStorage + refresh silent/interactive
  - src/features/auth/GoogleAuthContext.tsx: جایگزین AuthContext. state فقط signedIn (نه user)
  - src/features/auth/driveSync.ts: list/download/create/update فایل JSON در appDataFolder با last-write-wins
  - AuthScreen.tsx بازنویسی با دکمهٔ Google Sign-In (لوگوی رسمی G چندرنگ)
  - SettingsSheet.tsx: "حساب و سینک" به حالت متصل/قطع‌شده، سینک دستی، "قطع اتصال گوگل"
  - .env: حذف Supabase، اضافه‌شدن NEXT_PUBLIC_GOOGLE_CLIENT_ID (خالی)
  - حذف @supabase/supabase-js از package.json
  - حذف src/features/auth/AuthContext.tsx, src/features/auth/sync.ts, src/lib/supabase.ts
  - layout.tsx: AuthProvider → GoogleAuthProvider
- build موفق؛ سرور production روی پورت ۳۰۰۰ با HTTP 200.

Stage Summary:
- اپ فعلاً با configured=false کار می‌کنه (آفلاین‌اول، بدون سینک).
- برای فعال‌سازی سینک: کاربر باید Google OAuth Client ID (نوع "Web application") از Google Cloud Console بسازه و در .env ذخیره کنه.
- Authorized JavaScript origins باید شامل دامنه‌ی preview اپ باشه.
- محدوده‌ی OAuth: drive.appdata (پوشه‌ی پنهان اپ — privacy-friendly).
