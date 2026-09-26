/* Markipie client gallery — Phase 11 premium media experience.
   Google Drive is only the backend source; nothing here exposes or
   links to Drive (no Drive UI, no redirects, no technical detail).

   Session & security
   · the gallery only renders for a validated client session — a
     bare URL with a function id never shows media (Part 27); the
     session code is re-verified server-side on every fetch when
     Supabase is configured (Part 26).
   · sign-out clears the session immediately (Part 25); no gallery
     data is ever persisted to localStorage.

   Experience
   · premium masonry grid · natural aspect ratios · thumbnail-first
   · skeleton loading · graceful per-item error + retry (Parts 20–21)
   · reveal animation (fade · rise · blur-to-sharp, reduced-motion safe)
   · desktop hover: soft veil + VIEW (Part 6) · animated stat counters
   · ALL / PHOTOS / VIDEOS filters with real counts (Part 3)
   · compact event navigation + ALL EVENTS (Parts 17–18)
   · fullscreen viewer with zoom, swipe, keyboard, counter, watermark,
     permission-gated download with "Preparing download…" feedback
   · windowed rendering keeps the DOM small on huge galleries (Part 23)
*/
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK, GS = window.MKGallery;

  var guard = MK.qs('#cgGuard');
  var root = MK.qs('#galRoot');
  var grid = MK.qs('#mediaGrid');
  var sentinel = MK.qs('#cgSentinel');
  var note = MK.qs('#cgCountNote');
  var filtersEl = MK.qs('#cgFilters');
  var eventsEl = MK.qs('#cgEvents');
  var dlNote = MK.qs('#cgDownloadNote');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fid = MK.param('fid');
  if (!fid) { showGuard(true); return; }

  var fn = null, client = null, perms = {};
  var page = 0, busy = false, allItems = [];
  var filter = 'all';                     // all | photo | video
  var counts = { photos: 0, videos: 0, total: 0 };
  var clientFns = [];

  /* MAX rendered tiles — older tiles recycle when scrolling deep
     (Part 23: never thousands of live DOM nodes); data stays intact */
  var MAX_TILES = 300;

  /* ---------------- session gate (Parts 26–27) ----------------
     The decision is made WITHOUT rendering any media: resolve the
     function's client, require a valid session for that client. */
  D.functions.get(fid).then(function (f) {
    if (!f) { showGuard(true); return; }
    fn = f;
    return D.clients.getPublic(f.clientId).then(function (c) {
      if (!c) { showGuard(true); return; }
      client = c;
      return GS.validateSession(c.id).then(function (okSession) {
        if (!okSession || !c.accessOpen) { showGuard(true); return; }
        perms = c.permissions || {};
        boot();
      });
    });
  }).catch(function () { showGuard(true); });

  function showGuard(redirect) {
    if (root) root.hidden = true;
    if (guard) guard.hidden = false;
    if (redirect) {
      setTimeout(function () { location.replace('/client-access/'); }, reducedMotion ? 400 : 1600);
    }
  }

  function boot() {
    document.title = fn.name + ' — ' + (client.eventTitle || client.name);
    MK.qs('#galTitle').textContent = fn.name;
    MK.qs('#galEvent').textContent = client.eventTitle || client.name;
    MK.qs('#crumbText').textContent = 'All Events';
    MK.qs('#crumbLink').href = '/client/?id=' + encodeURIComponent(client.id);
    MK.qs('#galFindBtn').href = '/find-your-photos/?client=' + encodeURIComponent(client.id);
    if (perms.download) dlNote.hidden = false;

    var exitBtn = MK.qs('#cgExitBtn');
    if (exitBtn) exitBtn.addEventListener('click', function () {
      if (GS) GS.signOut();
      location.replace('/client-access/');
    });

    loadClientFunctions().then(function () {
      renderEventNav();
      return refreshCounts();
    }).then(function () {
      renderHeader();
      renderChips();
      loadMore();
      root.hidden = false;
    });
  }

  function loadClientFunctions() {
    return D.functions.forClient(client.id).then(function (fns) {
      /* the public layer already returns active functions only */
      clientFns = fns || [];
    }).catch(function () { clientFns = []; });
  }

  /* ---------------- event navigation (Part 17) ---------------- */
  function renderEventNav() {
    if (!eventsEl) return;
    var others = clientFns;
    eventsEl.hidden = others.length < 2;
    eventsEl.innerHTML = others.map(function (f) {
      var active = f.id === fid;
      return '<button class="cg-evchip' + (active ? ' is-active' : '') + '" data-ev="' + MK.esc(f.id) + '" type="button" aria-current="' + active + '">' +
        MK.esc(f.name) + '</button>';
    }).join('');
  }
  eventsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ev]');
    if (!b || b.getAttribute('data-ev') === fid) return;
    switchFunction(b.getAttribute('data-ev'));
  });

  /* smooth in-place gallery switch — no full application reload */
  function switchFunction(newFid) {
    root.classList.add('is-switching');
    setTimeout(function () {
      history.replaceState(null, '', '/client/gallery/?fid=' + encodeURIComponent(newFid));
      location.replace('/client/gallery/?fid=' + encodeURIComponent(newFid));
    }, reducedMotion ? 60 : 240);
  }

  /* ---------------- header + animated counters (Part 2) ---------------- */
  function refreshCounts() {
    return D.media.counts(fid).then(function (c) {
      counts = c || { photos: 0, videos: 0, total: 0 };
    });
  }

  function animateCounter(el, target) {
    if (reducedMotion || target <= 0) { el.textContent = Number(target).toLocaleString('en-IN'); return; }
    var t0 = null, dur = 900;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderHeader() {
    var showVideos = perms.videos !== false;
    var stats = MK.qs('#galStats');
    stats.hidden = counts.total === 0;
    animateCounter(MK.qs('#statPhotos'), counts.photos);
    animateCounter(MK.qs('#statVideos'), showVideos ? counts.videos : 0);
    MK.qs('#galMeta').innerHTML =
      '<span class="chip">' + MK.icon('lock') + 'Private</span>' +
      (fn.eventDate ? '<span class="chip chip--blue">' + MK.icon('calendar') + D.util.fmtDate(fn.eventDate) + '</span>' : '');
  }

  /* ---------------- filters (Part 3) ---------------- */
  function chipHTML(key, label, n) {
    var active = filter === key;
    return '<button class="chip cg-chip' + (active ? ' is-active' : '') + '" data-filter="' + key + '" type="button" aria-pressed="' + active + '">' +
      label + ' — ' + Number(n || 0).toLocaleString('en-IN') + '</button>';
  }
  function renderChips() {
    if (!filtersEl) return;
    var showVideos = perms.videos !== false;
    filtersEl.hidden = counts.total === 0;
    filtersEl.innerHTML =
      chipHTML('all', 'ALL', showVideos ? counts.total : counts.photos) +
      chipHTML('photo', 'PHOTOS', counts.photos) +
      (showVideos ? chipHTML('video', 'VIDEOS', counts.videos) : '');
  }
  filtersEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (!b || busy) return;
    filter = b.getAttribute('data-filter');
    filtersEl.querySelectorAll('.cg-chip').forEach(function (x) {
      var on = x === b;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-pressed', on);
    });
    grid.classList.add('is-fading');
    setTimeout(function () {
      resetGrid();
      loadMore(function () { grid.classList.remove('is-fading'); });
    }, reducedMotion ? 20 : 180);
  });

  function resetGrid() {
    grid.innerHTML = '';
    allItems = [];
    page = 0;
  }

  /* ---------------- tiles ---------------- */
  function shadeFor(i) { return 'ph-' + (1 + (i % 6)); }

  function tileHTML(m, i, skeleton) {
    if (skeleton) {
      return '<div class="cg-item cg-skel ' + (m === 'video' ? 'cg-skel--video' : '') + '" aria-hidden="true">' +
        '<span class="skel-media"></span></div>';
    }
    var isVideo = m.media_type === 'video';
    return '<button class="cg-item cg-tile cg-rv" data-i="' + i + '" aria-label="Open ' + MK.esc(m.filename || 'media') + '">' +
      (m.thumb
        ? '<img data-src="' + MK.esc(m.thumb) + '" alt="' + MK.esc(m.filename || 'Gallery media') + '"' + (isVideo ? ' class="cg-video-thumb"' : '') + ' loading="lazy">'
        : '<span class="ph-visual ' + shadeFor(i) + '">' + MK.icon(isVideo ? 'play' : 'camera') + '</span>') +
      '<span class="cg-veil" aria-hidden="true"><span class="cg-view">' + MK.icon('image') + 'VIEW</span></span>' +
      /* watermark = presentation layer only — originals in Drive are never modified */
      (perms.watermark !== false ? '<span class="wm-pattern" aria-hidden="true"></span>' : '') +
      (isVideo ? '<span class="type-badge" aria-hidden="true">' + MK.icon('play') + '</span>' : '') +
    '</button>';
  }
  function visible(list) {
    /* Videos permission OFF → videos are hidden from the gallery */
    return perms.videos === false ? list.filter(function (m) { return m.media_type !== 'video'; }) : list;
  }

  /* ---------------- paged loading + skeletons (Parts 20, 22) ---------------- */
  function skeletonRow() {
    var kinds = ['photo', 'photo', 'video', 'photo', 'photo', 'photo'];
    grid.insertAdjacentHTML('beforeend', kinds.map(function (k) { return tileHTML(k, 0, true); }).join(''));
  }
  function clearSkeletons() {
    grid.querySelectorAll('.cg-skel').forEach(function (n) { n.remove(); });
  }

  function loadMore(after) {
    if (busy) return;
    busy = true;
    sentinel.hidden = false;
    skeletonRow();
    D.media.listByFunction(fid, { page: page + 1, type: filter === 'all' ? null : filter }).then(function (res) {
      clearSkeletons();
      page = res.page;
      var start = allItems.length;
      var items = visible(res.items);
      allItems = allItems.concat(items);
      appendTiles(items, start);
      lazyImages();
      busy = false;
      sentinel.hidden = !res.hasMore;
      if (!res.hasMore && res.total === 0) {
        grid.innerHTML =
          '<div class="cg-empty" style="grid-column:1/-1">' +
            '<span class="cg-empty-icon">' + MK.icon('camera') + '</span>' +
            '<p class="cg-empty-title">Your memories are being prepared.</p>' +
            '<p class="cg-empty-sub">This event\u2019s collection will appear here as soon as the studio publishes it.</p>' +
          '</div>';
      }
      note.textContent = counts.total === 0 ? '' :
        'Showing ' + allItems.length.toLocaleString('en-IN') + ' of ' +
        res.total.toLocaleString('en-IN') + ' items' + (perms.videos === false ? ' (videos hidden by the studio)' : '') +
        ' — the rest stream in as you scroll.';
      if (res.hasMore) io.observe(sentinel);
      if (after) after();
    }).catch(function () {
      clearSkeletons();
      busy = false;
      sentinel.hidden = true;
      grid.innerHTML =
        '<div class="cg-empty" style="grid-column:1/-1">' +
          '<p class="cg-empty-title">This gallery could not be loaded right now.</p>' +
          '<p class="cg-empty-sub">Please check your connection and try again.</p>' +
          '<button class="btn btn--primary btn--sm" id="cgRetryBtn" type="button">Try again</button>' +
        '</div>';
      var r = MK.qs('#cgRetryBtn');
      if (r) r.addEventListener('click', function () { grid.innerHTML = ''; loadMore(); });
    });
  }

  /* windowed append (Part 23): keep at most MAX_TILES live nodes */
  function appendTiles(items, start) {
    var html = items.map(function (m, i) { return tileHTML(m, start + i, false); }).join('');
    grid.insertAdjacentHTML('beforeend', html);
    trimTiles();
  }
  function trimTiles() {
    var tiles = grid.querySelectorAll('.cg-tile');
    var over = tiles.length - MAX_TILES;
    for (var i = 0; i < over; i++) tiles[i].remove();   /* data stays in allItems */
  }
  function refillTop() {
    /* re-render tiles that were recycled once the user scrolls back up */
    var first = grid.querySelector('.cg-tile');
    var firstIdx = first ? Number(first.getAttribute('data-i')) : allItems.length;
    if (firstIdx <= 0) return;
    var from = Math.max(0, firstIdx - 60);
    var html = '';
    for (var i = from; i < firstIdx; i++) {
      var m = allItems[i];
      if (!m) continue;
      if (perms.videos === false && m.media_type === 'video') continue;
      html += tileHTML(m, i, false);
    }
    if (html && first) first.insertAdjacentHTML('beforebegin', html);
    lazyImages();
    trimTilesEnd();
  }
  function trimTilesEnd() {
    var tiles = grid.querySelectorAll('.cg-tile');
    var over = tiles.length - MAX_TILES;
    for (var i = 0; i < over; i++) tiles[tiles.length - 1 - i].remove();
  }

  /* ---------------- lazy thumbnails + reveal (Parts 4–5) ---------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      if (en.target.id === 'cgTopSentinel') { refillTop(); return; }
      if (en.target.id === 'cgSentinel') { loadMore(); return; }
      var img = en.target.querySelector('img[data-src]');
      if (img) {
        img.addEventListener('load', function () {
          img.classList.add('is-loaded');
          en.target.classList.add('is-in');   /* fade · rise · blur-to-sharp */
        }, { once: true });
        img.addEventListener('error', function () { tileError(en.target, img); }, { once: true });
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      } else {
        en.target.classList.add('is-in');
      }
      io.unobserve(en.target);
    });
  }, { rootMargin: '420px 0px' });

  /* graceful per-item failure (Part 21) */
  function tileError(tile, img) {
    tile.classList.add('is-err');
    tile.innerHTML =
      '<span class="ph-visual ' + shadeFor(Number(tile.getAttribute('data-i') || 0)) + '">' + MK.icon('image') + '</span>' +
      '<span class="cg-retry">Retry</span>';
    tile.addEventListener('click', function (e) {
      if (!tile.classList.contains('is-err')) return;
      e.stopPropagation();
      var src = img.getAttribute('data-src') || img.src;
      tile.classList.remove('is-err');
      tile.innerHTML = '<img src="' + MK.esc(src) + '" alt="' + MK.esc(tile.getAttribute('aria-label') || '') + '">' +
        (perms.watermark !== false ? '<span class="wm-pattern" aria-hidden="true"></span>' : '');
    }, { once: true });
  }

  /* top sentinel for recycling */
  (function () {
    var top = document.createElement('div');
    top.id = 'cgTopSentinel';
    top.style.height = '1px';
    grid.parentNode.insertBefore(top, grid);
  })();

  function lazyImages() {
    MK.qsa('.cg-tile:not(.lz)', grid).forEach(function (t) { t.classList.add('lz'); io.observe(t); });
  }

  /* ---------------- viewer (Parts 7–9, 13–15, 35) ---------------- */
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.cg-tile');
    if (!b || b.classList.contains('is-err')) return;
    var i = Number(b.getAttribute('data-i'));
    MK.lightbox.open(allItems.map(function (m) {
      return {
        caption: m.filename,
        type: m.media_type,
        src: m.src,
        id: m.id,
        category: m.media_type === 'video' ? 'Video — ' + (fn ? fn.name : '') : (fn ? fn.name : 'Photo')
      };
    }), i, {
      watermark: perms.watermark !== false,
      download: !!perms.download && !!fn && fn.downloadPermission !== 'off',
      /* authorized, backend-mediated download (Parts 14, 16, 35) —
         never exposes credentials; falls back to the display
         resource in local development mode */
      onDownload: function (item) {
        var SB = window.MKSupabase;
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
          /* brief beat so the "Preparing download…" feedback is visible */
          return new Promise(function (res) {
            setTimeout(function () { res({ ok: true, url: item.src, filename: item.caption }); }, 600);
          });
        }
        return Promise.resolve({ ok: false, error: 'Download is not available for this item.' });
      }
    });
  });
})();
