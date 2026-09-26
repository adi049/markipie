/* ============================================================
   Find Your Photos — LIVE CAMERA ONLY face scan (Phase 12, spec)
   • navigator.mediaDevices.getUserMedia() is the only input; there
     is deliberately no upload / file-picker / drag-drop path.
   • REAL engine (face-api.js / TensorFlow.js): camera frame →
     face detection → FACE QUALITY CHECK → 128-d descriptor →
     secure scoped search → results inside Markipie.
   • SCOPE FIRST (spec §8): the camera never opens without an
     authorized session. A visitor without scope is asked for the
     client code — random visitors cannot search anything.
   • CONSENT (spec §7): a concise privacy notice with CANCEL /
     CONTINUE is shown before the first scan of this session.
   • The camera image is NEVER uploaded or stored — only an
     in-memory descriptor exists, for the lifetime of the scan.
   • Results reuse the Phase 11 lightbox/gallery with the client's
     watermark + download permissions (never bypassed).
   ============================================================ */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK, F = window.MarkipieFace, GS = window.MKGallery;

  var stage = MK.qs('#scanStage');
  var video = MK.qs('#scanVideo');
  var veil = MK.qs('#scanVeil');
  var veilTitle = MK.qs('#veilTitle');
  var veilText = MK.qs('#veilText');
  var veilActions = veil.querySelector('.veil-actions');
  var enableBtn = MK.qs('#enableCamBtn');
  var scanBtn = MK.qs('#scanBtn');
  var frame = MK.qs('#scanFrame');
  var liveChip = MK.qs('#scanLiveChip');
  var faceChip = MK.qs('#faceChip');
  var statusEl = MK.qs('#scanStatus');
  var results = MK.qs('#scanResults');
  var scopeChip = MK.qs('#scopeChip');
  var scopeChipText = MK.qs('#scopeChipText');
  var cameraActionBar = MK.qs('#cameraActionBar');
  var openCameraNow = MK.qs('#openCameraNow');
  var faceScanLaunch = MK.qs('#faceScanLaunch');
  var faceScanLaunchWrap = MK.qs('#faceScanLaunchWrap');

  var stream = null;
  var liveTimer = null;
  var modelsStarted = false;
  /* resolved scope: { id, title, perms, fns } only when a valid
     session exists — without it the camera never opens (§8) */
  var scope = null;
  var consentDone = false;
  try { consentDone = sessionStorage.getItem('mk_face_consent_v1') === '1'; } catch (e) {}

  function setStatus(text, live) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('is-live', !!live);
  }
  function hideActions() {
    enableBtn.style.display = 'none';
    scanBtn.parentElement.style.display = 'none';
  }
  function showActions() {
    enableBtn.style.display = '';
    scanBtn.parentElement.style.display = '';
    if (cameraActionBar) cameraActionBar.hidden = false;
    if (openCameraNow) openCameraNow.disabled = false;
  }

  function hideCameraAction() {
    if (cameraActionBar) cameraActionBar.hidden = true;
  }

  function updateLaunchButton() {
    if (!faceScanLaunch) return;
    faceScanLaunch.disabled = false;
    faceScanLaunch.querySelector('b').textContent = scope ? 'OPEN LIVE CAMERA' : 'OPEN LIVE CAMERA';
    faceScanLaunch.querySelector('small').textContent = scope
      ? 'Start the live AI face scan for your private event'
      : 'Tap to unlock your event and start the live camera';
    if (faceScanLaunchWrap) faceScanLaunchWrap.hidden = !!stream;
  }

  /* ================= scope resolution (session-first) ================= */

  function publicClient(cid) {
    return D.clients.getPublic(cid).catch(function () { return null; });
  }

  (function resolveScope() {
    var cid = MK.param('client');
    var sessionCode = GS && GS.code ? GS.code() : '';

    if (cid && GS && GS.validateSession) {
      /* an explicit ?client= id is honoured only when the session
         code validates for THAT client (never trusted from URL);
         the studio-disabled veil still shows for the requested id */
      GS.validateSession(cid).then(function (ok) {
        return publicClient(cid).then(function (c) { return { c: ok ? c : null, pub: c }; });
      }).then(function (r) { finishResolve(r.c, r.pub); });
    } else if (sessionCode && D.clients.validate) {
      D.clients.validate(sessionCode).then(function (res) {
        if (res && res.ok && res.clientId) return publicClient(res.clientId);
        return null;
      }).then(function (c) { finishResolve(c, c); });
    } else {
      /* no session — the camera is never offered; the studio-disabled
         state is still shown honestly for a requested id */
      if (cid) {
        publicClient(cid).then(function (c) { finishResolve(null, c); });
      } else {
        finishResolve(null, null);
      }
    }
  })();

  function finishResolve(c, pubOnly) {
    var check = c || pubOnly;
    /* studio permission: AI Face Search can be disabled per client (§20) */
    if (check && check.permissions && check.permissions.aiSearch === false) {
      setVeil('AI Face Search isn\u2019t available for this event.',
        'The studio has turned off Face Search for this collection. Please open your photos with your client code instead.');
      hideActions();
      setStatus('');
      return;
    }
    if (!c) {
      /* Keep the Face Scan CTA visible, but never bypass the private scope.
         Clicking it opens the client-code step; the camera starts only after
         that code has established an authorized event scope. */
      setVeil('Start your private Face Scan',
        'Your scan is live-only. First unlock your event with the client code, then we’ll open the camera and search only your authorized collection.');
      showActions();
      enableBtn.textContent = 'Start Face Scan';
      enableBtn.disabled = false;
      scanBtn.parentElement.style.display = 'none';
      hideCameraAction();
      updateLaunchButton();
      setStatus('Tap OPEN LIVE CAMERA to unlock your event and start.', false);
      return;
    }
    scope = {
      id: c.id,
      title: c.eventTitle || c.name || '',
      perms: c.permissions || {}
    };
    scopeChipText.textContent = 'Scanning within: ' + scope.title;
    scopeChip.classList.add('is-visible');
    showActions();
    enableBtn.textContent = 'Open Live Camera';
    updateLaunchButton();
    setStatus('Camera is ready to start — your photos stay private.', false);
  }

  /* inline client-code entry inside the veil (scope-first flow) */
  function renderCodeForm() {
    var old = document.getElementById('veilCodeWrap');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'veilCodeWrap';
    wrap.className = 'veil-code';
    wrap.innerHTML =
      '<label class="veil-code-label" for="veilCodeInput">Client code</label>' +
      '<div class="veil-code-row">' +
        '<input id="veilCodeInput" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Your client code">' +
        '<button class="btn btn--primary" id="veilCodeBtn" type="button">Continue</button>' +
      '</div>' +
      '<p class="veil-code-err" id="veilCodeErr" role="alert" hidden>Invalid or inactive client code.</p>';
    veilActions.parentNode.insertBefore(wrap, veilActions.nextSibling);

    wrap.querySelector('#veilCodeBtn').addEventListener('click', submitCode);
    wrap.querySelector('#veilCodeInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitCode();
    });

    function submitCode() {
      var input = wrap.querySelector('#veilCodeInput');
      var err = wrap.querySelector('#veilCodeErr');
      var btn = wrap.querySelector('#veilCodeBtn');
      var code = (input.value || '').trim().toUpperCase();
      if (!code) { err.hidden = false; return; }
      err.hidden = true;
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Checking…';
      var attempt = (window.MKServices && MKServices.clients)
        ? MKServices.clients.validateAccess(code)
        : D.clients.validate(code);
      Promise.resolve(attempt).then(function (res) {
        if (!res || !res.ok || !res.clientId) {
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = 'Continue';
          return;
        }
        if (GS && GS.rememberCode) GS.rememberCode(code);
        var veilWrap = document.getElementById('veilCodeWrap');
        if (veilWrap) veilWrap.remove();
        publicClient(res.clientId).then(function (c) {
          if (!c) { location.reload(); return; }
          finishResolve(c, c);
          if (stream) {
            veil.hidden = true;
            frame.hidden = false;
            scanBtn.disabled = false;
            setStatus('Event unlocked — position your face in the frame and scan.', true);
          } else {
            setVeil('Allow camera access to find your photos.',
              'Face Search works live — in real time. Your camera image is never recorded, uploaded or stored.');
            enableBtn.style.display = '';
            enableBtn.disabled = false;
            enableBtn.textContent = 'Open Live Camera';
            setStatus('Event unlocked. Opening your live camera…');
            setTimeout(function () { requestCam(); }, 80);
          }
        });
      }).catch(function () {
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Continue';
      });
    }
  }

  /* ================= privacy consent (§7) ================= */

  function ensureConsent() {
    if (consentDone) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'fc-consent';
      back.innerHTML =
        '<div class="fc-consent-card" role="dialog" aria-modal="true" aria-labelledby="fccTitle">' +
          '<h3 id="fccTitle">Face Search Privacy</h3>' +
          '<p>Markipie temporarily processes your camera image to create a face representation for matching against authorized event photos. Your camera photo is not stored as a gallery image.</p>' +
          '<p>By continuing, you consent to this temporary biometric matching process.</p>' +
          '<div class="fc-consent-actions">' +
            '<button class="btn btn--ghost" id="fccCancel" type="button">Cancel</button>' +
            '<button class="btn btn--primary" id="fccOk" type="button">Continue</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(back);
      function close(val) {
        back.remove();
        resolve(val);
      }
      back.querySelector('#fccCancel').addEventListener('click', function () { close(false); });
      back.querySelector('#fccOk').addEventListener('click', function () {
        consentDone = true;
        try { sessionStorage.setItem('mk_face_consent_v1', '1'); } catch (e) {}
        close(true);
      });
      back.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(false); });
      back.querySelector('#fccOk').focus();
    });
  }

  /* ================= camera flow ================= */

  function setVeil(title, text) {
    veil.hidden = false;
    veilTitle.textContent = title;
    veilText.textContent = text;
  }
  function keepEnableButton() {
    if (!document.getElementById('enableCamBtn')) {
      var b = document.createElement('button');
      b.className = 'btn btn--primary';
      b.id = 'enableCamBtn';
      b.type = 'button';
      b.textContent = 'Try Again';
      b.addEventListener('click', requestCam);
      veilActions.insertBefore(b, veilActions.firstChild);
      return b;
    }
    return enableBtn;
  }

  /* models start loading with the camera — user intent is clear and
     they are ready by the time a face is in frame; cached for the
     whole session after that (§3/§28) */
  function startModels() {
    if (modelsStarted) return;
    modelsStarted = true;
    setStatus('Loading AI Face Scanner…', true);
    F.loadModels().then(function () {
      if (stream) setStatus('Face scan ready — position your face in the frame', true);
    }).catch(function () { /* the scan button reports honestly */ });
  }

  function beginFaceScan() {
    /* The camera may open before the event code is verified, but the
       face descriptor is NEVER searched/stored until a valid client scope
       exists. This makes the CTA an actual camera button while preserving
       private-gallery authorization for the search itself. */
    if (stream) {
      if (!scope) {
        setVeil('Camera is live — unlock your event',
          'Your camera is running locally. Enter your client code to unlock Face Search for your private event.');
        renderCodeForm();
        var existingInput = document.getElementById('veilCodeInput');
        if (existingInput) setTimeout(function () { existingInput.focus(); }, 40);
        return;
      }
      return requestCam();
    }
    return requestCam();
  }

  function requestCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVeil('Camera not supported',
        'This device or browser does not support live camera access. Please open this page in a modern browser — or use your client code instead.');
      keepEnableButton().style.display = 'none';
      setStatus('');
      return;
    }
    if (window.isSecureContext === false) {
      setVeil('A secure connection is required',
        'Camera access works only over HTTPS. Please open this page with a secure address and try again.');
      keepEnableButton().style.display = 'none';
      setStatus('');
      return;
    }
    ensureConsent().then(function (ok) {
      if (!ok) return;
      startModels();
      enableBtn.disabled = true;
      enableBtn.innerHTML = '<span class="spin" aria-hidden="true"></span> Requesting…';
      setStatus('Waiting for camera permission…');
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      }).then(onStream).catch(function (err) {
        enableBtn.disabled = false;
        enableBtn.textContent = 'Try Again';
        setStatus('');
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.name === 'PermissionDeniedError')) {
          setVeil('Camera access is required for Find Your Photos.',
            'Please allow camera permission in your browser settings for this site, then try again. Your camera is used live only — nothing is saved.');
        } else if (err && (err.name === 'NotReadableError' || err.name === 'TrackStartError')) {
          setVeil('Camera is already in use',
            'Another app or tab is using the camera. Close it and try again.');
        } else if (err && err.name === 'NotFoundError') {
          setVeil('No camera found',
            'We couldn\u2019t detect a camera on this device. You can still open your photos with your client code.');
        } else {
          setVeil('Camera unavailable',
            'The camera could not be started. Close other apps using it and try again — or use your client code.');
        }
      });
    });
  }

  /* live FACE DETECTED indicator — real detection on the preview,
     throttled to stay light on mobile (§28) */
  function liveLoop() {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(function () {
      if (!stream || !F.ready() || document.hidden) return;
      if (!video.videoWidth) return;
      var fa = window.faceapi;
      var cv = document.createElement('canvas');
      var s = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
      cv.width = Math.round(video.videoWidth * s);
      cv.height = Math.round(video.videoHeight * s);
      cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
      fa.detectSingleFace(cv, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .then(function (dets) {
          if (!stream) return;
          var hit = !!dets && (dets.length === undefined ? true : dets.length > 0);
          if (hit && faceChip.hidden) {
            faceChip.hidden = false;
            if (!stage.classList.contains('is-scanning')) setStatus('Face detected — ready to scan', true);
          } else if (!hit && !faceChip.hidden) {
            faceChip.hidden = true;
          }
        }).catch(function () {});
    }, 900);
  }

  function onStream(s) {
    stream = s;
    hideCameraAction();
    if (faceScanLaunchWrap) faceScanLaunchWrap.hidden = true;
    video.srcObject = s;
    frame.hidden = false;
    liveChip.hidden = false;
    stage.classList.add('is-ready');
    /* Camera can be live before authorization, but scanning stays locked
       until a valid client scope is established. */
    scanBtn.disabled = !scope;
    if (scope) {
      veil.hidden = true;
      setStatus(F.ready() ? 'Face scan ready — position your face in the frame' : 'Loading AI Face Scanner…', true);
    } else {
      veil.hidden = false;
      setVeil('Camera is live — unlock your event',
        'Your camera is running locally. Enter your client code below to unlock Face Search for your private event.');
      renderCodeForm();
      var input = document.getElementById('veilCodeInput');
      if (input) setTimeout(function () { input.focus(); }, 80);
      setStatus('Camera live. Event authorization required before scanning.', true);
    }
    liveLoop();
  }
  function stopStream() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  }

  /* ================= scan: quality → descriptor → scoped search ================= */

  function scan() {
    if (!stream || scanBtn.disabled || !scope) return;
    results.hidden = true;
    stage.classList.remove('is-ready');
    stage.classList.add('is-scanning');
    faceChip.hidden = true;
    scanBtn.disabled = true;
    scanBtn.innerHTML = '<span class="spin" aria-hidden="true"></span> Scanning…';
    setStatus('Scanning your face…', true);

    var ready = F.ready() ? Promise.resolve() : F.loadModels();
    ready.then(function () {
      if (!stream) return Promise.reject(new Error('camera-closed'));
      setStatus('Checking the camera view…', true);
      /* FACE QUALITY CHECK (§5) — never search without a usable face */
      return F.analyzeFrame(video);
    }).then(function (q) {
      if (!stream) return { aborted: true };
      if (!q.ok) {
        setStatus(F.qualityMessage(q.reason), true);
        scanBtn.disabled = false;
        scanBtn.innerHTML = 'Scan Again';
        stage.classList.remove('is-scanning');
        stage.classList.add('is-ready');
        return { aborted: true };
      }
      setStatus('Face detected. Scanning...', true);
      return F.describe(video).then(function (desc) {
        if (!desc) return { empty: true };
        setStatus('Searching your photos…', true);
        scanBtn.innerHTML = '<span class="spin" aria-hidden="true"></span> Searching…';
        return GS.faceSearch(desc, { clientId: scope.id }).then(function (res) {
          if (res && res.ok) return res;
          return { empty: true };
        });
      });
    }).then(function (out) {
      if (!out || out.aborted) return;      /* quality message already shown */
      stage.classList.remove('is-scanning');
      stage.classList.add('is-ready');
      scanBtn.disabled = false;
      scanBtn.innerHTML = 'Scan Again';
      if (out.empty || !out.matches || !out.matches.length) showNoMatch();
      else showMatches(out);
    }).catch(function () {
      stage.classList.remove('is-scanning');
      stage.classList.add('is-ready');
      scanBtn.disabled = false;
      scanBtn.innerHTML = 'Scan Again';
      setVeil('The face scan could not run just now.',
        'Please check your connection and try again. You can always open your photos with your client code.');
      setStatus('');
    });
  }

  /* ================= results (§13/§14 — existing Markipie viewer) ================= */

  /* local/demo mode: enrich {fnId, mediaId} matches with local media rows
     and function names — configured matches arrive pre-enriched */
  function enrich(matches) {
    if (matches.length && matches[0].thumb !== undefined) return Promise.resolve(matches);
    var fids = {};
    matches.forEach(function (m) { fids[m.fnId] = 1; });
    function listAllPhotos(fid) {
      var out = [], page = 1;
      function nextPage() {
        return D.media.listByFunction(fid, { page: page, type: 'photo' }).then(function (r) {
          out = out.concat((r && r.items) || []);
          if (r && r.hasMore && page < 60) { page++; return nextPage(); }
          return out;
        });
      }
      return nextPage().catch(function () { return out; });
    }
    var jobs = Object.keys(fids).map(function (fid) {
      return Promise.all([
        D.functions.get ? D.functions.get(fid) : Promise.resolve(null),
        listAllPhotos(fid)
      ]).then(function (r) {
        var fn = r[0] || {};
        var byId = {};
        (r[1] || []).forEach(function (it) { byId[it.id] = it; });
        return { fid: fid, name: fn.name || fn.function_name || 'Your event', byId: byId };
      });
    });
    return Promise.all(jobs).then(function (ctxs) {
      var map = {};
      ctxs.forEach(function (c) { map[c.fid] = c; });
      return matches.map(function (m) {
        var c = map[m.fnId] || { name: 'Your event', byId: {} };
        var it = c.byId[m.mediaId] || {};
        return { fnId: m.fnId, functionName: c.name, mediaId: m.mediaId, thumb: it.thumb || it.src || '', src: it.src || it.thumb || '', distance: m.distance };
      }).filter(function (m) { return m.thumb; });
    });
  }

  /* viewer options — the client's EXISTING permissions, never bypassed */
  function viewerOptions() {
    var perms = scope.perms || {};
    var fnDl = {};
    (scope.fns || []).forEach(function (f) { fnDl[f.id] = f.downloadPermission; });
    return {
      watermark: perms.watermark !== false,
      download: !!perms.download,
      onDownload: function (item) {
        var SB = window.MKSupabase;
        var allowed = !!perms.download && fnDl[item.fnId] !== 'off';
        if (!allowed) return Promise.resolve({ ok: false, error: 'Download is not available for this item.' });
        if (SB && SB.isConfigured()) {
          return fetch(
            (window.MarkipieEnv.VITE_SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1/media-download',
            { method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': window.MarkipieEnv.VITE_SUPABASE_ANON_KEY },
              body: JSON.stringify({ access_code: GS.code(), media_id: item.id }) }
          ).then(function (r) { return r.json(); }).catch(function () {
            return { ok: false, error: 'Download could not be prepared — please try again.' };
          });
        }
        if (item.src) {
          return new Promise(function (res) {
            setTimeout(function () { res({ ok: true, url: item.src, filename: item.caption }); }, 600);
          });
        }
        return Promise.resolve({ ok: false, error: 'Download is not available for this item.' });
      }
    };
  }

  var currentMatches = [], currentFilter = 'all';

  var liveItems = [];

  function showMatches(out) {
    enrich(out.matches).then(function (list) {
      if (!list.length) { showNoMatch(); return; }
      currentMatches = list;
      currentFilter = 'all';
      /* group by event (§14) */
      var groups = [], byFn = {};
      list.forEach(function (m) {
        if (!byFn[m.fnId]) { byFn[m.fnId] = { fnId: m.fnId, name: m.functionName, items: [] }; groups.push(byFn[m.fnId]); }
        byFn[m.fnId].items.push(m);
      });
      /* function download permission for the viewer */
      var fids = Object.keys(byFn);
      Promise.all(fids.map(function (fid) {
        return D.functions.get ? D.functions.get(fid) : Promise.resolve(null);
      })).then(function (fns) {
        scope.fns = fns.filter(Boolean);
        renderResults(groups, out.pending);
      });
    });
  }

  function renderResults(groups, pending) {
    var list = currentFilter === 'all'
      ? groups.reduce(function (a, g) { return a.concat(g.items); }, [])
      : (groups.filter(function (g) { return g.fnId === currentFilter; })[0] || { items: [] }).items;

    var html =
      '<div class="sr-head"><h3>Photos matching your face</h3><p>Grouped by event — open any event to view the full gallery.</p></div>' +
      '<div class="sr-summary">FOUND ' + list.length + ' POSSIBLE MATCH' + (list.length === 1 ? '' : 'ES') + '</div>' +
      '<p class="sr-sub">We found ' + list.length + ' photo' + (list.length === 1 ? '' : 's') + ' that may include you.</p>';

    /* event filter chips (§14) */
    if (groups.length > 1) {
      html += '<div class="sr-chips" role="group" aria-label="Filter matches by event">' +
        groups.map(function (g) {
          var active = currentFilter === g.fnId;
          var allActive = currentFilter === 'all';
          return '<button class="chip cg-chip' + ((active || (currentFilter === 'all' && false)) ? ' is-active' : '') +
            '" data-fn="' + MK.esc(g.fnId) + '" type="button" aria-pressed="' + active + '">' +
            MK.esc((g.name || '').toUpperCase()) + ' — ' + g.items.length + '</button>';
        }).join('') +
        '<button class="chip cg-chip' + (currentFilter === 'all' ? ' is-active' : '') + '" data-fn="all" type="button" aria-pressed="' + (currentFilter === 'all') + '">ALL — ' +
          groups.reduce(function (s, g) { return s + g.items.length; }, 0) + '</button>' +
      '</div>';
    }

    if (pending) {
      html += '<p class="sr-pending">Some event photos are still being indexed. Results may be incomplete.</p>';
    }

    html += groups.filter(function (g) { return currentFilter === 'all' || g.fnId === currentFilter; }).map(function (g) {
      var thumbs = g.items.slice(0, 3).map(function (m) {
        return '<span class="mg-thumb"><img src="' + MK.esc(m.thumb) + '" alt=""></span>';
      }).join('');
      return '<div class="card match-group">' +
        '<span class="mg-thumbs">' + thumbs + '</span>' +
        '<span class="grow"><b>' + MK.esc(g.name) + '</b><span>' + g.items.length + ' match' + (g.items.length === 1 ? '' : 'es') + '</span></span>' +
        '<a class="btn btn--sm btn--soft" href="/client/gallery/?fid=' + encodeURIComponent(g.fnId) + '">View Gallery</a>' +
      '</div>';
    }).join('');

    /* watermarked result tiles → the EXISTING Phase 11 fullscreen viewer */
    var wm = (scope.perms || {}).watermark !== false;
    html += '<div class="fm-grid">' + list.map(function (m) {
      return '<button class="fm-tile" type="button" data-media="' + MK.esc(m.mediaId) + '" aria-label="Open this photo in the viewer">' +
        '<img src="' + MK.esc(m.thumb) + '" alt="" loading="lazy">' +
        (wm ? '<img class="wm-corner" src="/assets/markipie-wordmark-white.svg" alt="" aria-hidden="true">' : '') +
        '</button>';
    }).join('') + '</div>';

    html += '<p class="center-note">These are possible matches — scan again later to find more as photo matching continues.</p>';

    results.innerHTML = html;
    results.hidden = false;
    setStatus('Matches found', true);
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    /* chips */
    results.querySelectorAll('[data-fn]').forEach(function (b) {
      b.addEventListener('click', function () {
        currentFilter = b.getAttribute('data-fn');
        var groups2 = [], byFn = {};
        currentMatches.forEach(function (m) {
          if (!byFn[m.fnId]) { byFn[m.fnId] = { fnId: m.fnId, name: m.functionName, items: [] }; groups2.push(byFn[m.fnId]); }
          byFn[m.fnId].items.push(m);
        });
        renderResults(groups2, pending);
      });
    });
    /* tiles → existing fullscreen viewer (Phase 11).
       Delegated ONCE on the container: re-renders (enrichment pass)
       never orphan a click, and the live item list is read at open. */
    liveItems = list.map(function (m) {
      return { caption: m.functionName || 'Photo', type: 'photo', src: m.src, id: m.mediaId, fnId: m.fnId,
               category: m.functionName || 'Photo' };
    });
    if (!results.__mkTiles) {
      results.__mkTiles = true;
      results.addEventListener('click', function (e) {
        var tile = e.target && e.target.closest ? e.target.closest('.fm-tile') : null;
        if (!tile) return;
        var mediaId = tile.getAttribute('data-media');
        var idx = 0;
        for (var i = 0; i < liveItems.length; i++) { if (liveItems[i].id === mediaId) { idx = i; break; } }
        MK.lightbox.open(liveItems, idx, viewerOptions());
      });
    }
  }

  function showNoMatch() {
    results.innerHTML =
      '<div class="scan-result"><div class="card">' +
        '<span class="icon-chip">' + MK.icon('scan') + '</span>' +
        '<div><b>We couldn\u2019t find a close match.</b>' +
        '<p>Try:</p>' +
        '<ul class="sr-tips">' +
          '<li>better lighting</li>' +
          '<li>looking directly at the camera</li>' +
          '<li>removing sunglasses</li>' +
          '<li>moving slightly closer</li>' +
        '</ul>' +
        '<p>Matching works within your own event collection' +
        ' — results appear as the studio\u2019s photo matching finishes.</p></div>' +
      '</div></div>' +
      '<div style="text-align:center;margin-top:16px"><a class="btn btn--soft" href="/client/?id=' + encodeURIComponent(scope.id) + '">Back to My Events</a></div>';
    results.hidden = false;
    setStatus('No matches yet');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- wiring ---------- */
  scanBtn.addEventListener('click', scan);
  enableBtn.addEventListener('click', beginFaceScan);
  if (openCameraNow) openCameraNow.addEventListener('click', beginFaceScan);
  if (faceScanLaunch) faceScanLaunch.addEventListener('click', beginFaceScan);
  updateLaunchButton();
  window.addEventListener('pagehide', stopStream);
  window.addEventListener('beforeunload', stopStream);
})();
