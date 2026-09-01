'use client';

/* =========================================================================
   سرچشمه — AuthScreen (non-blocking)
   =========================================================================
   Login / Sign up screen that can be dismissed.
   - User can skip and use the app offline without syncing
   - Can be reopened from Settings → "حساب و سینک"

   If Supabase is not configured (env vars missing), shows a banner
   explaining what to do instead of silently failing with "Failed to fetch".
   ========================================================================= */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { syncAll } from '@/features/auth/sync';
import { toast } from 'sonner';
import { BottomSheet } from '@/components/BottomSheet';

interface AuthScreenProps {
  open: boolean;
  onClose: () => void;
  onAuthed?: () => void;
}

export function AuthScreen({ open, onClose, onAuthed }: AuthScreenProps) {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError('سینک ابری هنوز فعال نیست — env variables ناقص‌اند. اپ فعلاً فقط روی همین دستگاه کار می‌کنه.');
      return;
    }
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error, user: signedInUser } = await fn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (mode === 'signup') {
      setError('ایمیل تأیید رو چک کن — اگه فعال نباشه، مستقیم وارد می‌شی');
    } else {
      // Signed in successfully — sync and close
      toast.success('خوش اومدی!');
      if (signedInUser) {
        try {
          await syncAll(signedInUser.id);
          toast.success('داده‌ها سینک شد');
        } catch { /* ignore sync errors on first login */ }
      }
      onAuthed?.();
      onClose();
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="ورود به حساب" showCloseButton>
      <div className="px-5 py-3 space-y-5">
        {/* Not-configured warning */}
        {!configured && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgb(var(--warning) / 0.12)' }}>
            <AlertTriangle size={20} style={{ color: 'rgb(var(--warning))', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs leading-relaxed flex-1" style={{ color: 'rgb(var(--text))' }}>
              سینک ابری هنوز فعال نیست. در فایل <code dir="ltr" className="px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--surface-2))' }}>.env</code> پروژه، مقادیر <code dir="ltr" className="px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--surface-2))' }}>NEXT_PUBLIC_SUPABASE_URL</code> و <code dir="ltr" className="px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--surface-2))' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> رو از dashboard.supabase.com بردار، ذخیره کن و یک بار اپ رو ری‌بیلد کن.
              <br /><br />
              بدون سینک هم اپ روی همین دستگاه کار می‌کنه.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgb(var(--brand-primary) / 0.08)' }}>
          <Cloud size={20} style={{ color: 'rgb(var(--brand-primary))' }} />
          <p className="text-xs text-text-muted leading-relaxed flex-1">
            با ورود به حساب، داده‌هات بین دستگاه‌ها سینک می‌شه و بکاپ ابری می‌گیری.
            بدون ورود هم می‌تونی از اپ استفاده کنی — فقط روی همین دستگاه.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">ایمیل</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="حداقل ۶ کاراکتر"
              required
              minLength={6}
              dir="ltr"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text))' }}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl text-xs" style={{ background: 'rgb(var(--danger) / 0.10)', color: 'rgb(var(--danger))' }}>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading || !email.trim() || password.length < 6}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl font-medium text-base flex items-center justify-center gap-2"
            style={{
              background: loading || !email.trim() || password.length < 6 ? 'rgb(var(--surface-2))' : 'rgb(var(--brand-primary))',
              color: loading || !email.trim() || password.length < 6 ? 'rgb(var(--text-faint))' : 'white',
            }}
          >
            {loading ? 'صبر کن...' : mode === 'signin' ? 'ورود' : 'ثبت‌نام'}
          </motion.button>
        </form>

        {/* Toggle mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="text-sm text-brand-primary pressable"
          >
            {mode === 'signin' ? 'حساب نداری؟ ثبت‌نام کن' : 'حساب داری؟ وارد شو'}
          </button>
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl text-sm font-medium pressable"
          style={{ background: 'rgb(var(--surface-2))', color: 'rgb(var(--text-muted))' }}
        >
          فعلاً نه — بدون حساب ادامه بده
        </button>
      </div>
    </BottomSheet>
  );
}
