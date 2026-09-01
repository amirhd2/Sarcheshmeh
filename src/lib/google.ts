'use client';

/* =========================================================================
   سرچشمه — Google Identity Services (GIS) loader & token client
   =========================================================================
   Loads the GIS script, exposes helpers to request / revoke access tokens
   for the Google Drive `appDataFolder` scope.

   Scope used:
     https://www.googleapis.com/auth/drive.appdata
   This grants read/write access ONLY to the app's hidden folder in the
   user's Google Drive — the user never sees the file, and the app cannot
   touch any of the user's other Drive files. Safe & minimal.

   Token persistence:
     Access tokens expire in ~1 hour. We persist them in sessionStorage so
     a page refresh doesn't lose them. On expiry, the next API call will
     return 401 — the caller calls `requestAccessToken()` again with
     `prompt: ''` for a silent refresh (no popup).
   ========================================================================= */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const TOKEN_STORAGE_KEY = 'sarcheshmeh_google_token';

// Augment window for GIS types
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (err: { type: string; message: string }) => void;
          }) => {
            requestAccessToken: (override?: { prompt?: string }) => void;
          };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  /** UNIX seconds — when token was issued */
  first_issued_at?: number;
  /** UNIX seconds — when token expires */
  expires_at?: number;
}

export interface StoredToken {
  access_token: string;
  expires_at: number; // UNIX ms
}

/* -------------------------------------------------------------------------
   Config
   ------------------------------------------------------------------------- */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const isGoogleConfigured = Boolean(
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
);

/* -------------------------------------------------------------------------
   GIS script loader — lazy + cached
   ------------------------------------------------------------------------- */

let gisLoadPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load GIS script')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GIS script'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

/* -------------------------------------------------------------------------
   Token persistence (sessionStorage)
   ------------------------------------------------------------------------- */

function loadStoredToken(): StoredToken | null {
  if (typeof window === 'undefined') return null;
  // Try both localStorage (persistent) and sessionStorage (tab-only).
  // Some browsers partition storage for cross-origin iframes; using both
  // increases chances of finding a previously-saved token.
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = storage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredToken;
      if (!parsed.access_token || !parsed.expires_at) continue;
      return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

function saveStoredToken(token: StoredToken) {
  if (typeof window === 'undefined') return;
  // Save to both storages — localStorage for persistence across sessions,
  // sessionStorage for tab-scoped access during the current tab.
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    } catch { /* quota or partition — ignore */ }
  }
}

function clearStoredToken() {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
    } catch { /* ignore */ }
  }
}

/** Returns a still-valid access token from storage, or null. */
export function getValidAccessToken(): string | null {
  const stored = loadStoredToken();
  if (!stored) return null;
  // Refresh 1 minute before expiry to avoid race
  const now = Date.now();
  if (stored.expires_at - 60_000 < now) {
    clearStoredToken();
    return null;
  }
  return stored.access_token;
}

/* -------------------------------------------------------------------------
   Token request — opens Google popup (or silent refresh if prompt='')
   ------------------------------------------------------------------------- */

let tokenClient: ReturnType<Window['google']['accounts']['oauth2']['initTokenClient']> | null = null;

export async function requestAccessToken(opts: { silent?: boolean } = {}): Promise<string> {
  if (!isGoogleConfigured) {
    throw new Error('Google Client ID تنظیم نشده — فایل .env رو بررسی کن');
  }
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services بارگذاری نشد');
  }

  // For iframe / embedded environments, GIS may have trouble reaching the
  // callback if it tries to communicate via window.opener. We use the
  // standard callback approach but add detailed console logging so we can
  // see what's happening if it fails.
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const wrappedResolve = (value: string) => {
      if (!settled) { settled = true; resolve(value); }
    };
    const wrappedReject = (err: Error) => {
      if (!settled) { settled = true; reject(err); }
    };

    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (response: TokenResponse & { error?: string; error_description?: string }) => {
          console.log('[GIS] callback received:', response);
          // GIS may call callback with an error object instead of using error_callback
          if (response.error) {
            const errMsg = response.error_description || response.error;
            console.error('[GIS] callback error:', response.error, response.error_description);
            wrappedReject(new Error(errMsg));
            return;
          }
          if (!response.access_token) {
            console.error('[GIS] no access_token in callback');
            wrappedReject(new Error('دسترسی به گوگل ناموفق بود'));
            return;
          }
          const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
          saveStoredToken({ access_token: response.access_token, expires_at });
          console.log('[GIS] token saved, expires at:', new Date(expiresAt).toISOString());
          wrappedResolve(response.access_token);
        },
        error_callback: (err: { type: string; message: string }) => {
          console.error('[GIS] error_callback:', err);
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '(unknown)';
          const topOrigin = (typeof window !== 'undefined' && window.top && window.top !== window)
            ? (() => { try { return window.top.location.origin; } catch { return '(cross-origin, blocked)'; } })()
            : '(same as self)';
          const referrer = typeof document !== 'undefined' ? (document.referrer || '(empty)') : '(unknown)';
          const debugInfo = ` | self: ${currentOrigin} | top: ${topOrigin} | referrer: ${referrer}`;
          const msg = err?.type === 'popup_closed'
            ? 'پنجره‌ی گوگل بسته شد'
            : err?.type === 'access_denied'
              ? 'اجازه دسترسی داده نشد'
              : err?.message
                ? `${err.message}${debugInfo}`
                : `خطای گوگل${debugInfo}`;
          wrappedReject(new Error(msg));
        },
      });
    }

    // `silent` => no popup, attempt silent refresh. If user is not signed
    // in to Google or previously denied, this will fail with immediate_failed.
    tokenClient.requestAccessToken({ prompt: opts.silent ? '' : undefined });

    // Timeout — if neither callback nor error_callback fires within 60s,
    // reject so the UI doesn't hang forever (common in iframe-embedded apps).
    if (!opts.silent) {
      setTimeout(() => {
        wrappedReject(new Error('گوگل پس از ۶۰ ثانیه پاسخ نداد. این معمولاً به‌خاطر اجرای اپ داخل iframe هست. لطفاً اپ رو در یه tab جداگانه (نه داخل chat.z.ai) باز کن و دوباره امتحان کن.'));
      }, 60_000);
    }
  });
}

/* -------------------------------------------------------------------------
   Revoke + sign out
   ------------------------------------------------------------------------- */

export async function revokeToken(): Promise<void> {
  const token = getValidAccessToken() ?? loadStoredToken()?.access_token;
  clearStoredToken();
  tokenClient = null;
  if (!token) return;
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve) => {
    try {
      window.google.accounts.oauth2.revoke(token, () => resolve());
    } catch {
      resolve();
    }
  });
}
