// ============================================================
// Markipie — drive-oauth-start (Phase 10, Part 1–2)
// Admin-only: returns the Google consent URL. The client secret
// never appears here or in any browser payload.
// POST { client_function_id }  →  { url }
// ============================================================
import { GOOGLE_AUTH_URL, DRIVE_SCOPE, requireEnv, json, corsPreflight, requireAdmin, rateLimit } from '../_shared/drive.ts';

Deno.serve(async (req) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ ok: false, error: 'Sign in to continue.' }, 401);

  // Phase 13 hardening — consent-flow throttle (10/min per IP)
  const limited = await rateLimit(admin.svc, req, 'oauth-start', 10, 60);
  if (limited) return limited;

  const { client_function_id } = await req.json();
  if (!client_function_id) return json({ ok: false, error: 'Missing function.' }, 400);

  const state = crypto.getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');

  // short-lived state → function binding (Part 19: never trust the browser)
  await admin.svc.from('admin_activity_logs').insert({
    admin_user_id: admin.userId, action: 'drive.oauth_started',
    entity_type: 'client_function', entity_id: client_function_id,
    metadata: { state }, // nonce only — no secrets in logs
  });

  const url = GOOGLE_AUTH_URL + '?' + new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',      // refresh token for later syncs
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: state + '.' + client_function_id,
  });
  return json({ ok: true, url });
});
