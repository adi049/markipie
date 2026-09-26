/* ============================================================
   Markipie — Face engine (Phase 12 — REAL, in-browser)
   ------------------------------------------------------------
   face-api.js on TensorFlow.js — free and open-source, runs
   FULLY in the visitor's browser. No paid AI service.

     LIVE CAMERA  →  FACE DETECTION  →  128-D DESCRIPTOR
        →  MATCH AGAINST THIS CLIENT'S OWN INDEX  →  MATCHES
        →  RESULTS RENDERED INSIDE MARKIPIE (watermarked)

   Privacy rules this module enforces:
     • The camera frame is NEVER uploaded or stored — the only
       thing that ever exists is an in-memory 128-number
       descriptor, for the lifetime of the scan.
     • Indexing covers PHOTOS ONLY — videos are never indexed.
     • Indexing is asynchronous, batched and resumable: it can
       pause (tab hidden), resume, and survives page reloads.
     • Every search is scoped to ONE client — no cross-client
       access is possible by construction.

   face-api.js ships as a classic bundle (`var faceapi`), so it
   is injected with a <script> tag — it cannot be import()ed.
   Models are vendored at /assets/models (TinyFaceDetector +
   68-point landmarks + 128-d recognition).
   ============================================================ */
(function (global) {
  'use strict';

  var SCRIPT_URL = '/assets/vendor/face-api/face-api.js';
  var MODEL_URL = '/assets/models';
  /* FACE_MATCH_THRESHOLD / FACE_MATCH_COUNT are CONFIGURABLE (spec §12):
     override with window.MarkipieFaceConfig = { faceMatchThreshold: 0.45,
     faceMatchCount: 80 } before this file loads — defaults are the
     face-api.js standard match distance and a sane result cap. */
  var cfg = global.MarkipieFaceConfig || {};
  var THRESHOLD = (typeof cfg.faceMatchThreshold === 'number' && cfg.faceMatchThreshold > 0
    && cfg.faceMatchThreshold < 1.2) ? cfg.faceMatchThreshold : 0.5;
  var MATCH_COUNT = (typeof cfg.faceMatchCount === 'number' && cfg.faceMatchCount > 0)
    ? Math.min(500, Math.round(cfg.faceMatchCount)) : 60;
  var MAX_FACES_PER_PHOTO = 4;  // index the largest faces only
  var DETECT_INPUT = 320;       // tiny detector input size
  var IMAGE_MAX_SIDE = 720;     // photos are downscaled for detection
  var IDX_STORE = 'faceidx_v1';     // rows {c,f,m,fi,d}
  var PROG_STORE = 'faceidx_p_v1';  // { [fnId]: {done:[], failed:[], total} }

  var state = {
    scriptLoading: null,   // promise while face-api.js <script> loads
    modelsLoading: null,   // promise while weights load
    ready: false,
    indexing: {},          // fnId -> true while an indexer loop runs
    listeners: []          // index-progress subscribers
  };

  /* ---------------- loading ---------------- */

  function loadScript() {
    if (global.faceapi) return Promise.resolve(true);
    if (state.scriptLoading) return state.scriptLoading;
    state.scriptLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { state.scriptLoading = null; reject(new Error('face-api-script')); };
      document.head.appendChild(s);
    });
    return state.scriptLoading;
  }

  function loadModels() {
    if (state.ready) return Promise.resolve(true);
    if (state.modelsLoading) return state.modelsLoading;
    state.modelsLoading = loadScript().then(function () {
      var fa = global.faceapi;
      if (!fa) throw new Error('face-api-missing');
      /* CPU backend: consistent descriptors across devices and
         predictable on low-end mobile (mobile-first constraint) */
      return fa.tf.setBackend('cpu').then(function () { return fa.tf.ready(); }).then(function () {
        return Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
      });
    }).then(function () {
      state.ready = true;
      return true;
    }).catch(function (e) {
      state.modelsLoading = null;   // allow a retry
      throw e;
    });
    return state.modelsLoading;
  }

  function isReady() { return state.ready; }

  /* ---------------- detection helpers ---------------- */

  function detectorOpts() {
    return new global.faceapi.TinyFaceDetectorOptions({ inputSize: DETECT_INPUT, scoreThreshold: 0.4 });
  }

  /* Draw source into an offscreen canvas (never appended to the
     DOM, never stored) capped at IMAGE_MAX_SIDE for speed. */
  function toCanvas(src, w, h) {
    var scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.max(32, Math.round(w * scale));
    cv.height = Math.max(32, Math.round(h * scale));
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    return cv;
  }

  function loadBitmap(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';   // keeps the canvas untainted
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image-load')); };
      img.src = src;
    });
  }

  /* Live camera frame → single 128-d descriptor (Float32Array).
     The frame lives only in memory for this call. */
  function describe(videoEl) {
    if (!state.ready || !videoEl || !videoEl.videoWidth) return Promise.resolve(null);
    var cv = toCanvas(videoEl, videoEl.videoWidth, videoEl.videoHeight);
    return global.faceapi.detectSingleFace(cv, detectorOpts())
      .withFaceLandmarks().withFaceDescriptor()
      .then(function (det) { return det ? det.descriptor : null; })
      .catch(function () { return null; });
  }

  /* One photo URL → [{ descriptor, faceIndex, score }, …] (photos only). */
  function describeImage(src) {
    if (!state.ready) return Promise.reject(new Error('models-not-loaded'));
    return loadBitmap(src).then(function (img) {
      var cv = toCanvas(img, img.naturalWidth, img.naturalHeight);
      return global.faceapi.detectAllFaces(cv, detectorOpts())
        .withFaceLandmarks().withFaceDescriptors();   /* plural — all faces */
    }).then(function (dets) {
      return dets.slice(0, MAX_FACES_PER_PHOTO).map(function (det, i) {
        return { descriptor: det.descriptor, faceIndex: i, score: det.detection.score };
      });
    });
  }

  function distance(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  }

  /* ---------------- local index (demo / local mode) ----------------
     Same shape as the canonical face_embeddings table:
     {c: client_id, f: client_function_id, m: media_id, fi: face_index,
      d: embedding[128]}. Descriptors only — never images. */

  function store() {
    var D = global.MarkipieData;
    return (D && D.store) ? D.store : null;
  }

  function idxRows() { var s = store(); return s ? s.read(IDX_STORE, []) || [] : []; }
  function writeRows(rows) { var s = store(); if (s) s.write(IDX_STORE, rows); }
  function progress() { var s = store(); return s ? s.read(PROG_STORE, {}) || {} : {}; }
  function writeProgress(p) { var s = store(); if (s) s.write(PROG_STORE, p); }

  function emit(fnId) {
    var p = progress()[fnId] || { done: [], failed: [], total: 0 };
    var snap = { fnId: fnId, processed: p.done.length, failed: p.failed.length, total: p.total, complete: p.done.length + p.failed.length >= p.total && p.total > 0 };
    state.listeners.forEach(function (f) { try { f(snap); } catch (e) {} });
  }

  /* Sequential, batched, resumable background indexer.
     photos: [{id, src}] — PHOTOS ONLY, callers must filter. */
  function indexFunction(fnId, clientId, photos, opts) {
    opts = opts || {};
    var list = (photos || []).filter(function (p) { return p && p.id && p.src; });
    if (state.indexing[fnId]) return Promise.resolve({ already: true });
    state.indexing[fnId] = true;
    if (typeof opts.onProgress === 'function') state.listeners.push(opts.onProgress);

    var p = progress();
    var rec = p[fnId] || { done: [], failed: [], total: list.length };
    rec.total = list.length;
    /* a new indexing run always retries previously failed photos —
       transient errors (models still loading, flaky network on remote
       thumbnails) must heal themselves */
    rec.failed = [];
    p[fnId] = rec;

    /* keep rows from earlier runs for media already done; drop any
       partial rows for media that will be (re)processed now */
    var rows = idxRows().filter(function (r) { return r.f !== fnId || rec.done.indexOf(r.m) !== -1; });
    var stopped = false;

    function save() { writeProgress(p); writeRows(rows); emit(fnId); }

    function queue() {
      return list.filter(function (ph) { return rec.done.indexOf(ph.id) === -1 && !rec.failed.some(function (f) { return f.id === ph.id; }); });
    }

    function step() {
      if (stopped || opts.isCanceled && opts.isCanceled()) { state.indexing[fnId] = false; save(); return; }
      var next = queue();
      if (!next.length) { state.indexing[fnId] = false; save(); if (opts.onDone) opts.onDone({ processed: rec.done.length, failed: rec.failed.length, total: rec.total }); return; }
      var ph = next[0];
      var run = function () {
        return describeImage(ph.src).then(function (faces) {
          faces.forEach(function (f) {
            rows.push({ c: clientId, f: fnId, m: ph.id, fi: f.faceIndex, d: Array.from(f.descriptor).map(function (x) { return Math.round(x * 1e4) / 1e4; }) });
          });
          /* configured mode streams the descriptors up in small
             batches (galleryService.faceIndexUpload) */
          if (opts.onPhoto && faces.length) opts.onPhoto(ph.id, faces);
          rec.done.push(ph.id);
        }).catch(function () {
          rec.failed.push({ id: ph.id, reason: 'unreadable' });
        }).then(function () {
          save();
          /* yield to the UI thread; pause while the tab is hidden and
             back off while any gallery video is open or playing —
             loading included — so background indexing never degrades
             the client's viewing experience */
          var delay = document.hidden ? 900 : 30;
          if (!document.hidden) {
            var vs = document.querySelectorAll('video');
            for (var v = 0; v < vs.length; v++) {
              if (!vs[v].paused) { delay = 900; break; }
            }
          }
          setTimeout(step, delay);
        });
      };
      /* models load lazily before the first photo */
      (state.ready ? Promise.resolve() : loadModels()).then(run).catch(function () {
        rec.failed.push({ id: ph.id, reason: 'engine' });
        save(); setTimeout(step, 200);
      });
    }
    setTimeout(step, opts.delay || 350);
    return Promise.resolve({ started: true, total: list.length });
  }

  function cancelIndexing(fnId) { state.indexing[fnId] = false; }

  function indexProgress(fnId) {
    var p = progress()[fnId];
    if (!p) return { processed: 0, failed: 0, total: 0, complete: false };
    return { processed: p.done.length, failed: p.failed.length, total: p.total, complete: p.total > 0 && p.done.length + p.failed.length >= p.total };
  }

  function onIndexUpdate(fn) {
    state.listeners.push(fn);
    return function () { state.listeners = state.listeners.filter(function (f) { return f !== fn; }); };
  }

  /* Match a descriptor against ONE client's own index. */
  function searchLocal(desc, clientId) {
    if (!desc) return Promise.resolve({ ok: false, reason: 'no-descriptor' });
    var rows = idxRows().filter(function (r) { return r.c === clientId; });
    var matches = [];
    for (var i = 0; i < rows.length; i++) {
      var d = distance(desc, rows[i].d);
      if (d <= THRESHOLD) matches.push({ fnId: rows[i].f, mediaId: rows[i].m, faceIndex: rows[i].fi, distance: Math.round(d * 1000) / 1000 });
    }
    matches.sort(function (a, b) { return a.distance - b.distance; });
    /* unique by mediaId — one tile per photo, capped at MATCH_COUNT */
    var seen = {}, unique = [];
    matches.forEach(function (m) { if (!seen[m.mediaId]) { seen[m.mediaId] = 1; unique.push(m); } });
    return Promise.resolve({ ok: true, matches: unique.slice(0, MATCH_COUNT), scanned: rows.length, threshold: THRESHOLD });
  }

  /* ---------------- public API ---------------- */

  /* ---------------- FACE QUALITY CHECK (spec §5) ----------------
     A scan never searches until a usable face is present: exactly one
     primary face, large enough, reasonably centered, acceptable
     confidence, and not an extreme angle for this model. Each verdict
     maps to a client-safe message. */
  function analyzeFrame(videoEl) {
    if (!state.ready) return Promise.resolve({ ok: false, reason: 'loading' });
    if (!videoEl || !videoEl.videoWidth) return Promise.resolve({ ok: false, reason: 'no-face' });
    var cv = toCanvas(videoEl, videoEl.videoWidth, videoEl.videoHeight);
    return global.faceapi.detectAllFaces(cv, detectorOpts())
      .withFaceLandmarks()
      .then(function (dets) {
        var usable = dets.filter(function (d) { return d.detection.score >= 0.5; });
        if (!usable.length) return { ok: false, reason: 'no-face' };
        if (usable.length > 1) return { ok: false, reason: 'multiple' };
        var det = usable[0];
        var box = det.detection.box;
        var minSide = Math.min(cv.width, cv.height);
        if (box.height < minSide * 0.18 || box.width < minSide * 0.12) {
          return { ok: false, reason: 'too-small' };
        }
        var cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        if (cx < cv.width * 0.16 || cx > cv.width * 0.84 || cy < cv.height * 0.12 || cy > cv.height * 0.9) {
          return { ok: false, reason: 'off-center' };
        }
        /* extreme-angle proxy from the 68 landmarks: nose-tip offset from
           the eye-line midpoint, and eye-line roll — both normalised */
        var pts = det.landmarks.positions;
        var le = pts[36], re = pts[45], nose = pts[30];
        var eyeMidX = (le.x + re.x) / 2, eyeMidY = (le.y + re.y) / 2;
        var eyeDist = Math.max(8, Math.abs(re.x - le.x));
        var yaw = (nose.x - eyeMidX) / eyeDist;
        var roll = Math.abs(Math.atan2(re.y - le.y, re.x - le.x)) * 180 / Math.PI;
        if (Math.abs(yaw) > 0.55 || roll > 32) return { ok: false, reason: 'angle' };
        return { ok: true, reason: 'ok', score: det.detection.score, box: box };
      }).catch(function () { return { ok: false, reason: 'no-face' }; });
  }

  /* Per-verdict client-safe messages (spec §5/§27 wording). */
  var QUALITY_MESSAGES = {
    'no-face': 'No face detected.',
    'multiple': 'Please keep only one face inside the frame.',
    'too-small': 'Please move closer.',
    'off-center': 'Please center your face in the frame.',
    'angle': 'Please look toward the camera.'
  };
  function qualityMessage(reason) { return QUALITY_MESSAGES[reason] || 'No face detected.'; }

  /* createFaceEmbedding: quality-gated embedding for the live frame. */
  function createFaceEmbedding(videoEl) {
    return analyzeFrame(videoEl).then(function (q) {
      if (!q.ok) return { ok: false, reason: q.reason, message: qualityMessage(q.reason) };
      return describe(videoEl).then(function (desc) {
        if (!desc) return { ok: false, reason: 'no-face', message: qualityMessage('no-face') };
        return { ok: true, embedding: desc, message: 'Face detected. Scanning...' };
      });
    });
  }

  /* ---------------- local indexing-store APIs ----------------
     Used by the admin indexing service (indexingService.js) which
     owns job orchestration; the engine owns descriptor storage. */
  function trackResult(fnId, mediaId, faceCount) {
    var p = progress();
    var rec = p[fnId] || { done: [], failed: [], total: 0 };
    if (faceCount < 0) {
      var exists = rec.failed.some(function (f) { return f.id === mediaId; });
      if (!exists) rec.failed.push({ id: mediaId, reason: 'error' });
      rec.done = rec.done.filter(function (id) { return id !== mediaId; });
    } else {
      if (rec.done.indexOf(mediaId) === -1) rec.done.push(mediaId);
      rec.failed = rec.failed.filter(function (f) { return f.id !== mediaId; });
    }
    rec.total = Math.max(rec.total, rec.done.length + rec.failed.length);
    p[fnId] = rec;
    writeProgress(p);
    emit(fnId);
    return Promise.resolve();
  }

  /* drop rows for one photo, store fresh ones (duplicate protection) */
  function storeFaces(fnId, mediaId, clientId, faces) {
    var rows = idxRows().filter(function (r) { return r.m !== mediaId; });
    faces.forEach(function (f) {
      rows.push({ c: clientId, f: fnId, m: mediaId, fi: f.faceIndex,
                  d: Array.from(f.descriptor).map(function (x) { return Math.round(x * 1e4) / 1e4; }) });
    });
    writeRows(rows);
    return trackResult(fnId, mediaId, faces.length);
  }

  /* photos already processed (done) are skipped on every run —
     failed ones stay pending so they are retried (spec §17/§23) */
  function filterPending(photos) {
    var p = progress();
    return (photos || []).filter(function (ph) {
      var rec = p[ph.fnId];
      if (!rec) return true;
      return rec.done.indexOf(ph.id) === -1;
    });
  }

  /* Re-index helpers for the admin indexing service (spec §23). */
  function resetFunction(fnId) {
    writeRows(idxRows().filter(function (r) { return r.f !== fnId; }));
    var p = progress();
    delete p[fnId];
    writeProgress(p);
    emit(fnId);
  }

  /* Aggregate per-client stats for the admin AI panels (spec §19/§22). */
  function clientIndexStats(fnIds) {
    var rows = idxRows(), p = progress();
    var out = { photos: 0, indexed: 0, skipped: 0, failed: 0, faces: 0, complete: true, processing: false };
    (fnIds || []).forEach(function (fnId) {
      var rec = p[fnId];
      if (!rec) { out.complete = false; return; }
      out.photos += rec.total || 0;
      out.indexed += rec.done.filter(function (id) {
        return rows.some(function (r) { return r.f === fnId && r.m === id; });
      }).length;
      out.skipped += rec.done.length - rec.done.filter(function (id) {
        return rows.some(function (r) { return r.f === fnId && r.m === id; });
      }).length;
      out.failed += rec.failed.length;
      out.faces += rows.filter(function (r) { return r.f === fnId; }).length;
      if (rec.done.length + rec.failed.length < (rec.total || 0)) { out.complete = false; out.processing = true; }
    });
    return out;
  }

  var MarkipieFace = {
    ENGINE: 'face-api.js / TensorFlow.js',
    THRESHOLD: THRESHOLD,
    MATCH_COUNT: MATCH_COUNT,

    ready: isReady,
    loadModels: loadModels,
    describe: describe,
    describeImage: describeImage,
    distance: distance,

    /* spec §3/§5 — quality gate + naming parity */
    detectFace: function (videoEl) { return analyzeFrame(videoEl); },
    validateFaceQuality: function (analysis) { return !!(analysis && analysis.ok); },
    analyzeFrame: analyzeFrame,
    qualityMessage: qualityMessage,
    createFaceEmbedding: createFaceEmbedding,

    resetFunction: resetFunction,
    clientIndexStats: clientIndexStats,
    trackResult: trackResult,
    storeFaces: storeFaces,
    filterPending: filterPending,

    indexFunction: indexFunction,
    cancelIndexing: cancelIndexing,
    indexProgress: indexProgress,
    onIndexUpdate: onIndexUpdate,
    searchLocal: searchLocal,

    /* search(descriptor, {clientId}) — legacy-compatible entry.
       Local/demo mode searches the on-device index; configured mode
       is routed by galleryService (secure edge function, same
       descriptor-only contract). */
    search: function (descriptor, opts) {
      opts = opts || {};
      var GS = global.MKGallery;
      if (GS && GS.faceSearch) return GS.faceSearch(descriptor, opts);
      if (!opts.clientId) return Promise.resolve({ ok: false, reason: 'unscoped' });
      return searchLocal(descriptor, opts.clientId);
    }
  };

  global.MarkipieFace = MarkipieFace;
})(window);
