// ============================================================
// Markipie — face-embeddings (Phase 12, spec §10–§12/§21)
// The ONLY public path to the face index (canonical
// `face_embeddings` table). Matching runs through the secure
// match_face_embeddings() RPC (005_face_search.sql) — the browser
// can never query the table directly and never sees an embedding.
//
// POST { access_code, op, ... }
//   op 'search'  { embedding: number[128] }
//     → re-checks the FULL gate (code active + payment received +
//       status active + allow_client_access + allow_ai_face_search),
//       then matches the descriptor against THAT CLIENT'S OWN
//       embeddings only. Photos only, by construction (the table
//       trigger rejects non-photo media).
//   op 'upsert'  { client_function_id, embeddings: [{media_id,
//                  face_index, embedding}] }
//     → stores descriptors computed ON THE VISITOR'S DEVICE for
//       that client's own photos. Batch-capped; re-indexing a
//       photo replaces its previous rows.
//
// Privacy contract: images are NEVER uploaded here — only
// 128-number descriptors. Camera frames never leave the device.
// No RPC/schema additions: distance is computed in-function so
// the canonical migration stays untouched (ivfflat remains a
// scale-up option documented in 002_face_embeddings.sql).
// ============================================================
import { json, corsPreflight, serviceClient, rateLimit } from '../_shared/drive.ts';

const MAX_BATCH = 200;        // embeddings per upsert call (resumable)
const MAX_SCAN_ROWS = 20000;  // client-scoped scan ceiling per search
// FACE_MATCH_THRESHOLD / FACE_MATCH_COUNT are configurable (spec §12)
const THRESHOLD = Number(Deno.env.get('FACE_MATCH_THRESHOLD') ?? '') || 0.5;
const MATCH_COUNT = Math.min(500, Math.max(1, Number(Deno.env.get('FACE_MATCH_COUNT') ?? '') || 60));

function toVec(v) {
  if (!Array.isArray(v) || v.length !== 128) return null;
  const out = new Array(128);
  for (let i = 0; i < 128; i++) {
    const x = Number(v[i]);
    if (!Number.isFinite(x)) return null;
    out[i] = x;
  }
  return out;
}

