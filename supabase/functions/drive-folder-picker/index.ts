// ============================================================
// Markipie — drive-folder-picker (Phase 10, Part 3–4)
// Admin-only folder browsing for the picker: lists sub-folders of
// a Drive folder (or My Drive root). Returns names + ids only.
// POST { parent_id? }  →  { folders:[{id,name,webViewLink}] }
// ============================================================
import { json, corsPreflight, requireAdmin, accessTokenFor, listSubFolders } from '../_shared/drive.ts';

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ ok: false, error: 'Sign in to continue.' }, 401);

  const { client_function_id, parent_id } = await req.json();
  if (!client_function_id) return json({ ok: false, error: 'Missing function.' }, 400);

  try {
    const { data: conn } = await admin.svc.from('drive_connections')
      .select('oauth_refresh_token_enc')
      .eq('client_function_id', client_function_id)
      .maybeSingle();
    if (!conn?.oauth_refresh_token_enc) {
      return json({ ok: false, error: 'Google Drive is not authorized yet — connect first.' });
    }
    const token = await accessTokenFor(conn.oauth_refresh_token_enc);
    const folders = await listSubFolders(token, parent_id || undefined);
    return json({ ok: true, folders });
  } catch (e) {
    const msg = String((e as Error).message);
    if (msg === 'google-auth-expired') {
      return json({ ok: false, error: 'Google Drive authorization expired. Reconnect to continue.' });
    }
    if (msg === 'folder-inaccessible') return json({ ok: false, error: 'Unable to access this folder.' });
    return json({ ok: false, error: 'Could not reach Google Drive — check the connection and retry.' });
  }
});
