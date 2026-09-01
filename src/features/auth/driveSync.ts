'use client';

/* =========================================================================
   سرچشمه — Google Drive sync (Dexie <-> Drive appDataFolder)
   =========================================================================
   Bidirectional sync between local Dexie (IndexedDB) and a single JSON file
   stored in the user's hidden Google Drive `appDataFolder`.

   Why appDataFolder:
     - Files in this folder are NOT visible to the user in their Drive UI.
     - The app has read/write access ONLY to this folder — cannot touch any
       other Drive files. Safer & more privacy-friendly than full Drive scope.

   Strategy: last-write-wins based on `updatedAt` timestamp (per-record).
     1. Download remote blob (if exists)
     2. Merge remote rows into local Dexie (newer wins)
     3. Build merged snapshot from Dexie
     4. Upload merged snapshot back to Drive (creates or updates file)

   Backup file format — same as the existing BackupFile interface:
     { app, schemaVersion, exportedAt, data: { transactions, categories, destinations, settings } }

   File name: "sarcheshmeh-backup.json" — single file, overwritten each sync.
   ========================================================================= */

import { db } from '@/db/schema';
import type { Transaction, Category, Destination, Settings } from '@/db/schema';
import { SCHEMA_VERSION } from '@/db/schema';
import { getValidAccessToken, requestAccessToken } from '@/lib/google';

const FILE_NAME = 'sarcheshmeh-backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
  /** Google Drive file id used. */
  fileId?: string;
}

/* -------------------------------------------------------------------------
   Backup blob types — matches BackupFile shape from schema.ts
   ------------------------------------------------------------------------- */

interface BackupBlob {
  app: 'sarcheshmeh';
  schemaVersion: number;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    destinations: Destination[];
    settings: Settings | null;
  };
}

/* -------------------------------------------------------------------------
   Low-level Drive API helpers — auto-refresh token on 401
   ------------------------------------------------------------------------- */

async function fetchWithAuth(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  let token = getValidAccessToken();
  if (!token) {
    token = await requestAccessToken({ silent: true });
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 && attempt < 1) {
    // Token expired — force interactive refresh (will fail if user is not
    // signed in; caller should handle that).
    const newToken = await requestAccessToken({ silent: false });
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${newToken}`,
      },
    });
  }
  return res;
}

/** Find the backup file in appDataFolder. Returns file id or null. */
async function findBackupFile(): Promise<string | null> {
  const url = new URL(`${DRIVE_API}/files`);
  url.searchParams.set('spaces', 'appDataFolder');
  url.searchParams.set('q', `name = '${FILE_NAME}' and trashed = false`);
  url.searchParams.set('fields', 'files(id, name, modifiedTime)');

  const res = await fetchWithAuth(url.toString());
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Drive list failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const files = (json.files ?? []) as Array<{ id: string; name: string }>;
  return files[0]?.id ?? null;
}

/** Download file content (JSON blob) from Drive. Returns null if no file. */
async function downloadBlob(fileId: string): Promise<BackupBlob | null> {
  const url = `${DRIVE_API}/files/${fileId}?alt=media`;
  const res = await fetchWithAuth(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Drive download failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as BackupBlob;
}

/** Create a new backup file with content. Returns file id. */
async function createBlob(content: BackupBlob): Promise<string> {
  const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
  const boundary = 'sarcheshmeh_boundary_xyz';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(content) + '\r\n' +
    `--${boundary}--`;

  const res = await fetchWithAuth(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Drive create failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json.id as string;
}

/** Update an existing backup file with new content. */
async function updateBlob(fileId: string, content: BackupBlob): Promise<void> {
  const boundary = 'sarcheshmeh_boundary_xyz';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(content) + '\r\n' +
    `--${boundary}--`;

  const res = await fetchWithAuth(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=multipart`, {
    method: 'PATCH',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Drive update failed: ${res.status} ${txt}`);
  }
}

/* -------------------------------------------------------------------------
   Merge — last-write-wins per record
   ------------------------------------------------------------------------- */

function newer(a: string | undefined | null, b: string | undefined | null): boolean {
  const ta = a ? Date.parse(a) : 0;
  const tb = b ? Date.parse(b) : 0;
  return ta > tb;
}

/**
 * Pull remote rows into local Dexie (newer wins, soft-deletes respected).
 */
async function pullRemoteIntoDexie(remote: BackupBlob): Promise<number> {
  let pulled = 0;

  // Transactions
  for (const r of remote.data.transactions ?? []) {
    const local = await db.transactions.get(r.id);
    if (!local || newer(r.updatedAt, local.updatedAt)) {
      await db.transactions.put(r);
      pulled++;
    }
  }

  // Categories
  for (const r of remote.data.categories ?? []) {
    const local = await db.categories.get(r.id);
    if (!local || newer(r.updatedAt, local.updatedAt)) {
      await db.categories.put(r);
      pulled++;
    }
  }

  // Destinations
  for (const r of remote.data.destinations ?? []) {
    const local = await db.destinations.get(r.id);
    if (!local || newer(r.updatedAt, local.updatedAt)) {
      await db.destinations.put(r);
      pulled++;
    }
  }

  // Settings — single row, only update if remote is newer
  const remoteSettings = remote.data.settings;
  if (remoteSettings) {
    const localSettings = await db.settings.get('singleton');
    if (!localSettings || newer(remoteSettings.updatedAt, localSettings.updatedAt)) {
      await db.settings.put(remoteSettings);
      pulled++;
    }
  }

  return pulled;
}

/**
 * Build a snapshot of all current Dexie data for upload.
 */
async function buildLocalSnapshot(): Promise<BackupBlob> {
  const [transactions, categories, destinations, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.destinations.toArray(),
    db.settings.get('singleton'),
  ]);

  return {
    app: 'sarcheshmeh',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      categories,
      destinations,
      settings: settings ?? null,
    },
  };
}

/* -------------------------------------------------------------------------
   Public sync API — used by AuthScreen & SettingsSheet
   ------------------------------------------------------------------------- */

/**
 * Full sync: pull remote → merge → push local.
 * Returns counts for UI feedback.
 */
export async function syncWithDrive(): Promise<SyncResult> {
  const errors: string[] = [];
  let pulled = 0;
  let pushed = 0;
  let fileId: string | undefined;

  // Phase 1: Find + download remote
  let remote: BackupBlob | null = null;
  try {
    fileId = (await findBackupFile()) ?? undefined;
    if (fileId) {
      remote = await downloadBlob(fileId);
    }
  } catch (e) {
    errors.push(`دانلود: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Phase 2: Merge remote into Dexie
  if (remote) {
    try {
      pulled = await pullRemoteIntoDexie(remote);
    } catch (e) {
      errors.push(`ادغام: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Phase 3: Build snapshot from Dexie (now merged) and push
  try {
    const snapshot = await buildLocalSnapshot();
    if (fileId) {
      await updateBlob(fileId, snapshot);
    } else {
      fileId = await createBlob(snapshot);
    }
    // Count records uploaded (rough — counts all rows in Dexie, not just changed)
    pushed =
      snapshot.data.transactions.length +
      snapshot.data.categories.length +
      snapshot.data.destinations.length +
      (snapshot.data.settings ? 1 : 0);
  } catch (e) {
    errors.push(`آپلود: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { pushed, pulled, errors, fileId };
}
