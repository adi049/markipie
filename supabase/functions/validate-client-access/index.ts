// ============================================================
// Markipie — validate-client-access (Phase 9, Part 18)
// ------------------------------------------------------------
// The ONLY public path to client data. Deployed as a Supabase
// Edge Function it runs with the SERVICE ROLE — the browser
// never receives a client list, other clients' codes, Drive
// credentials or vector data.
//
// Deploy:  supabase functions deploy validate-client-access
// Client:  POST { access_code }  →  minimal dashboard payload
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimit } from '../_shared/drive.ts';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    const { access_code } = await req.json();
    const code = String(access_code ?? '').trim();
    if (!code) return new Response(JSON.stringify({ ok: false }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

    // Phase 13 hardening — brute-force throttle (8 attempts/min/IP).
    // Neutral 429; the UI shows the same message as an invalid code.
    const limited = await rateLimit(admin, req, 'validate', 8, 60);
    if (limited) {
      const b = await limited.text();
      return new Response(b, { status: limited.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Service role — server-side only. Never exposed to any client.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Single-code lookup by the submitted code — never a bulk client query.
    const { data: client, error } = await admin
      .from('clients')
      .select('id, event_title, client_name, event_date, access_code_active, payment_status, client_status')
      .eq('access_code', code.toUpperCase())
      .maybeSingle();

    if (error || !client) return json({ ok: false });

    // Canonical gate: exists · payment received · active · access allowed
    const { data: perms } = await admin
      .from('client_permissions')
      .select('allow_client_access')
      .eq('client_id', client.id)
      .maybeSingle();

    const allowed =
      client.access_code_active !== false &&
      client.payment_status === 'received' &&
      client.client_status === 'active' &&
      (perms ? perms.allow_client_access === true : false);

    if (!allowed) return json({ ok: false });

    // Minimum information needed to build the event dashboard
    const { data: functions } = await admin
      .from('client_functions')
      .select('id, function_name, function_date, cover_image_url')
      .eq('client_id', client.id)
      .eq('status', 'active')
      .order('sort_order');

    const { data: permRow } = await admin
      .from('client_permissions')
      .select('allow_ai_face_search, allow_download, show_watermark, allow_video_access')
      .eq('client_id', client.id)
      .maybeSingle();

    return json({
      ok: true,
      client: {
        id: client.id,
        eventTitle: client.event_title,
        clientName: client.client_name,
        eventDate: client.event_date,
        permissions: {
          aiSearch: permRow?.allow_ai_face_search ?? false,
          download: permRow?.allow_download ?? false,
          watermark: permRow?.show_watermark ?? true,
          videos: permRow?.allow_video_access ?? true
        }
      },
      functions: functions ?? []
    });
  } catch (_e) {
    // human-neutral failure — no internals leaked
    return json({ ok: false });
  }
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
}
