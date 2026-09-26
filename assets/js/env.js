/* Markipie environment bridge. The publishable Supabase key is safe for browser use.
   Never put a service-role/secret key in frontend code. */
window.MarkipieEnv = {
  VITE_SUPABASE_URL: 'https://ihyegincfgxhzkjylogh.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_8mgucivCdcVE74eUksqpSw_ZQ1dOVoc'
};

/* Optional local override. Values are read lazily by lib/supabase.js. */
fetch('/assets/js/env.local.js', { cache: 'no-store' })
  .then(function (r) { return r.ok ? r.text() : null; })
  .then(function (code) {
    if (!code) return;
    try { (new Function(code))(); } catch (e) {}
  })
  .catch(function () {});
