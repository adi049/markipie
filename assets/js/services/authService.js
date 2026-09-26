/* ============================================================
   Markipie — authService (Phase 9)
   ------------------------------------------------------------
   Admin authentication through SUPABASE AUTH (canonical).
   · The local markipie/website dev credentials remain ONLY as an
     offline-development fallback when Supabase is not configured —
     never the production mechanism.
   · After Supabase login the existing admin_profiles row (role=admin,
     is_active) is verified. Login NEVER creates/promotes an admin profile.
   · Gates the admin routes: /admin/dashboard /admin/clients
     /admin/blogs /admin/services /admin/settings → /admin.
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.MKServicesCore, SB = global.MKSupabase;
  if (!C) return;

  var PROFILE = 'admin_profiles';
  var GATED = [
    '/admin/dashboard', '/admin/clients', '/admin/clients/add', '/admin/clients/client',
    '/admin/blogs', '/admin/blogs/editor', '/admin/services', '/admin/marketing',
    '/admin/activity', '/admin/settings'
  ];

  function mode() { return SB && SB.isConfigured() ? 'supabase' : 'local'; }

  function ensureProfile(client, user) {
    return client.from(PROFILE).select('*').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data) {
          var missing = new Error('This account is not registered as an admin.');
          missing.code = 403;
          throw missing;
        }
        if (!res.data.is_active || res.data.role !== 'admin') {
          var e = new Error('This account is not an active admin.');
          e.code = 403;
          throw e;
        }
        return res.data;
      });
  }

  function loginSupabase(email, password) {
    return SB.run(function (client) {
      return client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          return ensureProfile(client, res.data.user).then(function (profile) {
            return { user: res.data.user, profile: profile };
          });
        });
    });
  }

  function login(user, password) {
    if (mode() === 'supabase') {
      return loginSupabase(user, password).then(function (r) {
        if (r.ok) return { ok: true, mode: 'supabase', user: r.data.user, profile: r.data.profile };
        return { ok: false, error: r.error };
      });
    }
    /* offline development fallback (never the production path) */
    return global.MarkipieData.auth.login(user, password).then(function (res) {
      return res.ok ? { ok: true, mode: 'local' } : res;
    });
  }

  function getSession() {
    if (mode() !== 'supabase') return Promise.resolve(null);
    return SB.run(function (client) { return client.auth.getSession(); })
      .then(function (r) { return r.ok ? r.data : null; })
      .catch(function () { return null; });
  }

  function logout() {
    if (mode() !== 'supabase') return Promise.resolve();
    return SB.run(function (client) { return client.auth.signOut(); }).catch(function () {});
  }

  function isGated(path) {
    return GATED.some(function (g) { return path.indexOf(g) === 0; });
  }

  /* route gate — runs on load; redirects unauthenticated admin access */
  function gate() {
    if (mode() !== 'supabase') return Promise.resolve('local');
    var path = location.pathname;
    if (!isGated(path)) return Promise.resolve('public');
    return getSession().then(function (session) {
      if (!session) { location.replace('/admin/'); return 'redirected'; }
      return 'authed';
    });
  }

  global.MKServices = global.MKServices || {};
  global.MKServices.auth = {
    mode: mode, login: login, logout: logout, getSession: getSession,
    gate: gate, GATED: GATED, ensureProfile: mode() === 'supabase' ? undefined : undefined
  };
  global.MKServices.auth.gate();
})(window);
