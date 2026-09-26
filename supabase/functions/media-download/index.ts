// ============================================================
// Markipie — media-download (Phase 11, Parts 13–16, 37)
// Server-mediated download authorization.
//
// POST { access_code, media_id }
//   → re-verifies the FULL client gate + allow_download (and
//     allow_video_access for videos) BEFORE returning a direct
//     media URL. No Drive credentials, tokens or internal ids
//     ever reach the client — and download can never be used to
//     read another client's media.
// ============================================================
import { json, corsPreflight, serviceClient, rateLimit } from '../_shared/drive.ts';

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const svc = serviceClient();
  try {
    const { access_code, media_id } = await req.json();
    const code = String(access_code ?? '').trim().toUpperCase();
    if (!code || !media_id) return json({ ok: false, error: 'This download is not available.' });

    // Phase 13 hardening — per-IP throttle (20 req/min)
    const limited = await rateLimit(svc, req, 'download', 20, 60);
    if (limited) return limited;

    const { data: client } = await svc.from('clients')
      .select('id, access_code_active, payment_status, client_status')
      .eq('access_code', code).maybeSingle();
    if (!client) return json({ ok: false, error: 'This download is not available.' });

    const { data: perms } = await svc.from('client_permissions')
      .select('allow_client_access, allow_download, allow_video_access')
      .eq('client_id', client.id).maybeSingle();

    // Part 16 — the whole gate, server-side, every time
    const allowed =
      client.access_code_active !== false &&
      client.payment_status === 'received' &&
      client.client_status === 'active' &&
      perms?.allow_client_access === true &&
      perms?.allow_download === true;
    if (!allowed) return json({ ok: false, error: 'Downloads are turned off for this gallery.' });

    // the media must belong to THIS client
    const { data: media } = await svc.from('media')
      .select('id, client_id, media_type, file_name, preview_url, available')
      .eq('id', media_id).eq('client_id', client.id).eq('available', true).maybeSingle();
    if (!media) return json({ ok: false, error: 'This download is not available.' });

    // videos additionally need allow_video_access
    if (media.media_type === 'video' && perms?.allow_video_access !== true) {
      return json({ ok: false, error: 'Videos are turned off for this gallery.' });
    }

    // Direct display resource. When the project moves to signed,
    // time-boxed URLs the swap happens here only — the client
    // contract stays the same. No credentials are returned.
    return json({
      ok: true,
      url: media.preview_url,
      filename: media.file_name || 'markipie-media'
    });
  } catch (_e) {
    return json({ ok: false, error: 'Download could not be prepared — please try again.' });
  }
});
