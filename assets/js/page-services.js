/* Services page — premium editorial package cards rendered from the
   data layer (one source of truth: Admin → Services CRUD).
   Cards: gradient identities per category · VIEW PACKAGE modal with
   ENQUIRE NOW · neutral category badges (never ranking claims) ·
   filter tabs · compare up to 3 packages. */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;

  var state = { filter: 'all', compare: [], pkgs: [] };

  var BADGE = { wedding: 'WEDDING', engagement: 'ENGAGEMENT', prewedding: 'PRE-WEDDING', premium: 'PREMIUM COLLECTION' };
  var COMPARE_ROWS = [
    ['coverage', 'Coverage'], ['photographer', 'Photographer'], ['videographer', 'Videographer'],
    ['candid', 'Candid'], ['cinematographer', 'Cinematographer'], ['drone', 'Drone'],
    ['album', 'Album'], ['editedPhotos', 'Edited Photos'], ['frame', 'Frame'],
    ['aiFace', 'AI Face Recognition'], ['albumSelection', 'Album Selection'], ['price', 'Price']
  ];

  function checkList(items) {
    return '<ul class="check-list">' + items.map(function (it) {
      return '<li><span class="ck">' + MK.icon('check') + '</span>' + MK.esc(it) + '</li>';
    }).join('') + '</ul>';
  }
  function themeOf(p) { return p.featured ? 'premium' : p.category; }

  function pkgCard(p, i) {
    var theme = themeOf(p);
    var covNames = (p.sections || []).map(function (sx) { return '<span class="px-cov-chip">' + MK.esc(sx.name) + '</span>'; }).join('');
    var deliv = (p.deliverables || []);
    var delivShort = deliv.slice(0, 4);
    var comp = (p.complimentary || []);
    var delay = ' style="transition-delay:' + ((i % 3) * 90) + 'ms"';
    var sel = state.compare.indexOf(p.id) !== -1;
    return '<article class="pkg-card pkgx tt-' + theme + ' reveal' + (p.featured ? ' is-featured' : '') + '"' + delay + ' id="pkg-' + p.id + '" data-theme="' + theme + '">' +
      '<div class="pkgx-inner">' +
        '<div class="pkg-photo" style="background-image:url(\'' + MK.photoForLabel(theme === 'wedding' ? 'Wedding' : theme === 'engagement' ? 'Engagement' : theme === 'prewedding' ? 'Pre-Wedding' : 'Wedding', i) + '\')">' +
          '<img src="' + MK.photoForLabel(theme === 'wedding' ? 'Wedding' : theme === 'engagement' ? 'Engagement' : theme === 'prewedding' ? 'Pre-Wedding' : 'Wedding', i) + '" alt="' + MK.esc(p.title) + '" loading="lazy">' +
          '<span class="pkg-photo-label">' + MK.esc(BADGE[theme] || 'PACKAGE') + '</span>' +
        '</div>' +
        '<div class="pkgx-glow" aria-hidden="true"></div>' +
        '<div class="pkg-top">' +
          '<div class="pkg-cat-row">' +
            '<span class="pkgx-badge">' + (BADGE[theme] || 'PACKAGE') + '</span>' +
            (p.featured ? '<span class="chip chip--feat">Premium</span>' : '') +
          '</div>' +
          '<span class="pkgx-icon" aria-hidden="true">' + MK.icon(theme === 'premium' ? 'sparkles' : theme === 'engagement' ? 'heart' : theme === 'prewedding' ? 'mapPin' : 'aperture') + '</span>' +
          '<h3>' + MK.esc(p.title) + '</h3>' +
          (p.note ? '<p class="pkgx-note">' + MK.esc(p.note) + '</p>' : '') +
        '</div>' +
        '<div class="pkg-price">' +
          '<span class="amount">' + MK.esc(p.priceDisplay).replace('/-', '') + '<small>/-</small></span>' +
          '<span class="only">' + MK.esc(p.priceLine) + '</span>' +
          (p.albumOption ? '<span class="album-opt">' + MK.esc(p.albumOption) + '</span>' : '') +
        '</div>' +
        '<div class="pkgx-sec"><span class="pkgx-sec-title">Event Coverage</span>' +
          '<div class="pkgx-cov">' + covNames + '</div></div>' +
        '<div class="pkgx-details">' +
          '<div class="pkgx-col"><span class="pkgx-sec-title">' + MK.icon('download') + 'Deliverables</span>' +
            checkList(delivShort) + (deliv.length > 4 ? '<button class="pkgx-more" data-view="' + p.id + '" type="button">+ ' + (deliv.length - 4) + ' more</button>' : '') + '</div>' +
          (comp.length ? '<div class="pkgx-col pkg-comp"><span class="pkgx-sec-title">' + MK.icon('gift') + 'Complimentary</span>' + checkList(comp) + '</div>' : '') +
        '</div>' +
        '<div class="pkgx-foot">' +
          '<button class="btn btn--primary btn--block pkgx-cta" data-view="' + p.id + '" type="button">View Package</button>' +
          '<button class="pkgx-cmp' + (sel ? ' is-sel' : '') + '" data-cmp="' + p.id + '" type="button" aria-pressed="' + sel + '">' +
            '<span class="cmp-box">' + MK.icon('check') + '</span>Compare</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ---------------- render ---------------- */
  function matches(p) {
    if (state.filter === 'all') return true;
    return themeOf(p) === state.filter;
  }
  function render() {
    var root = MK.qs('#packagesRoot');
    if (!root) return;
    var cats = state.cats, pkgs = state.pkgs;
    root.innerHTML = cats.map(function (c) {
      var items = pkgs.filter(function (p) { return p.category === c.id; });
      if (!items.length) return '';
      return '<section class="pkg-cat tt-' + c.id + '" id="cat-' + c.id + '">' +
        '<div class="pkg-cat-head reveal">' +
          '<span class="eyebrow eyebrow--green">' + MK.esc(c.label) + '</span>' +
          '<h2 class="h2">' + MK.esc(c.blurb) + '</h2>' +
          '<span class="count">' + items.length + ' package' + (items.length > 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="pkg-grid">' + items.map(pkgCard).join('') + '</div>' +
      '</section>';
    }).join('');
    applyFilter(false);
    MK.reveal(root);
    bindCards();
  }

  function applyFilter(animate) {
    var root = MK.qs('#packagesRoot');
    if (!root) return;
    var grid = root;
    if (animate) grid.classList.add('is-filtering');
    window.setTimeout(function () {
      var cards = MK.qsa('.pkg-card');
      var visByCat = {};
      cards.forEach(function (card) {
        var th = card.dataset.theme;
        var ok = state.filter === 'all' || th === state.filter;
        card.classList.toggle('is-hidden', !ok);
        var sec = card.closest('.pkg-cat');
        if (sec) visByCat[sec.id] = visByCat[sec.id] || ok;
      });
      MK.qsa('.pkg-cat').forEach(function (sec) {
        sec.style.display = visByCat[sec.id] ? '' : 'none';
      });
      grid.classList.remove('is-filtering');
    }, animate ? 240 : 0);
  }

  /* ---------------- filter tabs ---------------- */
  function bindTabs() {
    MK.qsa('.cat-pill').forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        MK.qsa('.cat-pill').forEach(function (x) { x.classList.remove('is-active'); });
        pill.classList.add('is-active');
        state.filter = pill.getAttribute('data-f') || 'all';
        applyFilter(true);
      });
    });
  }

  /* ---------------- package modal ---------------- */
  function openPkg(p) {
    var bd = document.getElementById('pkgModalEl');
    var theme = themeOf(p);
    var cov = (p.sections || []).map(function (sx) {
      return '<div class="pm-cov"><b>' + MK.esc(sx.name) + '</b>' + checkList(sx.items || []) + '</div>';
    }).join('');
    bd.innerHTML =
      '<div class="pm-sheet pkgx tt-' + theme + '" role="dialog" aria-modal="true" aria-label="' + MK.esc(p.title) + '">' +
        '<button class="pm-x" data-pm-close aria-label="Close">' + MK.icon('close') + '</button>' +
        '<div class="pm-head">' +
          '<span class="pkgx-badge">' + (BADGE[theme] || 'PACKAGE') + '</span>' +
          '<h3>' + MK.esc(p.title) + '</h3>' +
          (p.note ? '<p class="pkgx-note">' + MK.esc(p.note) + '</p>' : '') +
          '<div class="pkg-price"><span class="amount">' + MK.esc(p.priceDisplay).replace('/-', '') + '<small>/-</small></span>' +
          '<span class="only">' + MK.esc(p.priceLine) + '</span>' +
          (p.albumOption ? '<span class="album-opt">' + MK.esc(p.albumOption) + '</span>' : '') + '</div>' +
        '</div>' +
        '<div class="pm-body">' +
          '<div class="pm-sec"><span class="pkgx-sec-title">Event Coverage</span>' + (cov || '<p class="pm-none">—</p>') + '</div>' +
          '<div class="pm-sec"><span class="pkgx-sec-title">' + MK.icon('download') + 'Deliverables</span>' + checkList(p.deliverables || []) + '</div>' +
          ((p.complimentary || []).length ? '<div class="pm-sec pkg-comp"><span class="pkgx-sec-title">' + MK.icon('gift') + 'Complimentary</span>' + checkList(p.complimentary) + '</div>' : '') +
        '</div>' +
        '<div class="pm-foot">' +
          '<a class="btn btn--primary btn--block" href="/contact/?package=' + encodeURIComponent(p.id) + '">Enquire Now</a>' +
        '</div>' +
      '</div>';
    bd.classList.add('is-open');
    document.body.classList.add('pm-lock');
    bd.addEventListener('click', function (e) {
      if (e.target === bd || e.target.closest('[data-pm-close]')) closePkg();
    });
  }
  function closePkg() {
    var bd = document.getElementById('pkgModalEl');
    bd.classList.remove('is-open');
    document.body.classList.remove('pm-lock');
  }

  /* ---------------- compare ---------------- */
  function renderCompareBar() {
    var bar = document.getElementById('cmpBar');
    if (!bar) return;
    var n = state.compare.length;
    bar.classList.toggle('is-visible', n > 0);
    MK.qsa('.pkgx-cmp').forEach(function (chip) {
      var sel = state.compare.indexOf(chip.getAttribute('data-cmp')) !== -1;
      chip.classList.toggle('is-sel', sel);
      chip.setAttribute('aria-pressed', sel);
    });
    var btn = MK.qs('#cmpRun');
    if (btn) btn.disabled = n < 2;
    var lbl = MK.qs('#cmpCount');
    if (lbl) lbl.textContent = n + ' selected · pick up to 3';
  }
  function cell(v) {
    if (v === true) return '<span class="cmp-yes">' + MK.icon('check') + '</span>';
    if (!v) return '<span class="cmp-no">—</span>';
    return MK.esc(String(v));
  }
  function openCompare() {
    var bd = document.getElementById('pkgModalEl');
    var picks = state.pkgs.filter(function (p) { return state.compare.indexOf(p.id) !== -1; });
    var head = picks.map(function (p) { return '<th>' + MK.esc(p.title) + '</th>'; }).join('');
    var rows = COMPARE_ROWS.map(function (r) {
      var key = r[0];
      var tds = picks.map(function (p) {
        if (key === 'price') return '<td>' + MK.esc(p.priceDisplay) + '</td>';
        return '<td>' + cell((p.compare || {})[key]) + '</td>';
      }).join('');
      return '<tr><th scope="row">' + r[1] + '</th>' + tds + '</tr>';
    }).join('');
    bd.innerHTML =
      '<div class="pm-sheet cmp-sheet" role="dialog" aria-modal="true" aria-label="Compare packages">' +
        '<button class="pm-x" data-pm-close aria-label="Close">' + MK.icon('close') + '</button>' +
        '<div class="pm-head"><span class="pkgx-badge">COMPARE</span><h3>Compare Packages</h3>' +
        '<p class="pkgx-note">Side by side, straight from each package — no rankings.</p></div>' +
        '<div class="pm-body cmp-scroll"><table class="cmp-table"><thead><tr><th></th>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="pm-foot"><a class="btn btn--primary btn--block" href="/contact/">Enquire Now</a></div>' +
      '</div>';
    bd.classList.add('is-open');
    document.body.classList.add('pm-lock');
    bd.addEventListener('click', function (e) {
      if (e.target === bd || e.target.closest('[data-pm-close]')) closePkg();
    });
  }

  /* ---------------- bind ---------------- */
  function bindCards() {
    MK.qsa('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = null;
        state.pkgs.forEach(function (x) { if (x.id === b.getAttribute('data-view')) p = x; });
        if (p) openPkg(p);
      });
    });
    MK.qsa('[data-cmp]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var id = chip.getAttribute('data-cmp');
        var at = state.compare.indexOf(id);
        if (at !== -1) state.compare.splice(at, 1);
        else {
          if (state.compare.length >= 3) { MK.toast('Compare up to 3 packages — remove one first.'); return; }
          state.compare.push(id);
        }
        renderCompareBar();
      });
    });
  }

  /* Phase 9: data flows through the service layer (Supabase when
     configured, local data layer otherwise). Design unchanged. */
  function loadPkgs() {
    if (window.MKServices && MKServices.packages) return MKServices.packages.listPublic();
    return Promise.all([D.packages.categories(), D.packages.list()]).then(function (res) {
      return { ok: true, data: { categories: res[0], packages: res[1] } };
    });
  }
  loadPkgs().then(function (res) {
    state.cats = (res.data.categories || []).map(function (c) {
      return { id: c.slug || c.id, label: c.label || c.name, blurb: c.blurb || '' };
    });
    state.pkgs = res.data.packages || [];
    render();
    bindTabs();
    renderCompareBar();
    var run = MK.qs('#cmpRun');
    if (run) run.addEventListener('click', openCompare);
    var clear = MK.qs('#cmpClear');
    if (clear) clear.addEventListener('click', function () { state.compare = []; renderCompareBar(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePkg();
    });
  });
})();
