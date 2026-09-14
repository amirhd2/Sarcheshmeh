'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App-level error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'rgb(var(--bg))' }}>
      <div className="max-w-md w-full p-6 rounded-2xl bg-surface border border-surface-2 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text mb-2">خطایی رخ داده است</h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          در بارگذاری اطلاعات برنامه‌ مشکلی پیش آمد. می‌توانید دوباره تلاش کنید.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد
        </button>
      </div>
    </div>
  );
}
