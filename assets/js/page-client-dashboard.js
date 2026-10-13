/* Client Event Dashboard — code → validate → dashboard.
   Functions/events are created by the admin in the Admin Panel and
   arrive sanitized through the data layer (no Drive fields, no codes).
   Clicking a function opens its gallery — the client never leaves
   the Markipie website. */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;

  var guard = MK.qs('#cgGuard');
  var root = MK.qs('#dashRoot');
  var id = MK.param('id');

  if (!id) { guard.hidden = false; return; }

  function readValidatedPayload() {
    try { return JSON.parse(sessionStorage.getItem('mk_client_payload') || 'null'); } catch (e) { return null; }
  }
  var validatedPayload = readValidatedPayload();

  D.clients.getPublic(id).then(function (c) {
    if (!c && validatedPayload && validatedPayload.client && validatedPayload.client.id === id) c = validatedPayload.client;
    if (!c || !c.accessOpen) { guard.hidden = false; return; }
    if (window.MKGallery) window.MKGallery.activate();

    document.title = (c.eventTitle || c.name) + ' — Private Collection';

    var title = MK.qs('#dashTitle');
    title.textContent = c.eventTitle || c.name;

    var year = c.eventDate ? String(c.eventDate).slice(0, 4) : '';
    MK.qs('#dashSub').textContent = [c.eventType, year].filter(Boolean).join(' · ');

    MK.qs('#dashMeta').innerHTML =
      '<span class="chip">' + MK.icon('lock') + 'Code protected</span>' +
      (c.eventDate ? '<span class="chip chip--blue">' + MK.icon('calendar') + D.util.fmtDate(c.eventDate) + '</span>' : '');

    var exitBtn = MK.qs('#dashExitBtn');
    if (exitBtn) exitBtn.addEventListener('click', function () {
      if (window.MKGallery) MKGallery.signOut();     /* clear the session (Part 25) */
      location.replace('/client-access/');
    });

    var perms = c.permissions || {};
    /* AI Face Search hidden entirely when the studio disables it */
    MK.qs('#findPhotosBtn').href = '/find-your-photos/?client=' + encodeURIComponent(c.id);
    if (perms.aiSearch === false) MK.qs('.find-banner').style.display = 'none';

    var grid = MK.qs('#fnGrid');

    function shadeFor(name) { return 'ph-' + (1 + (String(name).length % 6)); }

    D.functions.forClient(c.id).then(function (fns) {
      if ((!fns || !fns.length) && validatedPayload && validatedPayload.client && validatedPayload.client.id === c.id) fns = validatedPayload.functions || [];
      fns = fns || [];
      if (!fns.length) {
        grid.innerHTML = '<div class="card" style="grid-column:1/-1;padding:36px 22px;text-align:center">' +
          '<p style="font-weight:700;font-size:16px">Your events are being prepared</p>' +
          '<p style="font-size:14px;color:var(--ink-2);margin-top:8px">Your photos will appear here as functions — Haldi, Mehendi, Wedding and more — as soon as the studio publishes them.</p>' +
        '</div>';
      } else {
        grid.innerHTML = fns.map(function (f, i) {
          var counts = [];
          if (f.photoCount) counts.push('<b>' + f.photoCount.toLocaleString('en-IN') + '</b> Photos');
          if (f.videoCount) counts.push('<b>' + f.videoCount.toLocaleString('en-IN') + '</b> Videos');
          return '<article class="card fn-card reveal" style="transition-delay:' + (i * 80) + 'ms">' +
            '<a class="fn-cover" href="/client/gallery/?fid=' + encodeURIComponent(f.id) + '" aria-label="Open ' + MK.esc(f.name) + ' gallery">' +
              (f.cover
                ? '<img src="' + MK.esc(f.cover.src || f.cover) + '" alt="' + MK.esc(f.name) + '" loading="lazy">'
                : '<span class="ph-visual ' + shadeFor(f.name) + '">' + MK.icon('camera') + '<span class="ph-label">' + MK.esc(f.name) + '</span></span>') +
              (perms.watermark !== false ? '<span class="wm-pattern"></span>' : '') +
            '</a>' +
            '<div class="fn-body">' +
              '<h2>' + MK.esc(f.name) + '</h2>' +
              (f.eventDate
                ? '<span class="fn-date">' + MK.icon('calendar') + D.util.fmtDate(f.eventDate) + '</span>' : '') +
              (counts.length ? '<p class="fn-counts">' + counts.join(' &nbsp;·&nbsp; ') + '</p>'
                             : '<p class="fn-counts" style="color:var(--ink-3)">Gallery coming soon</p>') +
              '<a class="btn btn--primary btn--block" href="/client/gallery/?fid=' + encodeURIComponent(f.id) + '">View Gallery</a>' +
            '</div>' +
          '</article>';
        }).join('');
      }
      MK.reveal(grid);
      root.hidden = false;
      /* Phase 12 — on-device photo matching status for this client.
         Discreet, client-safe wording; hidden entirely when off. */
      var fb = MK.qs('#fbStatus');
      if (fb && window.MarkipieFace && perms.aiSearch !== false) {
        var F = window.MarkipieFace;
        var render = function () {
          var done = 0, failed = 0, total = 0;
          (fns || []).forEach(function (f) {
            var p = F.indexProgress(f.id);
            done += p.processed; failed += p.failed; total += p.total;
          });
          if (!total) { fb.hidden = true; return; }
          if (done + failed < total) {
            fb.textContent = 'Preparing your photo matching… ' + (done + failed).toLocaleString('en-IN') + ' of ' + total.toLocaleString('en-IN') + ' photos';
            fb.hidden = false;
          } else {
            fb.hidden = true;   /* ready — the banner copy already explains the scan */
          }
        };
        F.onIndexUpdate(render);
        render();
      }
    });
  });
})();
