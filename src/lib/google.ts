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
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (!parsed.access_token || !parsed.expires_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredToken(token: StoredToken) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  } catch { /* quota — ignore */ }
}

function clearStoredToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
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

  return new Promise<string>((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (response: TokenResponse) => {
          if (!response.access_token) {
            reject(new Error('دسترسی به گوگل ناموفق بود'));
            return;
          }
          const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
          saveStoredToken({ access_token: response.access_token, expires_at });
          resolve(response.access_token);
        },
        error_callback: (err: { type: string; message: string }) => {
          // Common cases:
          // - 'popup_closed': user closed the popup
          // - 'access_denied': user denied consent
          // - 'immediate_failed': silent prompt failed (need interactive)
          // - 'popup_failed_to_open' etc.
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
          reject(new Error(msg));
        },
      });
    }

    // `silent` => no popup, attempt silent refresh. If user is not signed
    // in to Google or previously denied, this will fail with immediate_failed.
    tokenClient.requestAccessToken({ prompt: opts.silent ? '' : undefined });
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
