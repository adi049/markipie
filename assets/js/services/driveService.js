/* ============================================================
   Markipie — driveService (Phase 10)
   ------------------------------------------------------------
   Google Drive connection + media sync for ONE function, built
   on the canonical tables (drive_connections · media ·
   client_functions). No new schema, no Drive UI for clients,
   no media binaries in Supabase — Drive is the only original
   media source (Part 29).

   Two modes:
   · configured  → every call goes through the server-side edge
     functions (OAuth start/callback, folder picker, sync,
     status). Google credentials and refresh tokens never
     touch the browser (Part 30).
   · local (not configured) → a clearly-labelled simulated Drive
     (folder tree + deterministic file sets) so the complete
     connect → pick → sync → gallery flow runs without keys.
   ============================================================ */
(function (global) {
  'use strict';
  var SB = global.MKSupabase, C = global.MKServicesCore;
  if (!SB) return;

  function MD() { return global.MarkipieData; }
  function A() { return global.Admin; }

  var AI_PLACEHOLDER = 'AI photo indexing will be available after media synchronization is complete.';
  var CONN_STORE = 'drive_conn_v1';
  var syncingNow = {};   /* fnId → true while a local sync is running */

  /* ============================================================
     LOCAL SIMULATED DRIVE (development mode only)
     Deterministic folder tree + file sets. Test Wedding/Mehendi
     is the Part-32 test fixture: 10 photos + 3 videos (+2
     unsupported files that sync must skip safely).
     ============================================================ */
  var TREE = {
    id: 'root', name: 'My Drive', children: [
      { id: 'fld_weddings', name: 'Wedding', children: [
        { id: 'demo_adi_root', name: 'Adi Weds Shivangi', children: [
          { id: 'demo_adi_haldi', name: 'Haldi', children: null },
          { id: 'demo_adi_mehendi', name: 'Mehendi', children: null },
          { id: 'demo_adi_wedding', name: 'Wedding', children: null },
          { id: 'demo_adi_reception', name: 'Reception', children: null }
        ]},
        { id: 'demo_test_root', name: 'Test Wedding', children: [
          { id: 'demo_test_haldi', name: 'Haldi', children: null },
          { id: 'demo_test_mehendi', name: 'Mehendi', children: null },
          { id: 'demo_test_wedding', name: 'Wedding', children: null }
        ]}
      ]}
    ]
  };

  function folderById(id, node) {
    node = node || TREE;
    if (node.id === id) return node;
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) {
      var f = folderById(id, kids[i]);
      if (f) return f;
    }
    return null;
  }
  function pathOf(id) {
    var path = [], node = TREE, found = false;
    (function walk(n, trail) {
      trail = trail.concat([n]);
      if (n.id === id) { path = trail; found = true; return; }
      (n.children || []).forEach(function (k) { if (!found) walk(k, trail); });
    })(TREE, []);
    return path;
  }

  /* deterministic pseudo-random (same folder → same file set every sync) */
  function seeded(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return function () { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  }

  /* Folder contents: counts per folder id. Test Wedding/Mehendi is
     EXACTLY the Part-32 fixture: 10 photos + 3 videos + 2 skips. */
  var FOLDER_CONTENTS = {
    demo_test_haldi:    { photos: 14, videos: 2, skipped: 1 },
    demo_test_mehendi:  { photos: 10, videos: 3, skipped: 2 },
    demo_test_wedding:  { photos: 24, videos: 2, skipped: 1 },
    demo_adi_haldi:     { photos: 180, videos: 12, skipped: 3 },
    demo_adi_mehendi:   { photos: 245, videos: 18, skipped: 4 },
    demo_adi_wedding:   { photos: 420, videos: 35, skipped: 6 },
    demo_adi_reception: { photos: 150, videos: 10, skipped: 2 },
    demo_rp_haldi:      { photos: 96, videos: 8, skipped: 1 },
    demo_rp_mehendi:    { photos: 148, videos: 12, skipped: 2 },
    demo_rp_wedding:    { photos: 210, videos: 16, skipped: 3 },
    demo_rp_reception:  { photos: 132, videos: 9, skipped: 1 }
  };

  var VIDEO_CLIPS = ['/assets/demo-media/markipie-clip-1.mp4', '/assets/demo-media/markipie-clip-2.mp4', '/assets/demo-media/markipie-clip-3.mp4'];

  /* Phase 12 — face-search demo set. demo_test_wedding folds in
     9 real face portraits (f-01…f-09): 6 shots of the same guest
     (matchable) + 3 different people (must NOT match). Counts are
     unchanged — only the poster source for these slots differs. */
  var FACE_SLOTS = { 2: 'f-02', 5: 'f-01', 8: 'f-03', 11: 'f-04', 14: 'f-05', 16: 'f-06', 18: 'f-07', 20: 'f-08', 22: 'f-09' };

  /* Build the metadata rows for a folder — NOTHING is downloaded;
     these are the same fields the Drive API would return. */
  function folderFileSet(folderId) {
    var spec = FOLDER_CONTENTS[folderId] || { photos: 40, videos: 4, skipped: 1 };
    var rnd = seeded(folderId), files = [], n = 0;
    for (var i = 0; i < spec.photos; i++) {
      n++;
      var face = folderId === 'demo_test_wedding' ? FACE_SLOTS[i] : null;
      var poster = face ? '/assets/demo-media/posters/' + face + '.jpg'
                        : '/assets/demo-media/posters/p-' + String(1 + ((i + folderId.length) % 12)).padStart(2, '0') + '.jpg';
      files.push({
        id: folderId + '_ph' + (i + 1),
        name: 'IMG_' + String(1001 + i) + '.jpg',
        mimeType: 'image/jpeg', media_type: 'photo',
        thumb: poster,
        src: poster,
        size: Math.round((2.1 + rnd() * 5.4) * 1024 * 1024)
      });
    }
    for (var v = 0; v < spec.videos; v++) {
      n++;
      files.push({
        id: folderId + '_vid' + (v + 1),
        name: 'VID_' + String(2001 + v) + '.mp4',
        mimeType: 'video/mp4', media_type: 'video',
        thumb: '/assets/demo-media/posters/v-' + String(1 + (v % 3)).padStart(2, '0') + '.jpg',
        src: VIDEO_CLIPS[v % VIDEO_CLIPS.length],
        size: Math.round((18 + rnd() * 120) * 1024 * 1024)
      });
    }
    for (var s = 0; s < spec.skipped; s++) {
      files.push({ id: folderId + '_skip' + s, name: 'Notes' + (s + 1) + (s % 2 ? '.gdoc' : '.pdf'), mimeType: s % 2 ? 'application/vnd.google-apps.document' : 'application/pdf' });
    }
    return { files: files, photos: spec.photos, videos: spec.videos, skipped: spec.skipped };
  }

  /* ---------------- local connection store ---------------- */
  function conns() { return MD().store.read(CONN_STORE, []); }
  function connFor(fnId) {
    return conns().filter(function (c) { return c.function_id === fnId; })[0] || null;
  }
  function saveConn(row) {
    var all = conns().filter(function (c) { return c.function_id !== row.function_id; });
    all.push(row);
    MD().store.write(CONN_STORE, all);
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  var drive = {
    AI_PLACEHOLDER: AI_PLACEHOLDER,

    /* ---------- connection status (Part 5) ---------- */
    status: function (fnId) {
      if (!SB.isConfigured()) {
        var c = connFor(fnId);
        var countsP = MD().media.counts ? MD().media.counts(fnId) : Promise.resolve({ photos: 0, videos: 0, total: 0 });
        return countsP.then(function (counts) {
          var st = c ? c.status : 'not_connected';
          /* interrupted sync (tab closed mid-run) — resolve from history */
          if (st === 'syncing' && !syncingNow[fnId]) {
            st = (c && c.last_sync_summary) ? 'synced' : 'error';
          }
          return {
            ok: true, data: {
              status: st,
              folderId: c ? c.folder_id : null,
              folderUrl: c ? c.folder_url : null,
              folderName: c ? c.folder_name : null,
              account: c && c.authorized ? (c.oauth_email || 'Demo Google account') : null,
              totalFiles: c && c.total_files || 0,
              lastSyncedAt: c ? c.last_synced_at : null,
              history: c ? c.last_sync_summary : null,
              photos: counts.photos, videos: counts.videos,
              aiIndex: counts.photos ? 'Queued — Phase 12' : 'Not Started'
            }
          };
        });
      }
      return SB.run(function (db) {
        return db.functions.invoke('drive-sync-status', { body: { client_function_id: fnId } })
          .then(function (r) {
            if (r.error) throw r.error;
            return r.data;
          });
      }).then(function (r) { return r.ok ? r : C.fail(r.error || 'Could not load Drive status.'); });
    },

    /* ---------- folder browsing (Part 3) ---------- */
    listFolders: function (fnId, parentId) {
      if (!SB.isConfigured()) {
        var node = parentId ? folderById(parentId) : TREE;
        if (!node) return Promise.resolve({ ok: false, error: 'Unable to access this folder.' });
        return delay(260).then(function () {
          return { ok: true, data: { here: { id: node.id, name: node.name }, folders: (node.children || []).map(function (k) { return { id: k.id, name: k.name }; }) } };
        });
      }
      return SB.run(function (db) {
        return db.functions.invoke('drive-folder-picker', { body: { client_function_id: fnId, parent_id: parentId || null } })
          .then(function (r) { if (r.error) throw r.error; return r.data; });
      }).then(function (r) { return r.ok ? r : C.fail(r.error || 'Could not reach Google Drive.'); });
    },

    /* ---------- connect (Part 2) ---------- */
    connect: function (fnId) {
      if (!SB.isConfigured()) {
        return delay(320).then(function () { return { ok: true, simulated: true }; });
      }
      return SB.run(function (db) {
        return db.functions.invoke('drive-oauth-start', { body: { client_function_id: fnId } })
          .then(function (r) { if (r.error) throw r.error; return r.data; });
      }).then(function (r) {
        if (!r.ok) return r;
        var win = global.open(r.url, 'mk-drive-oauth', 'width=520,height=680');
        return { ok: true, popup: win, simulated: false };
      });
    },

    /* ---------- save the chosen folder → CONNECTED (Parts 2–4) ---------- */
    saveFolder: function (fnId, clientId, folder) {
      var url = 'https://drive.google.com/drive/folders/' + folder.id;
      if (!SB.isConfigured()) {
        var row = connFor(fnId) || { function_id: fnId };
        row.status = 'connected';
        row.folder_id = folder.id;
        row.folder_name = folder.name;
        row.folder_url = url;
        row.authorized = true;
        row.oauth_email = 'demo-admin@gmail.com';
        saveConn(row);
        return mirrorFunction(fnId, clientId, row, url).then(function () {
          return logEvent(clientId, 'Drive folder "' + folder.name + '" connected to this function.');
        }).then(function () { return { ok: true, data: row }; });
      }
      /* Phase 13 hardening: browsers never write drive_connections
         directly (RLS forbids it) — this goes through the
         admin-gated drive-conn-admin edge function */
      return SB.run(function (db) {
        return db.functions.invoke('drive-conn-admin', {
          body: { op: 'save', client_function_id: fnId, folder_id: folder.id, folder_name: folder.name }
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      }).then(function (r) {
        if (!r.ok) return { ok: false, error: r.error || 'Could not save the Drive folder.' };
        return { ok: true, data: folder };
      }).catch(function () { return { ok: false, error: 'Could not save the Drive folder.' }; });
    },

    /* ---------- sync (Parts 6–9, 21) ---------- */
    sync: function (fnId, clientId, onProgress) {
      var report = onProgress || function () {};
      if (!SB.isConfigured()) return syncLocal(fnId, clientId, report);
      /* configured: resumable page-by-page through the edge function */
      var cursor = null, batchId = null;
      function step() {
        return SB.run(function (db) {
          return db.functions.invoke('drive-sync', { body: { client_function_id: fnId, cursor: cursor, batch_id: batchId } })
            .then(function (r) { if (r.error) throw r.error; return r.data; });
        }).then(function (r) {
          if (!r.ok) return r;
          report({ processed: r.processed, totalEst: r.total_est || null, photos: r.photos, videos: r.videos, skipped: r.skipped, errors: r.errors, done: false });
          if (r.done) return { ok: true, data: r };
          cursor = r.cursor; batchId = r.batch_id;
          return delay(120).then(step);
        });
      }
      return step();
    },

    /* ---------- disconnect (Part 20) ---------- */
    disconnect: function (fnId, clientId) {
      if (!SB.isConfigured()) {
        var row = connFor(fnId);
        if (row) {
          row.status = 'not_connected';
          row.folder_id = null;
          row.folder_name = null;
          row.folder_url = null;
          row.disconnected_at = new Date().toISOString();
          saveConn(row);          /* media records are kept (retention rules later) */
        }
        return mirrorFunction(fnId, clientId, { status: 'not_connected' }, null).then(function () {
          return logEvent(clientId, 'Drive disconnected — existing media metadata retained.');
        }).then(function () { return { ok: true }; });
      }
      /* Phase 13 hardening: mark-not-delete through the admin-gated
         edge function — no direct anon writes (Phase 10 rule kept) */
      return SB.run(function (db) {
        return db.functions.invoke('drive-conn-admin', {
          body: { op: 'disconnect', client_function_id: fnId }
        }).then(function (r) { if (r.error) throw r.error; return r.data; });
      }).then(function (r) { return r.ok ? r : C.fail(r.error); })
        .catch(function () { return C.fail('Could not disconnect Drive.'); });
    }
  };

  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  function mirrorFunction(fnId, clientId, conn, url) {
    var patch = { driveStatus: conn.status || 'not_connected' };
    if (conn.folder_id) { patch.driveFolderId = conn.folder_id; patch.driveFolderUrl = url; }
    if (conn.status === 'not_connected') { patch.driveFolderId = ''; patch.driveFolderUrl = ''; }
    return MD().functions.update(fnId, patch).catch(function () { /* function may be gone */ });
  }
  function logEvent(clientId, text) {
    try { return MD().clients.logEvent(clientId, 'drive', text) || Promise.resolve(); }
    catch (e) { return Promise.resolve(); }
  }

  /* ============================================================
     LOCAL SYNC ENGINE — writes media METADATA only, with
     duplicate protection (update-by-drive_file_id) and removal
     marking (Part 8). Progress streams asynchronously so the
     dashboard never freezes (Part 9).
     ============================================================ */
  function syncLocal(fnId, clientId, report) {
    var conn = connFor(fnId);
    if (!conn || !conn.folder_id) {
      return Promise.resolve({ ok: false, error: 'No Drive folder is connected to this function.' });
    }
    syncingNow[fnId] = true;
    conn.status = 'syncing';
    saveConn(conn);
    mirrorFunction(fnId, clientId, conn, conn.folder_url);
    syncingNow[fnId] = true;

    var set = folderFileSet(conn.folder_id);
    /* ONE read — prev records must be the same objects we persist */
    var all = MD().store.read('media_v1', []);
    var byDriveId = {};
    all.forEach(function (m) { if (m.function_id === fnId) byDriveId[m.drive_file_id] = m; });

    var added = 0, updated = 0, skipped = 0, errors = 0, photos = 0, videos = 0, idx = 0;
    var now = new Date().toISOString();
    var batchId = 'batch_' + Date.now();

    return new Promise(function (resolve) {
      var total = set.files.length;
      function chunk() {
        var until = Math.min(total, idx + Math.max(3, Math.ceil(total / 5)));
        for (; idx < until; idx++) {
          var f = set.files[idx];
          if (!f.media_type) { skipped++; continue; }              // unsupported → skip safely
          if (f.media_type === 'photo') photos++; else videos++;
          var prev = byDriveId[f.id];
          if (prev) {
            /* duplicate protection (Part 8) — UPDATE the existing record */
            updated++;
            prev.filename = f.name;
            prev.mime_type = f.mimeType;
            prev.media_type = f.media_type;
            prev.thumbnail_reference = f.thumb;
            prev.preview_reference = f.src;
            prev.file_size = f.size;
            prev.status = 'available';
            prev.removed_at = null;
            prev.sync_batch_id = batchId;
            prev.processing_status = prev.processing_status || 'pending';
            prev.updated_at = now;
          } else {
            /* new file — INSERT once */
            added++;
            all.push({
              media_id: 'md_' + f.id,
              function_id: fnId,
              client_id: clientId,
              drive_file_id: f.id,
              filename: f.name,
              mime_type: f.mimeType,
              media_type: f.media_type,
              thumbnail_reference: f.thumb,
              preview_reference: f.src,
              file_size: f.size,
              processing_status: 'pending',
              status: 'available',
              created_at: now,
              sync_batch_id: batchId,
              updated_at: now
            });
          }
        }
        report({
          processed: idx, totalEst: total, photos: photos, videos: videos,
          skipped: skipped, errors: errors, done: false
        });
        if (idx < total) { setTimeout(chunk, 190); return; }

        /* removal pass — mark unseen files, never destroy (Part 8) */
        var removed = 0;
        all.forEach(function (m) {
          if (m.function_id === fnId && m.status !== 'removed' && m.sync_batch_id !== batchId) {
            m.status = 'removed';
            m.removed_at = now;
            removed++;
          }
        });

        var live = all.filter(function (m) { return m.function_id === fnId && m.status !== 'removed'; }).length;
        conn.status = 'synced';
        syncingNow[fnId] = false;
        conn.last_synced_at = now;
        conn.total_files = live;
        conn.last_sync_summary = {
          added: added, updated: updated, removed: removed, skipped: skipped,
          errors: errors, photos: photos, videos: videos, total: live, synced_at: now
        };
        saveConn(conn);
        MD().store.write('media_v1', all);
        MD().functions.update(fnId, { photoCount: photos, videoCount: videos }).catch(function () {});
        mirrorFunction(fnId, clientId, conn, conn.folder_url);
        logEvent(clientId, 'Drive sync completed — ' + photos + ' photos, ' + videos + ' videos (' + (added + updated) + ' files, ' + skipped + ' skipped).');
        report({ processed: live, totalEst: live, photos: photos, videos: videos, skipped: skipped, errors: errors, done: true });
        resolve({ ok: true, data: conn.last_sync_summary });
      }
      setTimeout(chunk, 220);
    });
  }

  /* ============================================================
     UI — picker modal + per-function Drive panel (Parts 2–5,
     20–22, 27–28). Injected on demand; uses the existing admin
     design system classes so nothing else changes.
     ============================================================ */
  var uiReady = false;
  function ensureUI() {
    if (uiReady || !document.getElementById('mkDriveRoot')) return;
    uiReady = true;
    document.getElementById('mkDriveRoot').innerHTML =
      '<div class="modal-backdrop" id="mkDriveModal"><div class="modal" role="dialog" aria-modal="true" aria-label="Google Drive">' +
        '<h3 id="mkDriveTitle">Connect Google Drive</h3>' +
        '<p class="modal-sub" id="mkDriveSub">Media stays in Google Drive — Markipie stores the folder reference only.</p>' +
        '<div id="mkDriveBody"></div>' +
      '</div></div>';
    document.getElementById('mkDriveModal').addEventListener('click', function (e) {
      if (e.target === this || e.target.closest('[data-mkdrive-close]')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('mkDriveModal').classList.contains('is-open')) close();
    });
  }
  function open() { ensureUI(); document.getElementById('mkDriveModal').classList.add('is-open'); }
  function close() { var m = document.getElementById('mkDriveModal'); if (m) m.classList.remove('is-open'); }
  function body(html) { document.getElementById('mkDriveBody').innerHTML = html; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtWhen(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-IN'); }
  var STATUS_PILL = {
    not_connected: ['NOT CONNECTED', 'pill--muted'],
    connected: ['CONNECTED', 'pill--active'],
    syncing: ['SYNCING', 'pill--processing'],
    synced: ['SYNCED', 'pill--completed'],
    error: ['ERROR', 'pill--failed']
  };
  function pill(st) {
    var p = STATUS_PILL[st] || STATUS_PILL.not_connected;
    return '<span class="pill ' + p[1] + '">' + p[0] + '</span>';
  }

  /* ---------------- picker flow (authorize → browse → save) ---------------- */
  function openPicker(opts) {
    ensureUI(); open();
    var fnId = opts.functionId, clientId = opts.clientId, fnName = opts.functionName || 'this function';
    document.getElementById('mkDriveTitle').textContent = 'Connect Google Drive';
    document.getElementById('mkDriveSub').textContent = 'Function: ' + fnName + ' — authorize, then choose its folder.';
    if (!SB.isConfigured()) {
      body(
        '<div style="text-align:center;padding:8px 0 4px">' +
          '<p style="font-size:13.5px;color:var(--ink-2);max-width:380px;margin:0 auto 14px">Markipie needs read-only access to pick a folder and sync media metadata.</p>' +
          '<button class="btn btn--primary" id="mkDriveAllow" type="button">Allow access</button>' +
          '<p class="hint" style="margin-top:12px">Demo authorization — no Google account is used until real keys are configured.</p>' +
        '</div>');
      document.getElementById('mkDriveAllow').addEventListener('click', function () { browse(fnId, clientId, fnName, null, []); });
      return;
    }
    body('<p style="font-size:13.5px;color:var(--ink-2);padding:6px 0">Opening Google…</p>');
    drive.connect(fnId).then(function (r) {
      if (!r.ok) { body('<p class="form-error is-visible">' + esc(r.error) + '</p>'); return; }
      var done = false;
      function onMsg(ev) {
        if (ev.data !== 'mk-drive-auth-done' || done) return;
        done = true;
        window.removeEventListener('message', onMsg);
        browse(fnId, clientId, fnName, null, []);
      }
      window.addEventListener('message', onMsg);
    });
  }

  function browse(fnId, clientId, fnName, parentId, trail) {
    body('<p style="font-size:13.5px;color:var(--ink-3);padding:10px 0">Loading folders…</p>');
    drive.listFolders(fnId, parentId).then(function (r) {
      if (!r.ok) { body('<p class="form-error is-visible">' + esc(r.error) + '</p>'); return; }
      var here = r.data.here, folders = r.data.folders || [];
      var crumbs = trail.concat([here]);
      body(
        crumbs.map(function (c, i) {
          return '<button class="link-btn" data-crumb="' + i + '" type="button">' + esc(c.name) + '</button>';
        }).join(' <span style="color:var(--ink-3)">›</span> ') +
        '<div class="drive-tree" style="margin-top:12px;max-height:300px;overflow:auto">' +
        (folders.length
          ? folders.map(function (f) {
              return '<div class="fn-row"><span class="grow"><b>' + esc(f.name) + '</b><small>Folder</small></span>' +
                '<span class="row-actions">' +
                '<button class="btn btn--ghost btn--sm" data-open="' + esc(f.id) + '" type="button">Open</button>' +
                '<button class="btn btn--soft btn--sm" data-use="' + esc(f.id) + '" data-use-name="' + esc(f.name) + '" type="button">Use this folder</button>' +
                '</span></div>';
            }).join('')
          : '<p style="color:var(--ink-3);font-size:13px;padding:14px 2px">No sub-folders here.</p>') +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">' +
        '<button class="btn btn--ghost btn--sm" data-mkdrive-close type="button">Cancel</button></div>');
      document.getElementById('mkDriveBody').addEventListener('click', function (e) {
        var op = e.target.closest('[data-open]');
        var use = e.target.closest('[data-use]');
        var crumb = e.target.closest('[data-crumb]');
        if (op) {
          var sub = trail.concat([here]);
          browse(fnId, clientId, fnName, op.getAttribute('data-open'), sub);
        }
        if (use) {
          savePicked(fnId, clientId, fnName, { id: use.getAttribute('data-use'), name: use.getAttribute('data-use-name') });
        }
        if (crumb) {
          var i = Number(crumb.getAttribute('data-crumb'));
          var t = crumbs.slice(0, i);
          browse(fnId, clientId, fnName, i === 0 ? null : crumbs[i - 1].id, t);
        }
      }, { once: true });
    });
  }

  function savePicked(fnId, clientId, fnName, folder) {
    body('<p style="font-size:13.5px;color:var(--ink-2);padding:10px 0">Saving "' + esc(folder.name) + '"…</p>');
    drive.saveFolder(fnId, clientId, folder).then(function (r) {
      if (!r.ok) { body('<p class="form-error is-visible">' + esc(r.error) + '</p>'); return; }
      if (A()) A().toast('Drive folder "' + folder.name + '" connected.');
      if (openPanelCurrent && openPanelCurrent.functionId === fnId) {
        /* panel flow — stay open and show the CONNECTED state */
        document.getElementById('mkDriveModal').classList.add('is-open');
        renderPanel(fnId, clientId, fnName);
      } else {
        /* fn-modal flow — back to the editor */
        close();
      }
      if (opts2.onSaved) opts2.onSaved(folder);
    });
  }
  var opts2 = {};

  /* ---------------- per-function Drive panel (Parts 5, 9, 20–22, 27–28) ---------------- */
  var openPanelCurrent = null;

  function openPanel(functionId, clientId, functionName) {
    openPanelCurrent = { functionId: functionId, clientId: clientId, functionName: functionName };
    ensureUI(); open();
    document.getElementById('mkDriveTitle').textContent = 'Google Drive — ' + functionName;
    document.getElementById('mkDriveSub').textContent = 'Connection, sync and media counters for this function.';
    renderPanel(functionId, clientId, functionName);
  }

  var renderSeq = 0;
  function renderPanel(fnId, clientId, fnName) {
    var seq = ++renderSeq;
    body('<p style="font-size:13.5px;color:var(--ink-3);padding:10px 0">Loading…</p>');
    drive.status(fnId).then(function (r) {
      if (seq !== renderSeq) return;      /* a newer render superseded this one */
      var d = r.ok ? r.data : {};
      var st = d.status || 'not_connected';
      var connected = st === 'connected' || st === 'syncing' || st === 'synced';
      body(
        '<div class="drive-panel">' +
          '<div class="dp-row dp-status"><span class="grow"><b>Status</b></span>' + pill(st) + '</div>' +
          '<div class="dp-meta">' +
            '<div><small>Folder</small><b>' + esc(d.folderName || '—') + '</b></div>' +
            '<div><small>Folder ID</small><b class="dp-mono">' + esc(d.folderId || '—') + '</b></div>' +
            '<div><small>Account</small><b>' + esc(d.account || '—') + '</b></div>' +
            '<div><small>Last Synced</small><b>' + fmtWhen(d.lastSyncedAt) + '</b></div>' +
          '</div>' +
          '<div class="dp-counters">' +
            '<div><b>' + fmtNum((d.photos || 0) + (d.videos || 0)) + '</b><small>Total Media</small></div>' +
            '<div><b>' + fmtNum(d.photos || 0) + '</b><small>Photos</small></div>' +
            '<div><b>' + fmtNum(d.videos || 0) + '</b><small>Videos</small></div>' +
            '<div><b>' + esc(d.aiIndex || 'Not Started') + '</b><small>AI Index</small></div>' +
          '</div>' +
          '<div class="dp-actions">' +
            (connected
              ? '<button class="btn btn--soft btn--sm" id="dpSync" type="button">Sync Now</button>' +
                '<button class="btn btn--ghost btn--sm" id="dpDisconnect" type="button">Disconnect</button>'
              : '<button class="btn btn--primary btn--sm" id="dpConnect" type="button">Connect Drive</button>') +
          '</div>' +
          '<div id="dpProgress" hidden>' +
            '<div class="dp-progress-head"><b>SYNCING GOOGLE DRIVE</b><span id="dpPct"></span></div>' +
            '<div class="dp-bar"><span id="dpBarFill"></span></div>' +
            '<p class="dp-progress-msg" id="dpMsg"></p>' +
            '<div class="dp-live" id="dpLive"></div>' +
          '</div>' +
          (d.history
            ? '<div class="dp-history"><b>Last sync — ' + fmtWhen((d.history && d.history.synced_at) || d.lastSyncedAt) + '</b>' +
              '<div class="dp-hist-grid">' +
                '<div><b>' + fmtNum(d.history.added) + '</b><small>Added</small></div>' +
                '<div><b>' + fmtNum(d.history.updated) + '</b><small>Updated</small></div>' +
                '<div><b>' + fmtNum(d.history.removed) + '</b><small>Removed</small></div>' +
                '<div><b>' + fmtNum(d.history.skipped) + '</b><small>Skipped</small></div>' +
                '<div><b>' + fmtNum(d.history.errors) + '</b><small>Errors</small></div>' +
              '</div></div>'
            : '') +
          '<div class="dp-ai">' +
            '<button class="btn btn--soft btn--sm" id="dpAiBtn" type="button" title="' + esc(AI_PLACEHOLDER) + '">Start AI Photo Indexing</button>' +
            '<p class="hint">' + esc(AI_PLACEHOLDER) + '</p>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:14px">' +
          '<button class="btn btn--ghost btn--sm" data-mkdrive-close type="button">Close</button></div>');

      var connectBtn = document.getElementById('dpConnect');
      if (connectBtn) connectBtn.addEventListener('click', function () {
        openPicker({ functionId: fnId, clientId: clientId, functionName: fnName, onSaved: null });
      });
      var syncBtn = document.getElementById('dpSync');
      if (syncBtn) syncBtn.addEventListener('click', function () { runSync(fnId, clientId, fnName); });
      var discBtn = document.getElementById('dpDisconnect');
      if (discBtn) discBtn.addEventListener('click', function () {
        A().confirm({
          title: 'Disconnect Google Drive?',
          message: 'The folder reference is removed and syncing stops. Existing media metadata is kept — final retention is decided later.',
          confirmText: 'Disconnect', danger: true
        }).then(function (yes) {
          if (!yes) return;
          drive.disconnect(fnId, clientId).then(function () {
            A().toast('Drive disconnected — media metadata retained.');
            renderPanel(fnId, clientId, fnName);
          });
        });
      });
      var aiBtn = document.getElementById('dpAiBtn');
      if (aiBtn) aiBtn.addEventListener('click', function () {
        A().toast(AI_PLACEHOLDER, 'info');
      });
    });
  }

  function runSync(fnId, clientId, fnName) {
    var prog = document.getElementById('dpProgress');
    var fill = document.getElementById('dpBarFill');
    var pct = document.getElementById('dpPct');
    var msg = document.getElementById('dpMsg');
    var live = document.getElementById('dpLive');
    if (prog) prog.hidden = false;
    var setP = function (p) {
      if (!fill) return;
      var total = p.totalEst || p.processed || 1;
      var percent = Math.min(100, Math.round((p.processed / total) * 100));
      fill.style.width = percent + '%';
      if (pct) pct.textContent = fmtNum(p.processed) + ' / ' + fmtNum(total) + ' files · ' + percent + '%';
      if (msg) msg.textContent = p.done ? 'Sync complete.' : 'Reading media metadata from Google Drive…';
      if (live) live.innerHTML =
        '<span>Photos: <b>' + fmtNum(p.photos) + '</b></span>' +
        '<span>Videos: <b>' + fmtNum(p.videos) + '</b></span>' +
        '<span>Skipped: <b>' + fmtNum(p.skipped) + '</b></span>' +
        '<span>Errors: <b>' + fmtNum(p.errors) + '</b></span>';
    };
    setP({ processed: 0, totalEst: 1, photos: 0, videos: 0, skipped: 0, errors: 0, done: false });
    drive.sync(fnId, clientId, setP).then(function (r) {
      if (!r.ok) {
        if (msg) msg.textContent = r.error || 'Sync failed — press Sync Now to retry.';
        if (A()) A().toast(r.error || 'Sync failed — press Retry Sync.', 'error');
        return;
      }
      if (A()) A().toast('Sync complete — ' + fmtNum(r.data.photos) + ' photos, ' + fmtNum(r.data.videos) + ' videos.');
      renderPanel(fnId, clientId, fnName);
      if (opts2.onSynced) opts2.onSynced(r.data);
    });
  }

  /* ---------------- entry points used by admin pages ---------------- */
  drive.openPicker = function (opts) { opts2 = opts || {}; openPicker(opts); };
  drive.openPanel = function (functionId, clientId, functionName) { openPanel(functionId, clientId, functionName); };
  drive.onSynced = function (cb) { opts2.onSynced = cb; };

  global.MKDrive = drive;
})(window);
