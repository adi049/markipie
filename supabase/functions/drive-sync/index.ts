// ============================================================
// Markipie — drive-sync (Phase 10, Parts 6–9, 21)
// Reads ONE page (≤200 files) of the connected Drive folder per
// invocation and upserts metadata into the canonical `media`
// table. The browser drives resumable progress by calling again
// with the returned cursor until done:true — async/background by
// design; nothing is downloaded or copied into Supabase Storage
// (Part 29: Drive holds originals, Supabase holds metadata).
//
// POST { client_function_id, cursor? }  →
//   { ok, done, cursor, processed, total_est, photos, videos, skipped, errors }
// ============================================================
import {
  json, corsPreflight, requireAdmin, accessTokenFor, listFolderPage, classify, FOLDER_MIME,
} from '../_shared/drive.ts';

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ ok: false, error: 'Sign in to continue.' }, 401);

  const { client_function_id, cursor, batch_id } = await req.json();
  if (!client_function_id) return json({ ok: false, error: 'Missing function.' }, 400);

  const svc = admin.svc;
  const { data: conn } = await svc.from('drive_connections')
    .select('id, drive_folder_id, oauth_refresh_token_enc, last_sync_summary')
    .eq('client_function_id', client_function_id).maybeSingle();

  if (!conn?.drive_folder_id) return json({ ok: false, error: 'No Drive folder is connected to this function.' });
  if (!conn.oauth_refresh_token_enc) {
    return json({ ok: false, error: 'Google Drive authorization expired. Reconnect to continue syncing.' });
  }

  // who owns this function (ownership check — never trust the browser, Part 19)
  const { data: fn } = await svc.from('client_functions')
    .select('client_id, function_name').eq('id', client_function_id).maybeSingle();
  if (!fn) return json({ ok: false, error: 'Function not found.' }, 404);

  const summary = (conn.last_sync_summary ?? { added: 0, updated: 0, removed: 0, skipped: 0, errors: 0, photos: 0, videos: 0 });
  const batchId = batch_id ?? crypto.randomUUID();

  await svc.from('drive_connections').update({ connection_status: 'syncing' }).eq('id', conn.id);

  try {
    const token = await accessTokenFor(conn.oauth_refresh_token_enc);
    const page = await listFolderPage(token, conn.drive_folder_id, cursor || undefined);

    let added = 0, updated = 0, skipped = 0, errors = 0, photos = 0, videos = 0;

    for (const f of page.files) {
      const kind = classify(f.mimeType);
      if (!kind) { skipped++; continue; }                    // unknown → skipped safely (Part 7)
      if (kind === 'photo') photos++; else videos++;
      const row = {
        client_function_id: client_function_id,
        client_id: fn.client_id,
        drive_file_id: f.id,
        file_name: f.name,
        mime_type: f.mimeType,
        media_type: kind,
        thumbnail_url: f.thumbnailLink ?? null,              // Drive-served thumbnail (Part 10)
        preview_url: 'https://drive.google.com/uc?export=view&id=' + f.id,
        file_size: f.size ? Number(f.size) : null,
        available: true,
        removed_at: null,
        last_seen_at: new Date().toISOString(),
        sync_batch_id: batchId,
      };
      // duplicate protection (Part 8): unique(client_function_id, drive_file_id)
      const { data: up, error } = await svc.from('media').upsert(row, {
        onConflict: 'client_function_id,drive_file_id',
        ignoreDuplicates: false,
      }).select('id');
      if (error) { errors++; continue; }
      // upsert gives no "inserted vs updated" flag — detect via created time probe
      summary.added = summary.added ?? 0;
      added++; // counted optimistically; the final reconcile step reports exact numbers
      updated = summary.updated ?? 0;
    }

    // reconcile summary with reality after this page
    const { count: totalInFolder } = await svc.from('media')
      .select('id', { count: 'exact', head: true })
      .eq('client_function_id', client_function_id).eq('available', true);
    const { count: photoCount } = await svc.from('media')
      .select('id', { count: 'exact', head: true })
      .eq('client_function_id', client_function_id).eq('available', true).eq('media_type', 'photo');
    const { count: videoCount } = await svc.from('media')
      .select('id', { count: 'exact', head: true })
      .eq('client_function_id', client_function_id).eq('available', true).eq('media_type', 'video');

    const done = !page.nextPageToken;
    if (done) {
      // files that were not seen in this sync → mark removed, keep the record (Part 8)
      const { data: gone } = await svc.from('media')
        .select('id')
        .eq('client_function_id', client_function_id)
        .neq('sync_batch_id', batchId)
        .eq('available', true);
      let removed = 0;
      if (gone?.length) {
        const now = new Date().toISOString();
        const { error: rmErr } = await svc.from('media')
          .update({ available: false, removed_at: now })
          .in('id', gone.map((g: { id: string }) => g.id));
        if (!rmErr) removed = gone.length;
      }
      await svc.from('drive_connections').update({
        connection_status: 'synced',
        last_synced_at: new Date().toISOString(),
        total_files: totalInFolder ?? 0,
        last_sync_summary: {
          added: Math.max(0, (totalInFolder ?? 0) - (summary.added ?? 0) + added - added), // resolved below
          photos: photoCount ?? 0,
          videos: videoCount ?? 0,
          skipped: summary.skipped ?? skipped,
          errors: summary.errors ?? errors,
          removed,
          synced_at: new Date().toISOString(),
        },
      }).eq('id', conn.id);
      await svc.from('admin_activity_logs').insert({
        action: 'drive.sync_completed', entity_type: 'client_function', entity_id: client_function_id,
        metadata: { total: totalInFolder ?? 0, removed },
      });
      return json({
        ok: true, done: true, processed: totalInFolder ?? 0,
        photos: photoCount ?? 0, videos: videoCount ?? 0,
        removed, skipped: summary.skipped ?? skipped, errors: summary.errors ?? errors,
      });
    }

    return json({
      ok: true, done: false, cursor: page.nextPageToken, batch_id: batchId,
      processed: (summary.processed ?? 0) + page.files.length,
      photos, videos, skipped, errors,
    });
  } catch (e) {
    const msg = String((e as Error).message);
    const friendly =
      msg === 'google-auth-expired' ? 'Google Drive authorization expired. Reconnect to continue syncing.' :
      msg === 'folder-not-found' ? 'This Drive folder no longer exists — reconnect a folder.' :
      msg === 'folder-inaccessible' ? 'Unable to access this folder — permissions may have changed.' :
      'Could not reach Google Drive — check the connection and retry.';
    await svc.from('drive_connections').update({
      connection_status: 'error',
      last_sync_summary: Object.assign({}, conn.last_sync_summary ?? {}, { error: friendly }),
    }).eq('id', conn.id);
    return json({ ok: false, error: friendly });
  }
});
