/* MARKIPIE — private client gallery
   access flow (code → phone match → optional OTP → IG gate) + AI face match + selections */
(function () {
  'use strict';
  var app = document.getElementById('capp');
  if (!app) return;
  var CODE = app.getAttribute('data-code');
  var $ = function (id) { return document.getElementById(id); };
  var state = {
    title: '', media: [], videos: [], selections: new Set(), favs: new Set(),
    ai: null, aiScores: {}, perms: {}, tab: 'all', phone: '', threshold: 0.55,
    minConfidence: 0.4, maxScan: 2000, otpRequired: false, igReq: false, face: false
  };

  function show(el) { el && el.classList.remove('hidden'); }
  function hide(el) { el && el.classList.add('hidden'); }
  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Unexpected server response.' }; }); });
  }
  function err(msg) {
    var box = $('cerr');
    if (!box) { alert(msg); return; }
    box.textContent = msg; show(box);
    clearTimeout(box._t); box._t = setTimeout(function () { hide(box); }, 6000);
  }
  function toast(msg) {
    var t = $('ctoast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ---------- steps ---------- */
  var steps = ['step-code', 'step-phone', 'step-otp', 'step-ig'].map($);
  function goStep(i) { steps.forEach(function (s, k) { if (s) s.classList.toggle('hidden', k !== i); }); }

  $('cform-code').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('cc-code').value.trim();
    if (!code) return;
    var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
    post('/api/client/verify', { code: code }).then(function (j) {
      btn.disabled = false;
      if (!j.ok) { err(j.error); return; }
      state.title = j.title; state.igReq = j.instagramRequired; state.face = j.face; state.otpRequired = j.otp;
      CODE = code;
      // §3: the stored number is never revealed, not even partially.
      if ($('phone-hint')) $('phone-hint').textContent = 'Enter the mobile number you gave the studio for this event.';
      goStep(1);
    }).catch(function () { btn.disabled = false; err('Network error. Please try again.'); });
  });

  $('cform-phone').addEventListener('submit', function (e) {
    e.preventDefault();
    var phone = $('cc-phone').value.trim();
    var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
    post('/api/client/phone', { code: CODE, phone: phone }).then(function (j) {
      btn.disabled = false;
      if (!j.ok) { err(j.error); return; }
      state.phone = phone;
      state.otpRequired = j.otpRequired;
      state.igReq = j.instagramRequired;
      if (j.otpRequired) { sendOtp(); goStep(2); }
      else if (j.instagramRequired) goStep(3);
      else unlock(false);
    }).catch(function () { btn.disabled = false; err('Network error. Please try again.'); });
  });

  /* OTP step */
  function sendOtp() {
    $('otp-status').textContent = 'Sending code…';
    post('/api/client/otp/send', {}).then(function (j) {
      $('otp-status').textContent = j.ok ? ('Code sent to ' + (j.sentTo || 'your phone')) : j.error;
    });
  }
  if ($('otp-resend')) $('otp-resend').addEventListener('click', function (e) { e.preventDefault(); sendOtp(); });
  if ($('cform-otp')) $('cform-otp').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
    post('/api/client/otp/verify', { code: $('cc-otp').value.trim() }).then(function (j) {
      btn.disabled = false;
      if (!j.ok) { err(j.error); return; }
      if (state.igReq) goStep(3); else unlock(false);
    });
  });

  var igClicked = false;
  $('iglink').addEventListener('click', function () { igClicked = true; $('igcheck').disabled = false; });
  $('igcheck').addEventListener('change', function () { $('iggo').disabled = !this.checked; });
  $('iggo').addEventListener('click', function () { unlock(true); });

  function unlock(ig) {
    post('/api/client/unlock', { instagram: ig }).then(function (j) {
      if (!j.ok) { err(j.error); return; }
      steps.forEach(hide);
      load();
    });
  }

  /* ---------- gallery ---------- */
  function load() {
    fetch('/api/client/media').then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) { err(j.error || 'Session expired'); goStep(0); return; }
      var ev = j.event;
      state.media = ev.media || []; state.videos = ev.videos || [];
      state.selections = new Set(ev.selections); state.favs = new Set(ev.favourites);
      state.perms = ev.permissions || {};
      state.perms.download = ev.allowDownload; state.perms.share = ev.allowShare;
      state.face = ev.face;
      state.threshold = ev.threshold || 0.55;
      state.minConfidence = ev.minConfidence || 0.4;
      state.maxScan = ev.maxScan || 2000;

      $('c-title').textContent = ev.clientName || ev.title;
      $('c-event').textContent = ev.eventType || '';
      $('c-date').textContent = fmtDate(ev.date) + (ev.location ? ' · ' + ev.location : '');
      $('c-stats').innerHTML =
        '<span><b>' + state.media.length + '</b> Photos</span>' +
        '<span><b>' + state.videos.length + '</b> Videos</span>' +
        '<span><b id="fav-n">' + state.favs.size + '</b> Favourites</span>' +
        '<span><b id="sel-n">' + state.selections.size + '</b> Selected</span>';

      var badges = $('c-badges');
      badges.innerHTML = '<span class="badge b-live">● Live</span>' +
        (ev.paymentStatus === 'paid' ? '<span class="badge b-ok">Payment Complete</span>' : '<span class="badge b-warn">Payment ' + ev.paymentStatus + '</span>') +
        (state.perms.download ? '<span class="badge b-ok">Downloads On</span>' : '<span class="badge b-warn">Downloads Locked</span>') +
        (state.perms.share ? '<span class="badge b-ok">Sharing On</span>' : '');

      if (!state.perms.download) {
        var pay = $('c-pay');
        pay.innerHTML = '🔒 Downloads ' + (ev.paymentStatus === 'paid' ? 'are disabled for this event by the studio.' : 'unlock after final payment — verified securely on our side.') + ' You can still view, favourite and select photos.';
        show(pay);
      }
      if (!state.face) hide($('btn-face'));
      if (!state.perms.selection) { hide($('btn-selall')); hide($('btn-desel')); hide($('btn-save')); }
      steps.forEach(hide);
      show($('cmain'));
      render();
    }).catch(function () { err('Could not load your gallery.'); });
  }

  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d); if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function currentList() {
    if (state.tab === 'videos') return state.videos;
    if (state.tab === 'ai') return state.media.filter(function (m) { return state.ai && state.ai.has(m.id); });
    if (state.tab === 'sel') return allMedia().filter(function (m) { return state.selections.has(m.id); });
    if (state.tab === 'fav') return allMedia().filter(function (m) { return state.favs.has(m.id); });
    return state.media;
  }
  function allMedia() { return state.media.concat(state.videos); }

  function thumbOf(m) { return m.thumb || m.src; }

  function render() {
    var grid = $('c-grid');
    var list = currentList();
    grid.innerHTML = '';
    $('c-empty').classList.toggle('hidden', list.length > 0);
    var sn = $('sel-n'), fn = $('fav-n');
    if (sn) sn.textContent = state.selections.size;
    if (fn) fn.textContent = state.favs.size;
    $('selcount').textContent = state.selections.size;

    var frag = document.createDocumentFragment();
    list.forEach(function (m) {
      var fig = document.createElement('figure');
      fig.className = 'c-item' + (state.selections.has(m.id) ? ' sel' : '') + (state.favs.has(m.id) ? ' fav' : '');
      fig.setAttribute('data-id', m.id);
      if (m.type === 'video') {
        fig.innerHTML = '<video src="' + m.src + '" ' + (m.poster ? 'poster="' + m.poster + '"' : '') + ' muted loop playsinline preload="metadata"></video><span class="m-play">▶</span>';
        fig.addEventListener('pointerenter', function () { var v = fig.querySelector('video'); if (v && v.play) v.play().catch(function () {}); });
        fig.addEventListener('pointerleave', function () { var v = fig.querySelector('video'); if (v && v.pause) v.pause(); });
      } else {
        var im = document.createElement('img');
        im.loading = 'lazy'; im.decoding = 'async'; im.src = thumbOf(m); im.alt = m.alt || 'Event photograph';
        im.addEventListener('error', function () { fig.classList.add('broken'); im.replaceWith(Object.assign(document.createElement('div'), { className: 'c-broken', textContent: 'Unavailable' })); });
        fig.appendChild(im);
      }
      if (state.aiScores[m.id] != null) {
        var conf = state.aiScores[m.id];
        fig.insertAdjacentHTML('beforeend', '<span class="c-conf ' + (conf === 'high' ? 'hi' : 'maybe') + '">' + (conf === 'high' ? 'High match' : 'Possible') + '</span>');
      }
      var acts = document.createElement('span');
      acts.className = 'c-flags';
      acts.innerHTML =
        (state.perms.selection !== false ? '<button class="cf selb" aria-label="Select for album">' + (state.selections.has(m.id) ? '✓' : '＋') + '</button>' : '') +
        (state.perms.favorites !== false ? '<button class="cf favb" aria-label="Favourite">' + (state.favs.has(m.id) ? '♥' : '♡') + '</button>' : '');
      fig.appendChild(acts);
      var sb = acts.querySelector('.selb'), fb = acts.querySelector('.favb');
      if (sb) sb.addEventListener('click', function (e) { e.stopPropagation(); toggleSel(m.id); });
      if (fb) fb.addEventListener('click', function (e) { e.stopPropagation(); toggleFav(m.id); });
      fig.addEventListener('click', function () { openLB(m); });
      frag.appendChild(fig);
    });
    grid.appendChild(frag);
  }

  var saveTimer = null;
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      post('/api/client/save', { selections: Array.from(state.selections), favourites: Array.from(state.favs) });
    }, 900);
  }
  function toggleSel(id) { state.selections.has(id) ? state.selections.delete(id) : state.selections.add(id); render(); autosave(); }
  function toggleFav(id) { state.favs.has(id) ? state.favs.delete(id) : state.favs.add(id); render(); autosave(); }

  $('c-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    $('c-tabs').querySelectorAll('.chip').forEach(function (c) { c.classList.remove('on'); });
    b.classList.add('on'); state.tab = b.getAttribute('data-tab'); render();
  });
  $('btn-selall').addEventListener('click', function () { currentList().forEach(function (m) { state.selections.add(m.id); }); render(); autosave(); });
  $('btn-desel').addEventListener('click', function () { state.selections.clear(); render(); autosave(); });
  $('btn-save').addEventListener('click', function () {
    post('/api/client/save', { selections: Array.from(state.selections), favourites: Array.from(state.favs) })
      .then(function (j) { j.ok ? toast('✓ Selection saved — ' + state.selections.size + ' photos shared with your photographer.') : err(j.error || 'Could not save.'); });
  });
  if ($('btn-logout')) $('btn-logout').addEventListener('click', function () {
    post('/api/client/logout', {}).then(function () { location.reload(); });
  });

  /* ---------- lightbox ---------- */
  var lb = $('lightbox'), stage = $('lbstage'), cur = null;
  function idx() { return currentList().findIndex(function (m) { return m.id === (cur && cur.id); }); }
  function openLB(m) {
    cur = m; lb.classList.add('on'); lb.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock');
    stage.innerHTML = '';
    if (m.type === 'video') {
      var v = document.createElement('video'); v.src = m.src; v.controls = true; v.autoplay = true; v.playsInline = true;
      stage.appendChild(v);
    } else {
      var img = document.createElement('img'); img.src = m.src; img.alt = m.alt || ''; stage.appendChild(img);
    }
    var list = currentList(), i = idx();
    $('lbcount').textContent = (i + 1) + ' / ' + list.length + (m.alt ? ' · ' + m.alt : '');
    var canDl = state.perms.download && (m.type === 'video' ? state.perms.downloadVideos !== false : state.perms.downloadPhotos !== false);
    $('lbdl').classList.toggle('hidden', !canDl);
    $('lbshare').classList.toggle('hidden', !state.perms.share);
    $('lbfav').classList.toggle('hidden', state.perms.favorites === false);
    $('lbsel').classList.toggle('hidden', state.perms.selection === false);
    $('lbfav').textContent = state.favs.has(m.id) ? '♥ Favourited' : '♡ Favourite';
    $('lbsel').textContent = state.selections.has(m.id) ? '✓ Selected' : 'Select for Album';
    lb.querySelector('.lb-prev').style.display = list.length > 1 ? '' : 'none';
    lb.querySelector('.lb-next').style.display = list.length > 1 ? '' : 'none';
  }
  function step(n) {
    var list = currentList(); if (!list.length) return;
    var i = idx(); if (i < 0) return;
    openLB(list[(i + n + list.length) % list.length]);
  }
  function closeLB() { lb.classList.remove('on'); lb.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); stage.innerHTML = ''; }
  lb.querySelector('.lb-x').addEventListener('click', closeLB);
  lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); });
  $('lbfav').addEventListener('click', function () { if (cur) { toggleFav(cur.id); openLB(cur); } });
  $('lbsel').addEventListener('click', function () { if (cur) { toggleSel(cur.id); openLB(cur); } });
  $('lbdl').addEventListener('click', function () {
    if (!cur) return;
    // server re-verifies every permission; the button is only a convenience
    var a = document.createElement('a');
    a.href = '/api/client/download/' + encodeURIComponent(cur.id);
    a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('lbshare').addEventListener('click', function () {
    if (!cur) return;
    var btn = $('lbshare');
    if (btn.dataset.busy === '1') return;           // prevent duplicate submits
    btn.dataset.busy = '1';
    // Ask the SERVER for a real share link. If sharing is disabled the
    // backend rejects it — the button state is never the security boundary.
    post('/api/client/share', {}).then(function (j) {
      btn.dataset.busy = '';
      if (!j || !j.ok) { err((j && j.error) || 'Sharing is not available.'); return; }
      var url = location.origin + j.url;
      if (navigator.share) {
        navigator.share({ title: 'MARKIPIE Gallery', text: 'A gallery shared with you', url: url })
          .catch(function () { copyShare(url); });
      } else copyShare(url);
    }).catch(function () { btn.dataset.busy = ''; err('Could not create a share link.'); });
  });

  function copyShare(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () { toast('✓ Share link copied — valid for 30 days.'); },
        function () { window.prompt('Copy this share link:', url); }
      );
    } else window.prompt('Copy this share link:', url);
  }
  addEventListener('keydown', function (e) {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // touch swipe
  var tx = 0;
  lb.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) step(dx > 0 ? -1 : 1);
  }, { passive: true });

  /* ---------- AI face scan (live camera, on-device matching) ---------- */
  var modelsLoaded = false, cancelScan = false, scanning = false;
  $('btn-face').addEventListener('click', function () {
    show($('facemodal')); document.body.classList.add('lock');
    hide($('faceresult')); hide($('faceprog'));
    startCam();
  });
  $('faceclose').addEventListener('click', function () {
    cancelScan = true; stopCam(); hide($('facemodal')); document.body.classList.remove('lock');
  });

  var stream = null;
  function startCam() {
    var video = $('facevideo');
    $('facehint').textContent = 'Starting camera…';
    $('facescan').disabled = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('facehint').textContent = 'Camera unavailable in this browser — please use a modern browser on your phone or laptop.';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(function (s) {
      stream = s; video.srcObject = s;
      return video.play();
    }).then(function () {
      $('facehint').textContent = 'Loading face-recognition models…';
      return loadModels();
    }).then(function () {
      $('facehint').textContent = 'Centre your face in the frame — good light helps.';
      $('facescan').disabled = false;
    }).catch(function (e) {
      $('facehint').textContent = 'Camera permission is required for the face scan. ' + e.message;
    });
  }
  function stopCam() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
  function loadModels() {
    if (modelsLoaded) return Promise.resolve();
    return Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]).then(function () { modelsLoaded = true; });
  }
  /* live webcam frames are small -> 320 is fine and fast.
     event photos are large -> 320 misses faces, so use 416. */
  function DET() { return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: state.minConfidence }); }
  function DET_PHOTO() { return new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: state.minConfidence }); }

  $('facescan').addEventListener('click', function () {
    if (scanning) return;
    var video = $('facevideo');
    $('facescan').disabled = true;
    $('facehint').textContent = 'Reading your face…';
    faceapi.detectSingleFace(video, DET()).withFaceLandmarks().withFaceDescriptor().then(function (res) {
      if (!res) { $('facehint').textContent = 'No face detected — move closer to a light source and try again.'; $('facescan').disabled = false; return; }
      $('facehint').textContent = '✓ Face captured. Matching across the event…';
      matchAll(res.descriptor);
    }).catch(function (e) {
      $('facehint').textContent = 'Scan failed: ' + e.message; $('facescan').disabled = false;
    });
  });

  if ($('facecancel')) $('facecancel').addEventListener('click', function () { cancelScan = true; });

  /* descriptor cache: survives reloads, keyed per event */
  function cacheLoad() {
    try { return JSON.parse(localStorage.getItem('mk_face2_' + CODE) || '{}'); } catch (e) { return {}; }
  }
  function cacheSave(c) {
    try { localStorage.setItem('mk_face2_' + CODE, JSON.stringify(c)); }
    catch (e) { /* quota — drop cache silently */ }
  }

  /** Load an image for face-api. Drive images come through our same-origin
      proxy (/api/drive/file) so pixel reads are not tainted. */
  function loadImage(m) {
    return new Promise(function (resolve) {
      var img = new Image();
      var to = setTimeout(function () { img.src = ''; resolve(null); }, 20000); // slow image guard
      img.onload = function () { clearTimeout(to); resolve(img); };
      img.onerror = function () { clearTimeout(to); resolve(null); };
      // Prefer the smaller thumbnail for scanning: far less memory and bandwidth
      // than full-res, and ample resolution for a 416px detector input.
      // Falls back to the full image if no thumbnail exists (local media).
      // same-origin for both /images/* and /api/drive/file — no crossOrigin needed
      img.src = m.thumb || m.src;
    });
  }

  function matchAll(target) {
    scanning = true; cancelScan = false;
    var cache = cacheLoad();
    // include EVERY image, local and Google Drive (previously /api/ was excluded)
    var imgs = state.media.filter(function (m) { return m.type !== 'video'; }).slice(0, state.maxScan);
    var matched = new Set(), scores = {}, i = 0, failed = 0;
    show($('faceprog')); hide($('faceresult'));
    if ($('facecancel')) show($('facecancel'));
    $('facescan').disabled = true;

    function paint() {
      var pct = imgs.length ? Math.round(i / imgs.length * 100) : 100;
      $('facebar').style.width = pct + '%';
      $('facetext').textContent = 'Scanning ' + i + ' / ' + imgs.length + ' photos · ' + pct + '%';
    }

    function next() {
      if (cancelScan) return finish(true);
      if (i >= imgs.length) return finish(false);
      var m = imgs[i];
      paint();

      var got;
      if (cache[m.id]) got = Promise.resolve(cache[m.id]);
      else got = loadImage(m).then(function (img) {
        if (!img) { failed++; return []; }
        return faceapi.detectAllFaces(img, DET_PHOTO()).withFaceLandmarks().withFaceDescriptors()
          .then(function (rs) {
            var ds = (rs || []).map(function (r) { return Array.from(r.descriptor); });
            cache[m.id] = ds;      // cache even empty results → never rescan
            return ds;
          })
          .catch(function () { failed++; return []; });
      });

      got.then(function (ds) {
        var best = 2;
        for (var k = 0; k < (ds || []).length; k++) {
          var d = faceapi.euclideanDistance(target, new Float32Array(ds[k]));
          if (d < best) best = d;
        }
        if (best < state.threshold) { matched.add(m.id); scores[m.id] = best < state.threshold * 0.8 ? 'high' : 'maybe'; }
        i++;
        // yield to the event loop so the UI never freezes
        (window.requestIdleCallback || window.requestAnimationFrame || setTimeout)(next);
      });
    }

    function finish(cancelled) {
      scanning = false;
      cacheSave(cache);
      state.ai = matched; state.aiScores = scores;
      hide($('faceprog'));
      if ($('facecancel')) hide($('facecancel'));
      $('facebar').style.width = '100%';
      var n = matched.size;
      $('facecount').textContent = n + ' moment' + (n === 1 ? '' : 's') + ' found';
      $('facenote').textContent = (cancelled ? 'Scan cancelled early. ' : '') +
        'Scanned ' + i + ' of ' + imgs.length + ' photos.' +
        (failed ? ' ' + failed + ' could not be read.' : '') +
        ' Matching is automatic and not guaranteed to be perfect.';
      show($('faceresult'));
      post('/api/client/logmatch', { count: n, scanned: i });
      $('facescan').disabled = false;
      $('facescan').textContent = 'Rescan';
      render();
    }
    next();
  }

  $('faceshow').addEventListener('click', function () {
    stopCam(); hide($('facemodal')); document.body.classList.remove('lock');
    var tab = $('c-tabs').querySelector('[data-tab="ai"]');
    if (tab) tab.click();
    $('cmain').scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- auto-resume session ---------- */
  fetch('/api/client/media').then(function (r) { return r.json(); }).then(function (j) {
    if (j.ok) { steps.forEach(hide); load(); }
  }).catch(function () { });
})();
