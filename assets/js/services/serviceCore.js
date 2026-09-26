/* ============================================================
   Markipie — service layer core (Phase 9)
   ------------------------------------------------------------
   Shared plumbing for every MKServices.* module:
     · uniform result shape  { ok, data, error, empty }
     · validation before any database call
     · human-readable errors (raw SQL never reaches users)
     · remote-first with graceful local fallback
   UI components NEVER write Supabase queries — they call services.
   ============================================================ */
(function (global) {
  'use strict';

  function ok(data, meta) {
    return Object.assign({ ok: true, data: data, error: null, empty: data == null ||
      (Array.isArray(data) && !data.length) }, meta || {});
  }
  function fail(error, data) {
    return { ok: false, data: data === undefined ? null : data, error: error, empty: false };
  }
  function empty() { return { ok: true, data: [], error: null, empty: true }; }

  function humanise(err) {
    if (!err) return 'Something went wrong — please try again.';
    if (typeof err === 'string') return err;
    if (err.message === 'supabase-not-configured') return 'Supabase is not connected — using local data.';
    if (err.code === '23505' || /duplicate key/i.test(err.message || '')) return 'This record already exists.';
    if (err.code === '42501') return 'You do not have permission to do that.';
    if (/failed to fetch|networkerror/i.test(err.message || '')) return 'Could not reach the server — check your connection and try again.';
    if (err.code === 400 && /invalid login/i.test(err.message || '')) return 'Invalid Admin ID or password.';
    return 'Something went wrong — please try again.';
  }

  /* wrap a remote call → {ok,...} with human error text */
  function fromRemote(promise) {
    return promise.then(function (data) { return ok(data); })
      .catch(function (err) { return fail(humanise(err)); });
  }

  /* remote-first helper: try MKSupabase; if unconfigured/failing run localFn */
  function remoteFirst(remoteFn, localFn) {
    var SB = global.MKSupabase;
    if (!SB || !SB.isConfigured()) return Promise.resolve(localFn ? localFn() : fail('Supabase is not connected — using local data.'));
    return remoteFn().then(function (r) {
      if (r && r.ok) return r;
      var local = localFn ? localFn() : null;
      return local || r;
    }).catch(function () {
      return localFn ? localFn() : fail('Supabase request failed.');
    });
  }

  /* -------- validation (Part 24) -------- */
  var V = {
    required: function (val, label) {
      if (val == null || String(val).trim() === '') return '"' + label + '" is required.';
      return null;
    },
    maxLen: function (val, n, label) {
      if (val && String(val).length > n) return '"' + label + '" must be ' + n + ' characters or fewer.';
      return null;
    },
    number: function (val, label) {
      if (val === '' || val == null || isNaN(Number(val))) return '"' + label + '" must be a number.';
      return null;
    },
    oneOf: function (val, options, label) {
      if (options.indexOf(val) === -1) return '"' + label + '" must be one of: ' + options.join(', ');
      return null;
    },
    first: function (errs) {
      for (var i = 0; i < errs.length; i++) if (errs[i]) return errs[i];
      return null;
    }
  };

  /* snake_case ↔ camelCase mapping for canonical tables */
  function toSnake(obj, map) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      out[(map && map[k]) || k.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); })] = obj[k];
    });
    return out;
  }
  function toCamel(row, map) {
    var out = {};
    Object.keys(row || {}).forEach(function (k) {
      out[(map && map[k]) || k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); })] = row[k];
    });
    return out;
  }

  global.MKServicesCore = {
    ok: ok, fail: fail, empty: empty,
    humanise: humanise, fromRemote: fromRemote, remoteFirst: remoteFirst,
    V: V, toSnake: toSnake, toCamel: toCamel
  };
})(window);
