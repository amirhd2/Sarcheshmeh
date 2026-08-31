'use client';

/* =========================================================================
   سرچشمه — AuthScreen
   =========================================================================
   Login / Sign up screen shown when user is not authenticated.
   Simple email + password form.
   ========================================================================= */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthContext';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (mode === 'signup') {
      setError('ایمیل تأیید رو چک کن — اگه فعال نباشه، مستقیم وارد می‌شی');
    }
  }

  return (
    <div className="min-h-safe flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-3"
            style={{ background: 'rgb(var(--brand-primary) / 0.10)' }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C16 4 7 13.5 7 20a9 9 0 0 0 18 0c0-6.5-9-16-9-16Z" fill="rgb(var(--brand-primary))" opacity="0.9" />
              <path d="M12 19a4 4 0 0 0 4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text">سرچشمه</h1>
          <p className="text-sm text-text-muted mt-1">برای سینک داده‌ها وارد شو</p>
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
            <div
              className="px-4 py-3 rounded-2xl text-xs"
              style={{ background: 'rgb(var(--danger) / 0.10)', color: 'rgb(var(--danger))' }}
            >
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading || !email.trim() || password.length < 6}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl font-medium text-base"
            style={{
              background: loading || !email.trim() || password.length < 6
                ? 'rgb(var(--surface-2))'
                : 'rgb(var(--brand-primary))',
              color: loading || !email.trim() || password.length < 6
                ? 'rgb(var(--text-faint))'
                : 'white',
            }}
          >
            {loading ? 'صبر کن...' : mode === 'signin' ? 'ورود' : 'ثبت‌نام'}
          </motion.button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="text-sm text-brand-primary pressable"
          >
            {mode === 'signin' ? 'حساب نداری؟ ثبت‌نام کن' : 'حساب داری؟ وارد شو'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
