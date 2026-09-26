// ============================================================
// Markipie — drive-oauth-callback (Phase 10, Part 2 · hardened Phase 13)
// Google redirects here with ?code&state. The code is exchanged
// SERVER-SIDE; the refresh token is encrypted and stored on the
// canonical drive_connections row. The browser never receives any
// token.
//
// Phase 13 hardening:
//  · the state nonce is validated server-side — it must match a
//    consent flow started for THIS function within the last 15
//    minutes, and each nonce can complete exactly once (replay
//    and forged-state protection);
//  · the popup finishes with a tiny HTML page that posts
//    'mk-drive-auth-done' to the opener and closes itself — the
//    admin picker continues automatically; a fallback message
//    shows if the popup was opened without an opener.
// ============================================================
import { GOOGLE_TOKEN_URL, requireEnv, serviceClient, encryptToken } from '../_shared/drive.ts';

function html(ok: boolean, msg: string) {
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Drive authorization — Markipie</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #f7f9fa; color: #0B2530;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 10px 34px rgba(11,37,48,.12);
          padding: 34px 38px; max-width: 380px; text-align: center; }
  .dot { width: 46px; height: 46px; border-radius: 50%; margin: 0 auto 14px;
         display: flex; align-items: center; justify-content: center; font-size: 22px; }
  .ok { background: rgba(0,195,137,.12); } .bad { background: rgba(255,79,130,.12); }
  b { font-size: 16px; } p { font-size: 13.5px; color: #5b6b74; margin: 8px 0 0; }
  button { margin-top: 16px; border: 0; background: #0B2530; color: #fff; border-radius: 999px;
           padding: 9px 22px; font-size: 13px; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
  <div class="card">
    <div class="dot ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '!'}</div>
    <b>${ok ? 'Google Drive authorized' : 'Authorization did not complete'}</b>
    <p>${msg}</p>
    <button onclick="window.close()">Close this window</button>
  </div>
  <script>
    // handshake the admin picker listens for — then close (Phase 13)
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage('mk-drive-auth-done', window.location.origin);
      }
    } catch (_e) { /* opener gone — the fallback message stands */ }
    setTimeout(function () { try { window.close(); } catch (_e) {} }, 400);
  </script>
</body>
</html>`;
  return new Response(page, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  const denied = url.searchParams.get('error'); // admin clicked "Cancel" (Part 21)

  if (denied) return html(false, 'Google Drive authorization was cancelled — you can start again any time.');
  if (!code || !state.includes('.')) return html(false, 'Invalid authorization response — start again from Markipie.');

  const [nonce, functionId] = state.split('.');

  const svc = serviceClient();
  try {
    // ---- Phase 13: the nonce must exist, be recent, bound to THIS
    // function, and never have completed before (single use) ----
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: started } = await svc.from('admin_activity_logs')
      .select('id').eq('action', 'drive.oauth_started').eq('entity_id', functionId)
      .contains('metadata', { state })
      .gte('created_at', since).limit(1).maybeSingle();
    if (!started) return html(false, 'This authorization link has expired — start again from Markipie.');

    const { data: reused } = await svc.from('admin_activity_logs')
      .select('id').eq('action', 'drive.oauth_completed').contains('metadata', { state })
      .limit(1).maybeSingle();
    if (reused) return html(false, 'This authorization was already used — start again from Markipie.');

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: requireEnv('GOOGLE_CLIENT_ID'),
        client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await res.json();
    if (!res.ok || !tokens.refresh_token) return html(false, 'Google did not grant offline access — try again.');

    const { data: emailRow } = await svc.from('drive_connections')
      .select('id').eq('client_function_id', functionId).maybeSingle();

    const row = {
      client_function_id: functionId,
      oauth_refresh_token_enc: await encryptToken(tokens.refresh_token),
      oauth_scope: tokens.scope ?? null,
      oauth_email: tokens.id_token ? JSON.parse(atob(tokens.id_token.split('.')[1])).email ?? null : null,
      // folder not chosen yet — CONNECTED only after the admin picks one (Part 2)
      connection_status: 'not_connected',
    };
    const q = emailRow
      ? svc.from('drive_connections').update(row).eq('id', emailRow.id)
      : svc.from('drive_connections').insert(row);
    const { error } = await q;
    if (error) return html(false, 'Could not save the Drive connection.');

    await svc.from('admin_activity_logs').insert({
      action: 'drive.oauth_completed', entity_type: 'client_function', entity_id: functionId,
      metadata: { scope: tokens.scope ?? '', state },  // state consumed here — replay-proof
    });
    return html(true, 'You can close this window — continue in Markipie to choose the folder.');
  } catch (_e) {
    return html(false, 'Google Drive authorization failed — please retry.');
  }
});
