/* ============================================================
   Markipie — galleryService (Phase 10)
   ------------------------------------------------------------
   When Supabase is configured and a client code has been
   validated, the client gallery reads synced media through the
   secure client-gallery edge function (Part 18/19: full gate
   re-checked server-side, only that client's media, minimal
   fields, no Drive file ids). Otherwise the local data layer
   serves the demo galleries unchanged.
   ============================================================ */
(function (global) {
  'use strict';
  var SB = global.MKSupabase;
  if (!SB) return;

  /* lazy — this file may load before data.js */
  function MD() { return global.MarkipieData; }

  var CODE_KEY = 'mk_client_code';

  function code() {
    try { return sessionStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
  }
  function rememberCode(c) {
    try { sessionStorage.setItem(CODE_KEY, String(c || '')); } catch (e) {}
  }

  var gallery = {
    rememberCode: rememberCode,
    hasCode: function () { return !!code(); },
    /* current client session code — the only client-side credential;
       cleared on sign-out and when the tab closes (Part 25) */
    code: code,
    signOut: function () {
      try { sessionStorage.removeItem(CODE_KEY); } catch (e) {}
      /* no gallery media is ever persisted — nothing else to clear */
    },
    /* session validation (Parts 26–27): when Supabase is configured the
       backend re-verifies the code on every request; locally the code
       must validate for THIS client id through the data layer */
    validateSession: function (clientId) {
      var c = code();
      if (!c || !clientId) return Promise.resolve(false);
      if (SB.isConfigured()) return Promise.resolve(true);
      return MD().clients.validate(c).then(function (res) {
        return !!(res && res.ok && res.clientId === clientId);
      }).catch(function () { return false; });
    },

    /* Activates the edge-backed media source when appropriate. */
    activate: function () {
      if (!SB.isConfigured() || !code()) return false;
      var D = global.MarkipieData;
      if (!D || !D.media) return false;
      D.media.setSource({
        list: function (fid, page, perPage, type) {
          return SB.run(function (db) {
            return db.functions.invoke('client-gallery', {
              body: { access_code: code(), client_function_id: fid, page: page, type: type }
            }).then(function (r) {
              if (r.error) throw r.error;
              return r.data;
            });
          }).then(function (r) {
            if (!r.ok) return { items: [], page: page, hasMore: false, total: 0 };
            return { items: r.media || [], page: page, hasMore: !!r.hasMore, total: r.counts ? r.counts.total : 0 };
          });
        },
        counts: function (fid) {
          return SB.run(function (db) {
            return db.functions.invoke('client-gallery', {
              body: { access_code: code(), client_function_id: fid, page: 1 }
            }).then(function (r) {
              if (r.error) throw r.error;
              return r.data;
            });
          }).then(function (r) {
            return r.ok ? (r.counts || { photos: 0, videos: 0, total: 0 }) : { photos: 0, videos: 0, total: 0 };
          });
        }
      });
      return true;
    },

    /* ============================================================
       PHASE 12 — face search bridge. The ONLY credential sent to
       the backend is the session access code; descriptors are the
       only biometric-derived data that ever travels — images are
       never uploaded. Local/demo mode searches the on-device index.
       ============================================================ */
    faceSearch: function (descriptor, opts) {
      opts = opts || {};
      if (!descriptor) return Promise.resolve({ ok: false, reason: 'no-descriptor' });
      var cid = opts.clientId || '';
      if (SB.isConfigured() && code()) {
        /* configured mode: the access code IS the scope — the backend
           matches only against that client's own embeddings */
        var cfg = global.MarkipieFaceConfig || {};
        return SB.run(function (db) {
          return db.functions.invoke('face-embeddings', {
            body: { access_code: code(), op: 'search', embedding: Array.prototype.slice.call(descriptor),
                    threshold: cfg.faceMatchThreshold, count: cfg.faceMatchCount }
          });
        }).then(function (r) {
          if (r.error) throw r.error;
          var d = r.data || {};
          if (!d.ok) return { ok: false, reason: 'not-allowed' };
          var seen = {}, unique = [];
          (d.matches || []).forEach(function (m) {
            if (seen[m.mediaId]) return;
            seen[m.mediaId] = 1;
            unique.push({ fnId: m.fnId, functionName: m.functionName, mediaId: m.mediaId, thumb: m.thumb, src: m.src, distance: m.distance });
          });
          return { ok: true, matches: unique, scanned: unique.length, pending: d.pending === true };
        }).catch(function () { return { ok: false, reason: 'search-failed' }; });
      }
      if (!cid) return Promise.resolve({ ok: false, reason: 'unscoped' });
      /* local mode: the caller-provided client id is NEVER trusted —
         the session code must validate for that exact client first */
      return gallery.validateSession(cid).then(function (ok) {
        if (!ok) return { ok: false, reason: 'unscoped' };
        return global.MarkipieFace.searchLocal(descriptor, cid).then(function (res) {
          if (!res || !res.ok || !res.matches || !res.matches.length) return res;
          /* function-level AI (spec §21): effective = client ON AND
             function ON — AI-off functions are excluded from results */
          var D = global.MarkipieData;
          return D.functions.forClient(cid).then(function (fns) {
            var off = {};
            (fns || []).forEach(function (f) { if (f.aiFaceSearch === false) off[f.id] = 1; });
            res.matches = res.matches.filter(function (m) { return !off[m.fnId]; });
            return res;
          });
        });
      });
    },

    /* Configured mode: store descriptors computed on this device for
       this client's own photos (batched ≤200; safe to call repeatedly —
       the backend replaces a photo's rows before writing new ones). */
    faceIndexUpload: function (fnId, embeddings) {
      if (!SB.isConfigured() || !code() || !fnId || !embeddings || !embeddings.length) {
        return Promise.resolve({ ok: false, reason: 'local-mode' });
      }
      return SB.run(function (db) {
        return db.functions.invoke('face-embeddings', {
          body: { access_code: code(), op: 'upsert', client_function_id: fnId, embeddings: embeddings }
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || { ok: false };
      }).catch(function () { return { ok: false, reason: 'upload-failed' }; });
    }
  };

  global.MKGallery = gallery;
})(window);