function l2(a, b) {
  let s = 0;
  for (let i = 0; i < 128; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const svc = serviceClient();
  try {
    const body = await req.json();
    const access_code = String(body.access_code ?? '').trim().toUpperCase();
    const op = body.op === 'upsert' || body.op === 'search' ? body.op : '';
    if (!access_code || !op) return json({ ok: false });

    // Phase 13 hardening — per-IP throttle (search 30/min, uploads 10/min)
    const limited = await rateLimit(svc, req, 'face-' + op, op === 'search' ? 30 : 10, 60);
    if (limited) return limited;

    // ---- FULL gate, re-checked on every request (Parts 18/23) ----
    const { data: client } = await svc.from('clients')
      .select('id, access_code_active, payment_status, client_status')
      .eq('access_code', access_code).maybeSingle();
    if (!client) return json({ ok: false });

    const { data: perms } = await svc.from('client_permissions')
      .select('allow_client_access, allow_ai_face_search')
      .eq('client_id', client.id).maybeSingle();

    const allowed =
      client.access_code_active !== false &&
      client.payment_status === 'received' &&
      client.client_status === 'active' &&
      perms?.allow_client_access === true &&
      perms?.allow_ai_face_search === true;      // AI search is opt-in per client
    if (!allowed) return json({ ok: false });

    // ---------------- SEARCH ----------------
    if (op === 'search') {
      const q = toVec(body.embedding);
      if (!q) return json({ ok: false });
      // per-request threshold/count (spec §12) — clamped to safe ranges
      const reqThreshold = Number(body.threshold);
      const reqCount = Number(body.count);
      const threshold = Number.isFinite(reqThreshold) && reqThreshold > 0 && reqThreshold < 1.2 ? reqThreshold : THRESHOLD;
      const matchCount = Number.isFinite(reqCount) && reqCount >= 1 ? Math.min(500, Math.round(reqCount)) : MATCH_COUNT;

      // indexing-incomplete notice (spec §27): an open job means
      // results may grow — the UI says so honestly
      const { data: openJob } = await svc.from('indexing_jobs')
        .select('id').eq('client_id', client.id)
        .in('status', ['queued', 'processing']).limit(1).maybeSingle();
      const pending = !!openJob;

      // secure RPC (005_face_search.sql): scoped to THIS client,
      // photos only, active + AI-enabled functions only; returns
      // media_id / client_function_id / similarity — never embeddings
      let rows = null;
      try {
        const { data: rpcRows, error: rpcErr } = await svc.rpc('match_face_embeddings', {
          query_embedding: q,
          authorized_client_id: client.id,
          optional_function_id: null,
          match_threshold: threshold,
          match_count: matchCount,
        });
        if (!rpcErr && rpcRows) rows = rpcRows.map((r) => ({ media_id: r.media_id, client_function_id: r.client_function_id, distance: Math.round((1 - r.similarity) * 1000) / 1000 }));
      } catch (_e) { /* fall back to in-function matching */ }

      if (!rows) {
        // fallback: same gate semantics, computed in-function
        const { data: embRows } = await svc.from('face_embeddings')
          .select('media_id, client_function_id, embedding')
          .eq('client_id', client.id)
          .limit(MAX_SCAN_ROWS);
        const matches = [];
        for (const r of embRows ?? []) {
          const v = toVec(typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding);
          if (!v) continue;
          const d = l2(q, v);
          if (d <= THRESHOLD) matches.push({ media_id: r.media_id, client_function_id: r.client_function_id, distance: Math.round(d * 1000) / 1000 });
        }
        matches.sort((a, b) => a.distance - b.distance);
        rows = matches;
      }

      // minimal media fields for the winners — no Drive ids, no internals
      const top = rows.slice(0, matchCount);
      const mediaIds = [...new Set(top.map((m) => m.media_id))];
      const byId = {};
      if (mediaIds.length) {
        const { data: media } = await svc.from('media')
          .select('id, file_name, media_type, thumbnail_url, preview_url, client_function_id')
          .in('id', mediaIds).eq('available', true).eq('media_type', 'photo');
        for (const m of media ?? []) byId[m.id] = m;
      }

      const fnIds = [...new Set(top.map((m) => m.client_function_id))];
      const fnById = {};
      if (fnIds.length) {
        const { data: fns } = await svc.from('client_functions')
          .select('id, function_name, function_date, ai_face_search')
          .in('id', fnIds).eq('client_id', client.id).eq('status', 'active');
        for (const f of fns ?? []) fnById[f.id] = f;
      }

      return json({
        ok: true,
        pending,
        matches: top
          .filter((m) => byId[m.media_id] && fnById[m.client_function_id] && fnById[m.client_function_id].ai_face_search !== false)
          .map((m) => ({
            mediaId: m.media_id,
            fnId: m.client_function_id,
            functionName: fnById[m.client_function_id].function_name,
            distance: m.distance,
            similarity: Math.round((1 - m.distance) * 1000) / 1000,
            thumb: byId[m.media_id].thumbnail_url,
            src: byId[m.media_id].preview_url,
          })),
      });
    }

    // ---------------- UPSERT ----------------
    const fnId = String(body.client_function_id ?? '');
    const batch = Array.isArray(body.embeddings) ? body.embeddings.slice(0, MAX_BATCH) : [];
    if (!fnId || !batch.length) return json({ ok: false });

    // function must belong to THIS client and be active
    const { data: fn } = await svc.from('client_functions')
      .select('id').eq('id', fnId).eq('client_id', client.id).eq('status', 'active').maybeSingle();
    if (!fn) return json({ ok: false });

    // every media row must belong to this function AND be a photo —
    // videos are never embedded (the table trigger enforces this too)
    const mediaIds = [...new Set(batch.map((b) => String(b.media_id ?? '')))].filter(Boolean);
    if (!mediaIds.length || mediaIds.length > MAX_BATCH) return json({ ok: false });
    const { data: mediaRows } = await svc.from('media')
      .select('id, media_type').in('id', mediaIds).eq('client_function_id', fnId).eq('available', true);
    const okMedia = new Set((mediaRows ?? []).filter((m) => m.media_type === 'photo').map((m) => m.id));

    let written = 0;
    for (const mid of mediaIds) {
      if (!okMedia.has(mid)) continue;
      const rows = [];
      for (const b of batch) {
        if (String(b.media_id ?? '') !== mid) continue;
        const v = toVec(b.embedding);
        if (!v) continue;
        rows.push({
          media_id: mid,
          client_id: client.id,
          client_function_id: fnId,
          embedding: v,
          face_index: Math.max(0, Math.min(15, Number(b.face_index) || 0)),
        });
      }
      if (!rows.length) continue;
      await svc.from('face_embeddings').delete().eq('media_id', mid);
      const { error } = await svc.from('face_embeddings').insert(rows);
      if (!error) written += rows.length;
    }
    return json({ ok: true, written });
  } catch (_e) {
    return json({ ok: false });       // neutral failure — nothing internal leaks
  }
});
