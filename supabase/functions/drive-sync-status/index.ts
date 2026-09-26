// ============================================================
// Markipie — drive-sync-status (Phase 10, Parts 5, 9, 22, 27)
// Admin-only readout for the Drive panel: connection state,
// folder info, live sync progress and the last sync history.
// POST { client_function_id }
// ============================================================
import { json, corsPreflight, requireAdmin } from '../_shared/drive.ts';

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ ok: false, error: 'Sign in to continue.' }, 401);

  const { client_function_id } = await req.json();
  if (!client_function_id) return json({ ok: false, error: 'Missing function.' }, 400);

  const { data: conn } = await admin.svc.from('drive_connections')
    .select('connection_status, drive_folder_id, drive_folder_url, folder_name, total_files, last_synced_at, last_sync_summary, oauth_email, oauth_refresh_token_enc')
    .eq('client_function_id', client_function_id).maybeSingle();

  if (!conn) return json({ ok: true, connection: null });

  const { count: photos } = await admin.svc.from('media')
    .select('id', { count: 'exact', head: true })
    .eq('client_function_id', client_function_id).eq('available', true).eq('media_type', 'photo');
  const { count: videos } = await admin.svc.from('media')
    .select('id', { count: 'exact', head: true })
    .eq('client_function_id', client_function_id).eq('available', true).eq('media_type', 'video');
  const { count: pendingAi } = await admin.svc.from('media')
    .select('id', { count: 'exact', head: true })
    .eq('client_function_id', client_function_id).eq('available', true).eq('media_type', 'photo')
    .eq('processing_status', 'pending');

  return json({
    ok: true,
    connection: {
      status: conn.connection_status,
      folderId: conn.drive_folder_id,
      folderUrl: conn.drive_folder_url,
      folderName: conn.folder_name,
      account: conn.oauth_refresh_token_enc ? (conn.oauth_email ?? 'Google account') : null, // no token data leaves the server
      totalFiles: conn.total_files ?? 0,
      lastSyncedAt: conn.last_synced_at,
      history: conn.last_sync_summary ?? null,
      photos: photos ?? 0,
      videos: videos ?? 0,
      aiIndex: (photos ?? 0) === 0 ? 'Not Started' : (pendingAi ? 'Queued (Phase 12)' : 'Indexed'),
    },
  });
});
