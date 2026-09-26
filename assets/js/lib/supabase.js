/* ============================================================
   Markipie — THE single Supabase client (Phase 9)
   ------------------------------------------------------------
   One module, one client. A second client must never be created
   anywhere else — every service goes through window.MKSupabase.

   Environment flow (no build step in the current static site):
     1. window.MarkipieEnv defaults (assets/js/env.js)
     2. local overrides assets/js/env.local.js  (gitignored)
     3. when the project moves to Vite, import.meta.env
        .VITE_SUPABASE_URL / .VITE_SUPABASE_ANON_KEY plug into
        the same two names — nothing else changes.

   When Supabase is not configured the app keeps working against
   the local data layer (graceful degradation, never a crash).
   ============================================================ */
(function (global) {
  'use strict';

  var STATUS = { NOT_CONFIGURED: 'supabase-not-configured' };

  function env(name) {
    var e = global.MarkipieEnv || {};
    return (e[name] || '').trim();
  }

  function isConfigured() {
    return !!env('VITE_SUPABASE_URL') && !!env('VITE_SUPABASE_ANON_KEY');
  }

  var clientPromise = null;

  /* Lazily create the one client. supabase-js is loaded on demand
     so pages that never touch the backend pay nothing. */
  function getClient() {
    if (!isConfigured()) {
      return Promise.reject(new Error(STATUS.NOT_CONFIGURED));
    }
    if (clientPromise) return clientPromise;
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js')
      .then(function (mod) {
        var url = env('VITE_SUPABASE_URL');
        var key = env('VITE_SUPABASE_ANON_KEY');
        return mod.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        });
      })
      .catch(function (err) {
        clientPromise = null; // allow retry (e.g. transient offline)
        throw err;
      });
    return clientPromise;
  }

  /* Every service call funnels through run() for uniform errors. */
  function run(fn) {
    return getClient().then(function (client) {
      return fn(client);
    }).catch(function (err) {
      throw normaliseError(err);
    });
  }

  /* Human-readable errors — raw SQL/PostgREST messages never reach users. */
  function normaliseError(err) {
    var msg = (err && (err.message || err.error_description || err.msg)) || String(err || 'Unknown error');
    var code = (err && (err.code || err.status)) || '';
    var friendly = {
      '23505': 'This record already exists.',
      '42501': 'You do not have permission to do that.',
      '23503': 'This record is linked to other data and cannot be changed.'
    };
    if (msg.indexOf(STATUS.NOT_CONFIGURED) !== -1) {
      return { code: 'not_configured', message: 'Supabase is not connected yet — using local data.', cause: err };
    }
    if (msg.indexOf('duplicate key') !== -1 || code === '23505') {
      return { code: 'duplicate', message: 'This record already exists.', cause: err };
    }
    if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1) {
      return { code: 'network', message: 'Could not reach the server — check your connection and try again.', cause: err };
    }
    if (code === 401 || msg.indexOf('JWT') !== -1 || msg.indexOf('Invalid login') !== -1) {
      return { code: 'auth', message: 'Sign in to continue.', cause: err };
    }
    return { code: code || 'error', message: friendly[code] || 'Something went wrong — please try again.', cause: err };
  }

  global.MKSupabase = {
    isConfigured: isConfigured,
    getClient: getClient,
    run: run,
    normaliseError: normaliseError,
    STATUS: STATUS
  };
})(window);
