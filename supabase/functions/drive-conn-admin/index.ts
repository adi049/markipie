// ============================================================
// Markipie — drive-conn-admin (Phase 13 — hardening)
// The ONLY write path to drive_connections from a browser.
// Replaces the anon-client upsert/update in driveService
// (RLS correctly blocked it — and must never allow it).
//
// POST { op, ... }   (admin session required — requireAdmin)
//   op 'save'       { client_function_id, folder_id, folder_name }
//     → connection becomes 'connected' with that folder.
//   op 'disconnect' { client_function_id }
//     → marked not_connected, folder fields cleared; media
//       metadata and the (encrypted) token are retained —
//       removal is always a mark, never a delete (Phase 10).
//   op 'get'        { client_function_id }  → minimal row
//   op 'set'        { client_function_id, connection_status }
//     → status whitelist enforced server-side.
//
// The browser can no longer write connection rows directly:
// drive_connections RLS grants everything to is_admin() only,
// and this function re-checks admin on every call.
// ============================================================
import { json, corsPreflight, requireAdmin } from '../_shared/drive.ts';

const STATUSES = ['not_connected', 'connected', 'syncing', 'synced', 'error'];

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false, error: 'Sign in to continue.' }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ ok: false, error: 'Sign in to continue.' }, 401);

  try {
    const body = await req.json();
    const op = body.op === 'save' || body.op === 'disconnect' || body.op === 'get' || body.op === 'set'
      ? body.op : '';
    const fnId = String(body.client_function_id ?? '');
    if (!op || !fnId) return json({ ok: false, error: 'Missing connection details.' });

    const svc = admin.svc;

    if (op === 'get') {
      const { data: row } = await svc.from('drive_connections')
        .select('client_function_id, connection_status, drive_folder_id, drive_folder_url, folder_name, oauth_email, total_files, last_synced_at, last_sync_summary')
        .eq('client_function_id', fnId).maybeSingle();
      // never returns tokens of any kind
      return json({ ok: true, connection: row ?? null });
    }

    if (op === 'save') {
      const folderId = String(body.folder_id ?? '').trim();
      const folderName = String(body.folder_name ?? '').trim();
      if (!folderId) return json({ ok: false, error: 'Choose a folder first.' });
      const row = {
        client_function_id: fnId,
        drive_folder_id: folderId,
        drive_folder_url: 'https://drive.google.com/drive/folders/' + encodeURIComponent(folderId),
        folder_name: folderName || null,
        connection_status: 'connected',
      };
      const { error } = await svc.from('drive_connections').upsert(row, { onConflict: 'client_function_id' });
      if (error) return json({ ok: false, error: 'Could not save the Drive folder.' });
      await svc.from('admin_activity_logs').insert({
        admin_user_id: admin.userId, action: 'drive.folder_saved',
        entity_type: 'client_function', entity_id: fnId,
        metadata: { folder_name: folderName || '' },
      });
      return json({ ok: true });
    }

    if (op === 'disconnect') {
      const { error } = await svc.from('drive_connections')
        .update({ connection_status: 'not_connected', folder_name: null, drive_folder_id: null, drive_folder_url: null })
        .eq('client_function_id', fnId);
      if (error) return json({ ok: false, error: 'Could not disconnect Drive.' });
      await svc.from('admin_activity_logs').insert({
        admin_user_id: admin.userId, action: 'drive.disconnected',
        entity_type: 'client_function', entity_id: fnId, metadata: {},
      });
      return json({ ok: true });
    }

    // op === 'set' — status whitelist, nothing else is writable this way
    const status = String(body.connection_status ?? '');
    if (STATUSES.indexOf(status) === -1) return json({ ok: false, error: 'Connection status is not valid.' });
    const { error } = await svc.from('drive_connections')
      .upsert({ client_function_id: fnId, connection_status: status }, { onConflict: 'client_function_id' });
    if (error) return json({ ok: false, error: 'Could not update the connection.' });
    return json({ ok: true });
  } catch (_e) {
    return json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});
