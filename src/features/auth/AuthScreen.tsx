'use client';

/* =========================================================================
   سرچشمه — AuthScreen (Google Sign-In, non-blocking)
   =========================================================================
   Asks the user for Google Drive.appdata permission. Can be dismissed.
   - User can skip and use the app offline without syncing
   - Can be reopened from Settings → "حساب و همگام‌سازی"

   If NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, shows a banner explaining
   what to do instead of silently failing.
   ========================================================================= */

import { useState, useEffect } from 'react';
import { Cloud, AlertTriangle } from 'lucide-react';
import { useGoogleAuth } from '@/features/auth/GoogleAuthContext';
import { syncWithDrive } from '@/features/auth/driveSync';
import { toast } from 'sonner';
import { BottomSheet } from '@/components/BottomSheet';

interface AuthScreenProps {
  open: boolean;
  onClose: () => void;
  onAuthed?: () => void;
}

export function AuthScreen({ open, onClose, onAuthed }: AuthScreenProps) {
  const { signIn, configured } = useGoogleAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>('');
  const [topOrigin, setTopOrigin] = useState<string>('');

  useEffect(() => {
    if (open) {
      setCurrentOrigin(window.location.origin);
      try {
        if (window.top && window.top !== window) {
          setTopOrigin(window.top.location.origin);
        } else {
          setTopOrigin('(همان صفحه اپ)');
        }
      } catch {
        setTopOrigin('(cross-origin — قابل دسترسی نیست)');
      }
    }
  }, [open]);

  async function handleGoogleSignIn() {
    setError(null);
    if (!configured) {
      setError('همگام‌سازی با گوگل فعال نیست — env variables ناقص‌اند. اپ فعلاً فقط روی همین دستگاه کار می‌کنه.');
      return;
    }
    setLoading(true);
    const { error } = await signIn();
    if (error) {
      setLoading(false);
      setError(error);
      return;
    }
    // Signed in — trigger first sync
    toast.success('به گوگل متصل شد');
    try {
      const result = await syncWithDrive();
      if (result.errors.length === 0) {
        toast.success(`همگام‌سازی شد — ${result.pushed} آیتم آپلود، ${result.pulled} آیتم دانلود`);
      } else {
        toast.error(`همگام‌سازی ناقص: ${result.errors.join('، ')}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در همگام‌سازی');
    }
    setLoading(false);
    onAuthed?.();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="ورود با گوگل" showCloseButton>
      <div className="px-5 py-3 space-y-5">
        {/* Not-configured warning */}
        {!configured && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgb(var(--warning) / 0.12)' }}>
            <AlertTriangle size={20} style={{ color: 'rgb(var(--warning))', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs leading-relaxed flex-1" style={{ color: 'rgb(var(--text))' }}>
              همگام‌سازی با گوگل هنوز فعال نیست. در فایل <code dir="ltr" className="px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--surface-2))' }}>.env</code> پروژه، مقدار <code dir="ltr" className="px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--surface-2))' }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> رو از Google Cloud Console بردار، ذخیره کن و یک بار اپ رو ری‌بیلد کن.
              <br /><br />
              بدون همگام‌سازی هم اپ روی همین دستگاه کار می‌کنه.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgb(var(--brand-primary) / 0.08)' }}>
          <Cloud size={20} style={{ color: 'rgb(var(--brand-primary))' }} />
          <p className="text-xs text-text-muted leading-relaxed flex-1">
            با ورود با گوگل، یک کپی از داده‌هات در Google Drive (پوشه‌ی پنهان اپ) ذخیره می‌شه و می‌تونی روی دستگاه‌های دیگه بازش کنی.
            اپ فقط به همین پوشه‌ی پنهان دسترسی داره — به هیچ فایل دیگه‌ای از Drive دسترسی نداره.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-2xl text-xs" style={{ background: 'rgb(var(--danger) / 0.10)', color: 'rgb(var(--danger))' }}>
            {error}
          </div>
        )}

        {/* Google sign-in button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-medium text-base flex items-center justify-center gap-3 pressable"
          style={{
            background: loading ? 'rgb(var(--surface-2))' : 'white',
            color: loading ? 'rgb(var(--text-faint))' : '#3c4043',
            border: '1px solid rgb(var(--surface-2))',
          }}
        >
          {/* Google "G" logo (multicolor, official) */}
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          {loading ? 'صبر کن...' : 'ورود با گوگل'}
        </button>

        {/* Privacy note */}
        <p className="text-xs text-text-faint leading-relaxed text-center px-2">
          فقط یک پوشه‌ی پنهان مخصوص «سرچشمه» در گوگل‌درایو شما ساخته می‌شه.
          هیچ‌کس غیر از خود شما دسترسی به اون نداره.
        </p>

        {/* Debug box — always shows current origins so user can match them
            in Google Cloud Console → Authorized JavaScript origins */}
        <div className="px-4 py-3 rounded-2xl text-xs space-y-1.5" style={{ background: 'rgb(var(--brand-primary) / 0.08)', color: 'rgb(var(--text-muted))' }}>
          <p className="font-medium" style={{ color: 'rgb(var(--text))' }}>برای تنظیمات گوگل:</p>
          <p className="leading-relaxed">
            این آدرس‌ها رو در Google Cloud Console → Credentials → OAuth Client → Authorized JavaScript origins اضافه کن:
          </p>
          <p dir="ltr" className="font-mono text-[11px] px-2 py-1.5 rounded" style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}>
            {currentOrigin || '(در حال بارگذاری...)'}
          </p>
          {topOrigin && topOrigin !== '(همان صفحه اپ)' && topOrigin !== '(cross-origin — قابل دسترسی نیست)' && (
            <p dir="ltr" className="font-mono text-[11px] px-2 py-1.5 rounded" style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}>
              {topOrigin}
            </p>
          )}
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl text-sm font-medium pressable"
          style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text-muted))' }}
        >
          فعلاً نه — بدون همگام‌سازی ادامه بده
        </button>
      </div>
    </BottomSheet>
  );
}
