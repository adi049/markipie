// ============================================================
// Markipie — client-gallery (Phase 10, Parts 11, 18, 19, 23)
// The ONLY public path to synced gallery media.
//
// POST { access_code, client_function_id, page?, type? }
//   → verifies the FULL gate: client exists + payment received +
//     status active + allow_client_access, THEN that the function
//     belongs to that client and is active — then returns only
//     that function's available media, minimal fields, no Drive
//     file ids, no internal auth data, never other clients' media.
// ============================================================
import { json, corsPreflight, serviceClient, rateLimit } from '../_shared/drive.ts';

const PER_PAGE = 60;

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const svc = serviceClient();
  try {
    const { access_code, client_function_id: fnId, page, type } = await req.json();
    const code = String(access_code ?? '').trim().toUpperCase();
    if (!code || !fnId) return json({ ok: false });

    // Phase 13 hardening — per-IP throttle (60 req/min)
    const limited = await rateLimit(svc, req, 'gallery', 60, 60);
    if (limited) return limited;

    const { data: client } = await svc.from('clients')
      .select('id, event_title, client_name, event_date, access_code_active, payment_status, client_status')
      .eq('access_code', code).maybeSingle();
    if (!client) return json({ ok: false });

    const { data: perms } = await svc.from('client_permissions')
      .select('allow_client_access, allow_ai_face_search, allow_download, show_watermark, allow_video_access')
      .eq('client_id', client.id).maybeSingle();

    // Part 18 — the whole gate, re-checked on every request
    const allowed =
      client.access_code_active !== false &&
      client.payment_status === 'received' &&
      client.client_status === 'active' &&
      (perms?.allow_client_access === true);
    if (!allowed) return json({ ok: false });

    // Part 19 — function must belong to this client and be active
    const { data: fn } = await svc.from('client_functions')
      .select('id, function_name, function_date')
      .eq('id', fnId).eq('client_id', client.id).eq('status', 'active').maybeSingle();
    if (!fn) return json({ ok: false });

    const showVideos = perms?.allow_video_access !== false;
    let q = svc.from('media')
      .select('id, file_name, media_type, thumbnail_url, preview_url, file_size')
      .eq('client_function_id', fnId)
      .eq('available', true)
      .order('file_name')
      .range(Math.max(0, ((page ?? 1) - 1)) * PER_PAGE, Math.max(0, ((page ?? 1) - 1)) * PER_PAGE + PER_PAGE - 1);
    if (type === 'photo' || type === 'video') q = q.eq('media_type', type);
    if (!showVideos) q = q.neq('media_type', 'video');

    const { data: media, count } = await q;
    let photos = 0, videos = 0;
    if (showVideos) {
      const c1 = await svc.from('media').select('id', { count: 'exact', head: true })
        .eq('client_function_id', fnId).eq('available', true).eq('media_type', 'photo');
      const c2 = await svc.from('media').select('id', { count: 'exact', head: true })
        .eq('client_function_id', fnId).eq('available', true).eq('media_type', 'video');
      photos = c1.count ?? 0; videos = c2.count ?? 0;
    } else {
      const c1 = await svc.from('media').select('id', { count: 'exact', head: true })
        .eq('client_function_id', fnId).eq('available', true).eq('media_type', 'photo');
      photos = c1.count ?? 0; videos = 0;
    }

    return json({
      ok: true,
      client: { eventTitle: client.event_title, eventDate: client.event_date },
      function: { name: fn.function_name, date: fn.function_date },
      permissions: {
        watermark: perms?.show_watermark !== false,
        download: perms?.allow_download === true,
        videos: showVideos,
        aiSearch: perms?.allow_ai_face_search === true,
      },
      counts: { photos, videos, total: photos + videos },
      media: (media ?? []).map((m) => ({
        id: m.id,                       // no drive_file_id in public payloads
        filename: m.file_name,
        media_type: m.media_type,
        thumb: m.thumbnail_url,
        src: m.preview_url,
        size: m.file_size,
      })),
      page: page ?? 1,
      hasMore: ((page ?? 1) * PER_PAGE) < (count ?? media?.length ?? 0),
    });
  } catch (_e) {
    return json({ ok: false });       // neutral failure — nothing internal leaks (Part 30)
  }
});
