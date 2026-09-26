/* ============================================================
   Markipie — clientService + permissionService (Phase 9)
   ------------------------------------------------------------
   Canonical tables: clients · client_permissions.
   Admin CRUD flows through here; public flows NEVER list clients —
   access is a single-code validation (Part 18), served by the
   validate-client-access edge function when Supabase is configured,
   local data layer otherwise (development).
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.MKServicesCore, SB = global.MKSupabase;
  /* MarkipieData resolves lazily — service files may load before data.js */
  function MD() { return global.MarkipieData; }
  if (!C || !SB) return;

  var T = 'clients';
  var COLS = { clientId: 'id', clientName: 'client_name', eventTitle: 'event_title', contactNumber: 'contact_number', eventDate: 'event_date', accessCode: 'access_code', paymentStatus: 'payment_status', clientStatus: 'client_status' };

  var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
  function makeCode(eventTitle) {
    var initials = String(eventTitle || 'MKPI').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    while (initials.length < 3) initials += 'X';
    var suffix = '';
    for (var i = 0; i < 4; i++) suffix += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    return 'MP-' + initials + '-' + new Date().getFullYear() + '-' + suffix;
  }

  function validateCreate(input) {
    return C.V.first([
      C.V.required(input.clientName, 'Client Name'),
      C.V.required(input.eventTitle, 'Event / Wedding Name'),
      C.V.maxLen(input.contactNumber, 24, 'Contact Number'),
      C.V.oneOf(input.paymentStatus, ['pending', 'received'], 'Payment Status'),
      C.V.oneOf(input.clientStatus, ['inactive', 'active', 'suspended', 'archived'], 'Client Status')
    ]);
  }

  var clients = {
    /* ---- admin CRUD ---- */
    list: function () {
      return C.remoteFirst(
        function () {
          return SB.run(function (db) {
            return db.from(T).select('*').order('created_at', { ascending: false });
          }).then(function (r) {
            if (!r.ok) return r;
            return C.ok(r.data.map(function (row) { return C.toCamel(row, COLS); }));
          });
        },
        function () { return MD().clients.list().then(function (list) { return C.ok(list); }); }
      );
    },
    get: function (id) {
      return C.remoteFirst(
        function () {
          return SB.run(function (db) { return db.from(T).select('*').eq('id', id).maybeSingle(); })
            .then(function (r) { return r.ok ? C.ok(r.data ? C.toCamel(r.data, COLS) : null) : r; });
        },
        function () { return MD().clients.get(id).then(function (c) { return C.ok(c); }); }
      );
    },
    create: function (input) {
      var err = validateCreate(input);
      if (err) return Promise.resolve(C.fail(err));
      var row = {
        client_name: input.clientName, event_title: input.eventTitle,
        contact_number: input.contactNumber || null, event_date: input.eventDate || null,
        access_code: input.accessCode || makeCode(input.eventTitle),
        payment_status: input.paymentStatus || 'pending',
        client_status: input.clientStatus || 'inactive'
      };
      return SB.run(function (db) {
        return db.from(T).insert(row).select('*').single();
      }).then(function (r) {
        if (!r.ok) return r;
        return C.ok(C.toCamel(r.data, COLS));
      });
    },
    update: function (id, patch) {
      return SB.run(function (db) {
        return db.from(T).update(C.toSnake(patch, COLS)).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(C.toCamel(r.data, COLS)) : r; });
    },
    remove: function (id) {
      return SB.run(function (db) { return db.from(T).delete().eq('id', id); }).then(C.ok);
    },
    setPayment: function (id, status) {
      if (['pending', 'received'].indexOf(status) === -1) return Promise.resolve(C.fail('"Payment Status" must be pending or received.'));
      return clients.update(id, { paymentStatus: status });
    },
    setStatus: function (id, status) {
      if (['inactive', 'active', 'suspended', 'archived'].indexOf(status) === -1) return Promise.resolve(C.fail('"Client Status" is not valid.'));
      return clients.update(id, { clientStatus: status });
    },
    regenerateCode: function (id, eventTitle) {
      return clients.update(id, { accessCode: makeCode(eventTitle) });
    },
    deactivateCode: function (id) {
      return SB.run(function (db) {
        return db.from(T).update({ access_code_active: false }).eq('id', id);
      }).then(C.ok);
    },

    /* ---- SECURE client access (Part 18) ----
       Remote: validate-client-access edge function (service role).
       The browser never receives a client list, codes or Drive ids. */
    validateAccess: function (accessCode) {
      var code = String(accessCode || '').trim();
      if (!code) return Promise.resolve({ ok: false });
      if (SB.isConfigured()) {
        var url = (window.MarkipieEnv.VITE_SUPABASE_URL || '').replace(/\/$/, '') +
          '/functions/v1/validate-client-access';
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': window.MarkipieEnv.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ access_code: code })
        }).then(function (res) { return res.json(); }).then(function (res) {
          /* normalise to the same minimal shape the dev fallback returns */
          if (res && res.ok && res.client) {
            try { sessionStorage.setItem('mk_client_code', code); } catch (e) {}
            return { ok: true, clientId: res.client.id, eventTitle: res.client.eventTitle, functions: res.functions || [] };
          }
          return { ok: false };
        }).catch(function () { return { ok: false }; });
      }
      /* development fallback — same minimal response shape */
      return MD().clients.validate(code).then(function (res) {
        if (res && res.ok) {
          try { sessionStorage.setItem('mk_client_code', code); } catch (e) {}
        }
        return res;
      });
    },

    /* ---- dashboard counters helper ---- */
    counters: function () {
      return SB.run(function (db) {
        return db.from(T).select('id,client_status,payment_status');
      }).then(function (r) {
        if (!r.ok) return r;
        var rows = r.data || [];
        return C.ok({
          totalClients: rows.length,
          activeClients: rows.filter(function (x) { return x.client_status === 'active' && x.payment_status === 'received'; }).length
        });
      });
    }
  };

  /* ================= permissions (one row per client) ================= */
  var PERM_COLS = { clientId: 'client_id', allowClientAccess: 'allow_client_access', allowAiFaceSearch: 'allow_ai_face_search', allowDownload: 'allow_download', showWatermark: 'show_watermark', allowVideoAccess: 'allow_video_access' };

  var permissions = {
    getForClient: function (clientId) {
      return SB.run(function (db) {
        return db.from('client_permissions').select('*').eq('client_id', clientId).maybeSingle();
      }).then(function (r) { return r.ok ? C.ok(r.data ? C.toCamel(r.data, PERM_COLS) : null) : r; });
    },
    /* exactly one row per client — upsert on the unique client_id */
    updateForClient: function (clientId, perms) {
      var err = C.V.required(clientId, 'Client');
      if (err) return Promise.resolve(C.fail(err));
      var row = C.toSnake(Object.assign({ clientId: clientId }, perms), PERM_COLS);
      return SB.run(function (db) {
        return db.from('client_permissions').upsert(row, { onConflict: 'client_id' }).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(C.toCamel(r.data, PERM_COLS)) : r; });
    }
  };

  global.MKServices = global.MKServices || {};
  global.MKServices.clients = clients;
  global.MKServices.permissions = permissions;
})(window);
