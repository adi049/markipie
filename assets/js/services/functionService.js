/* ============================================================
   Markipie — functionService (Phase 9)
   Canonical tables: client_functions · drive_connections.
   Functions/events are dynamic (Haldi, Mehendi, Wedding…) —
   created by the admin, never hardcoded records.
   Drive connection stores folder metadata only (Part 28).
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.MKServicesCore, SB = global.MKSupabase;
  if (!C || !SB) return;

  var FN_COLS = { clientId: 'client_id', functionName: 'function_name', functionDate: 'function_date', coverImageUrl: 'cover_image_url', sortOrder: 'sort_order', status: 'status', aiFaceSearch: 'ai_face_search' };
  var DRV_COLS = { clientFunctionId: 'client_function_id', driveFolderId: 'drive_folder_id', driveFolderUrl: 'drive_folder_url', folderName: 'folder_name', connectionStatus: 'connection_status', lastSyncedAt: 'last_synced_at' };

  var functions = {
    listForClient: function (clientId, opts) {
      var admin = !!(opts && opts.admin);
      return SB.run(function (db) {
        var q = db.from('client_functions').select('*').eq('client_id', clientId).order('sort_order');
        if (!admin) q = q.eq('status', 'active');
        return q;
      }).then(function (r) { return r.ok ? C.ok(r.data.map(function (x) { return C.toCamel(x, FN_COLS); })) : r; });
    },
    create: function (input) {
      var err = C.V.first([
        C.V.required(input.clientId, 'Client'),
        C.V.required(input.functionName, 'Function Name')
      ]);
      if (err) return Promise.resolve(C.fail(err));
      return SB.run(function (db) {
        return db.from('client_functions').insert(C.toSnake(input, FN_COLS)).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(C.toCamel(r.data, FN_COLS)) : r; });
    },
    update: function (id, patch) {
      return SB.run(function (db) {
        return db.from('client_functions').update(C.toSnake(patch, FN_COLS)).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(C.toCamel(r.data, FN_COLS)) : r; });
    },
    remove: function (id) {
      return SB.run(function (db) { return db.from('client_functions').delete().eq('id', id); }).then(C.ok);
    },
    /* status: 'active' | 'inactive' */
    setStatus: function (id, status) {
      if (['active', 'inactive'].indexOf(status) === -1) return Promise.resolve(C.fail('"Status" must be active or inactive.'));
      return functions.update(id, { status: status });
    },

    /* ---- Drive connection metadata (one row per function) ---- */
    getDriveConnection: function (clientFunctionId) {
      /* Phase 13: reads go through the admin-gated edge function —
         drive_connections is admin-only under RLS */
      return SB.run(function (db) {
        return db.functions.invoke('drive-conn-admin', {
          body: { op: 'get', client_function_id: clientFunctionId }
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      }).then(function (r) {
        if (!r.ok) return C.fail(r.error || 'Could not load the Drive connection.');
        return C.ok(r.connection ? C.toCamel(r.connection, DRV_COLS) : null);
      }).catch(function (e) { return C.fail(e && e.message ? e.message : 'Could not load the Drive connection.'); });
    },
    setDriveConnection: function (clientFunctionId, data) {
      var STATUSES = ['not_connected', 'connected', 'syncing', 'synced', 'error'];
      var err = C.V.first([
        C.V.required(clientFunctionId, 'Function'),
        C.V.oneOf(data.connectionStatus || 'not_connected', STATUSES, 'Connection Status')
      ]);
      if (err) return Promise.resolve(C.fail(err));
      var row = C.toSnake(Object.assign({
        clientFunctionId: clientFunctionId,
        connectionStatus: 'not_connected'
      }, data), DRV_COLS);
      /* Phase 13: status whitelist enforced server-side via the
         admin-gated edge function — no direct anon writes */
      return SB.run(function (db) {
        return db.functions.invoke('drive-conn-admin', {
          body: { op: 'set', client_function_id: clientFunctionId, connection_status: row.connection_status }
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      }).then(function (r) {
        if (!r.ok) return C.fail(r.error || 'Could not update the connection.');
        return C.ok(row);
      }).catch(function (e) { return C.fail(e && e.message ? e.message : 'Could not update the connection.'); });
    }
  };

  global.MKServices = global.MKServices || {};
  global.MKServices.functions = functions;
})(window);
