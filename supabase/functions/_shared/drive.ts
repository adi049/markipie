// ============================================================
// Markipie — shared Drive helpers for edge functions (Phase 10)
// ------------------------------------------------------------
// SECURITY RULES (Part 30):
//   · GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
//     and SUPABASE_SERVICE_ROLE_KEY are edge SECRETS only.
//   · Refresh tokens are stored AES-GCM encrypted inside
//     drive_connections (003_drive_sync.sql) and never returned
//     to any client.
//   · Only read-only Drive scope is requested.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
export const DRIVE_ABOUT_URL = 'https://www.googleapis.com/drive/v3/about';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export const FOLDER_MIME = 'application/vnd.google-apps.folder';

export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error('missing-env:' + name);
  return v;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

export function corsPreflight(req: Request) {
  if (req.method === 'OPTIONS') return json('ok');
  return null;
}

/** Service-role client — edge functions only, never the browser. */
export function serviceClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Verify the caller is an authenticated active admin (Part 30). */
export async function requireAdmin(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const svc = serviceClient();
  const { data: prof } = await svc.from('admin_profiles')
    .select('id,user_id').eq('user_id', user.id).eq('role', 'admin').eq('is_active', true).maybeSingle();
  return prof ? { userId: user.id, profileId: prof.id, svc } : null;
}

/* ---------------- token storage: AES-GCM at rest ---------------- */
async function encKey() {
  const raw = new TextEncoder().encode(requireEnv('ENCRYPTION_KEY'));
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptToken(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encKey(), new TextEncoder().encode(plain));
  return 'v1:' + btoa(String.fromCharCode(...iv)) + ':' + btoa(String.fromCharCode(...new Uint8Array(ct)));
}
export async function decryptToken(stored: string): Promise<string> {
  const [v, ivB64, ctB64] = stored.split(':');
  if (v !== 'v1') throw new Error('bad-token-version');
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await encKey(), Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0)));
  return new TextDecoder().decode(pt);
}

/** Access token from the stored (encrypted) refresh token. */
export async function accessTokenFor(refreshEnc: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: await decryptToken(refreshEnc),
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    // invalid_grant → authorization expired/revoked (Part 21 wording)
    throw new Error(data.error === 'invalid_grant' ? 'google-auth-expired' : 'google-token-error');
  }
  return data.access_token;
}

export interface DriveFileMeta {
  id: string; name: string; mimeType: string; size: string | null;
  thumbnailLink?: string; videoMediaMetadata?: { width?: number; height?: number };
}

/** One page of a Drive folder listing (files only, folders excluded). */
export async function listFolderPage(accessToken: string, folderId: string, pageToken?: string) {
  const q = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`,
    fields: 'nextPageToken, files(id,name,mimeType,size,thumbnailLink,videoMediaMetadata)',
    pageSize: '200',
  });
  if (pageToken) q.set('pageToken', pageToken);
  const res = await fetch(DRIVE_FILES_URL + '?' + q, { headers: { Authorization: 'Bearer ' + accessToken } });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 404) throw new Error('folder-not-found');
    if (res.status === 403) throw new Error('folder-inaccessible'); // rate limit or permission removed
    throw new Error('drive-api-error');
  }
  return { files: (data.files ?? []) as DriveFileMeta[], nextPageToken: data.nextPageToken as string | undefined };
}

/** Sub-folders of a folder (for the admin picker). */
export async function listSubFolders(accessToken: string, parentId?: string) {
  const q = new URLSearchParams({
    q: `mimeType = '${FOLDER_MIME}' and trashed = false` + (parentId ? ` and '${parentId}' in parents` : ''),
    fields: 'files(id,name,webViewLink)',
    pageSize: '100',
  });
  const res = await fetch(DRIVE_FILES_URL + '?' + q, { headers: { Authorization: 'Bearer ' + accessToken } });
  const data = await res.json();
  if (!res.ok) throw new Error(res.status === 403 ? 'folder-inaccessible' : 'drive-api-error');
  return (data.files ?? []) as { id: string; name: string; webViewLink?: string }[];
}

/** PHOTO / VIDEO classification (Part 7) — unknown mime types are skipped. */
export function classify(mime: string): 'photo' | 'video' | null {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg' || m === 'image/png' || m === 'image/webp' || m === 'image/heic' || m === 'image/heif') return 'photo';
  if (m === 'video/mp4' || m === 'video/webm' || m === 'video/quicktime' || m === 'video/x-msvideo' || m === 'video/x-matroska') return 'video';
  return null; // unknown / unsupported → skipped safely
}

/* ============================================================
   Rate limiting (Phase 13 — hardening)
   Fixed-window counter per (route, client IP) in the canonical
   `access_rate_limits` table (004_rate_limits.sql). Best-effort
   brute-force throttling for public code validation and the
   client-facing endpoints — responses stay NEUTRAL, exactly like
   an invalid code, so limits never leak which codes exist.
   Returns null when the call may proceed, else a ready 429.
   ============================================================ */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}

export async function rateLimit(
  svc: ReturnType<typeof serviceClient>,
  req: Request,
  name: string,
  limit: number,
  windowSec: number,
  extraKey = '',
): Promise<Response | null> {
  try {
    const bucket = name + ':' + clientIp(req) + (extraKey ? ':' + extraKey : '');
    const since = new Date(Date.now() - windowSec * 1000).toISOString();
    const { data: row } = await svc.from('access_rate_limits')
      .select('hits, window_started_at').eq('bucket', bucket).maybeSingle();
    if (!row || row.window_started_at < since) {
      await svc.from('access_rate_limits').upsert(
        { bucket, hits: 1, window_started_at: new Date().toISOString() },
        { onConflict: 'bucket' },
      );
      return null;
    }
    if ((row.hits ?? 0) >= limit) {
      return json({ ok: false, error: 'Too many attempts — please wait a minute and try again.' }, 429);
    }
    await svc.from('access_rate_limits')
      .update({ hits: (row.hits ?? 0) + 1 }).eq('bucket', bucket);
    return null;
  } catch (_e) {
    return null; // limiter must never take the endpoint down
  }
}
