/* ============================================================
   MARKIPIE — Admin-only data (NOT part of the public bundle)
   ------------------------------------------------------------
   • Seeds the demo clients, their FUNCTIONS (events) and media
     METADATA into the managed store. Access codes and Drive
     folder references exist only here — never in the public
     website source.
   • Media metadata only: actual photos/videos stay in Google
     Drive (the Drive adapter connects in the final phase).
   • Contains the admin credential HASH (never the password in
     plain text). Replace the local check with a real server
     authentication call in the next phase.
   ============================================================ */
(function () {
  'use strict';
  var M = window.MarkipieData;
  if (!M) return;

  /* ---------- demo clients (seeded once) ---------- */
    /* ---------- demo seed (LOCAL DEVELOPMENT ONLY) ----------
     These fixtures power the local/dev harness. When Supabase is
     configured they are never written — production reads the real
     database exclusively (§37 no fake production data). */
  var SB0 = window.MKSupabase;
  if (!SB0 || !SB0.isConfigured()) {

M.store.ensure('clients_v2', function () {
    return [
      {
        id: 'client_demo_002',
        code: 'ADI2026',
        name: 'Adi & Shivangi',
        eventTitle: 'ADI WEDS SHIVANGI',
        eventType: 'Wedding',
        eventDate: '2026-11-19',
        contact: '+91 98xxx 00121',
        paymentStatus: 'received',
        status: 'active',
        permissions: { clientAccess: true, watermark: true, download: true, aiSearch: true, videos: true },
        drive: { connected: true, folderId: 'demo_adi_root', folderUrl: 'https://drive.google.com/drive/folders/demo_adi_root', status: 'connected', lastSynced: '2026-08-20T09:30:00.000Z', syncStatus: 'completed' },
        createdAt: '2026-08-01T06:00:00.000Z'
      },
      {
        id: 'client_demo_003',
        code: 'TW2026',
        name: 'Test Wedding',
        eventTitle: 'TEST WEDDING',
        eventType: 'Wedding',
        eventDate: '2026-12-05',
        contact: '+91 90xxx 77812',
        paymentStatus: 'received',
        status: 'active',
        permissions: { clientAccess: true, watermark: true, download: true, aiSearch: true, videos: true },
        drive: { connected: false, status: 'not_connected' },
        createdAt: '2026-09-01T06:00:00.000Z'
      },
      {
        id: 'client_demo_001',
        code: 'RP2026',
        name: 'Rahul & Priya',
        eventTitle: 'RAHUL WEDS PRIYA',
        eventType: 'Wedding',
        eventDate: '2026-02-14',
        contact: '+91 97xxx 44110',
        paymentStatus: 'received',
        status: 'active',
        permissions: { clientAccess: true, watermark: true, download: false, aiSearch: true, videos: true },
        drive: { connected: true, folderId: 'demo_rp_root', folderUrl: 'https://drive.google.com/drive/folders/demo_rp_root', status: 'connected', lastSynced: '2026-08-18T15:10:00.000Z', syncStatus: 'completed' },
        createdAt: '2026-01-05T06:00:00.000Z'
      }
    ];
  });

  /* ---------- demo functions/events per client ---------- */
  var DEMO_FUNCTIONS = [
    // Adi Weds Shivangi
    { id: 'fn_adi_haldi',     clientId: 'client_demo_002', name: 'Haldi',     eventDate: '2026-11-16', photoCount: 180, videoCount: 12, sortOrder: 1, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_adi_haldi' },
    { id: 'fn_adi_mehendi',   clientId: 'client_demo_002', name: 'Mehendi',   eventDate: '2026-11-17', photoCount: 245, videoCount: 18, sortOrder: 2, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_adi_mehendi' },
    { id: 'fn_adi_wedding',   clientId: 'client_demo_002', name: 'Wedding',   eventDate: '2026-11-19', photoCount: 420, videoCount: 35, sortOrder: 3, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_adi_wedding' },
    { id: 'fn_adi_reception', clientId: 'client_demo_002', name: 'Reception', eventDate: '2026-11-20', photoCount: 150, videoCount: 10, sortOrder: 4, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_adi_reception' },
    // Test Wedding (fixture — connect Drive → pick folder → sync)
    { id: 'fn_test_haldi', clientId: 'client_demo_003', name: 'Haldi', eventDate: '2026-12-04', photoCount: 0, videoCount: 0, sortOrder: 1, driveFolderUrl: '' },
    { id: 'fn_test_mehendi', clientId: 'client_demo_003', name: 'Mehendi', eventDate: '2026-12-05', photoCount: 0, videoCount: 0, sortOrder: 2, driveFolderUrl: '' },
    { id: 'fn_test_wedding', clientId: 'client_demo_003', name: 'Wedding', eventDate: '2026-12-05', photoCount: 0, videoCount: 0, sortOrder: 3, driveFolderUrl: '' },
    // Rahul Weds Priya
    { id: 'fn_rp_haldi',     clientId: 'client_demo_001', name: 'Haldi',     eventDate: '2026-02-12', photoCount: 96,  videoCount: 8,  sortOrder: 1, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_rp_haldi' },
    { id: 'fn_rp_mehendi',   clientId: 'client_demo_001', name: 'Mehendi',   eventDate: '2026-02-13', photoCount: 148, videoCount: 12, sortOrder: 2, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_rp_mehendi' },
    { id: 'fn_rp_wedding',   clientId: 'client_demo_001', name: 'Wedding',   eventDate: '2026-02-14', photoCount: 210, videoCount: 16, sortOrder: 3, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_rp_wedding' },
    { id: 'fn_rp_reception', clientId: 'client_demo_001', name: 'Reception', eventDate: '2026-02-15', photoCount: 132, videoCount: 9,  sortOrder: 4, driveFolderUrl: 'https://drive.google.com/drive/folders/demo_rp_reception' }
  ];
  M.store.ensure('functions_v1', function () {
    return DEMO_FUNCTIONS.map(function (f) {
      return Object.assign({
        driveFolderId: '', cover: null, downloadPermission: 'none', status: 'active',
        createdAt: '2026-08-01T06:00:00.000Z'
      }, f);
    });
  });

  /* ---------- demo media METADATA (files themselves live in Drive) ---------- */
  var VIDEO_CLIPS = ['/assets/demo-media/markipie-clip-1.mp4', '/assets/demo-media/markipie-clip-2.mp4', '/assets/demo-media/markipie-clip-3.mp4'];
  M.store.ensure('media_v1', function () {
    var out = [];
    DEMO_FUNCTIONS.forEach(function (f) {
      /* Test Wedding starts empty — its gallery fills after Drive sync */
      if (f.clientId === 'client_demo_003') return;
      var total = Math.min(18, f.photoCount + f.videoCount);
      var videos = Math.max(1, Math.round(total / 7));
      for (var i = 1; i <= total; i++) {
        var isVideo = i % 7 === 0 && videos > 0;
        out.push({
          media_id: f.id + '_m' + i,
          function_id: f.id,
          client_id: f.clientId,
          drive_file_id: 'drive_' + f.id + '_' + i, // internal only — never sent to the browser UI
          filename: (isVideo ? 'VID_' : 'IMG_') + String(1000 + i) + (isVideo ? '.mp4' : '.jpg'),
          mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
          media_type: isVideo ? 'video' : 'photo',
          thumbnail_reference: isVideo
            ? '/assets/demo-media/posters/v-' + String(1 + (i % 3)).padStart(2, '0') + '.jpg'
            : '/assets/demo-media/posters/p-' + String(1 + (i % 12)).padStart(2, '0') + '.jpg',
          preview_reference: isVideo ? VIDEO_CLIPS[i % VIDEO_CLIPS.length]
                                     : '/assets/demo-media/posters/p-' + String(1 + (i % 12)).padStart(2, '0') + '.jpg',
          file_size: (2 + (i % 5)) * 1024 * 1024,
          processing_status: 'pending',
          status: 'available'
        });
      }
    });
    return out;
  });

  /* ---------- Drive helpers (admin side) ---------- */
  M.drive = {
    /* Extract the folder id from a pasted Google Drive URL (or accept a raw id). */
    parseFolderId: function (input) {
      var s = String(input || '').trim();
      if (!s) return '';
      var m = s.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
      if (m) return m[1];
      m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
      if (m) return m[1];
      if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
      return '';
    }
  };

    }

  /* ---------- authentication (local check → real API later) ----------
     Credential check uses a SHA-256 hash of "username|password".
     Demo credentials are documented in the project README and are
     replaced by server-side authentication in the next phase.     */
  var CREDS_SHA256 = '00365aee005078e43339194f54ddaff776d910046b68509cbcec7bd6512e25ff';
  /* No reversible fallback: on non-secure contexts (no crypto.subtle)
     local login simply fails. Production uses Supabase Auth. */
  var SESSION_KEY = 'mk_admin_session';

  function sha256Hex(s) {
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) return Promise.reject(new Error('no-subtle'));
    var buf = new TextEncoder().encode(s);
    return crypto.subtle.digest('SHA-256', buf).then(function (arr) {
      return Array.prototype.map.call(new Uint8Array(arr), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch (e) { return M.store.read('_session_mem', null); }
  }
  function writeSession(s) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    catch (e) { M.store.write('_session_mem', s); }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    M.store.write('_session_mem', null);
  }

  M.auth = {
    /* Simulated server round-trip; swap the body of this method for a
       fetch('/api/admin/login', …) call when the backend exists. */
    login: function (username, password) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          var attempt = String(username || '') + '|' + String(password || '');
          var done = function (ok) {
            if (!ok) { resolve({ ok: false, error: 'Invalid username or password.' }); return; }
            var s = { user: String(username || 'admin'), token: M.util.uid('tok'), t: Date.now() };
            writeSession(s);
            resolve({ ok: true, session: s });
          };
          sha256Hex(attempt).then(function (hex) { done(hex === CREDS_SHA256); })
            .catch(function () { done(false); });
        }, 750);
      });
    },
    session: readSession,
    logout: function () { clearSession(); }
  };
})();
