/* Home page — dynamic previews rendered from the data layer */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;

  /* Services preview — one card per category, from package data */
  D.packages.list().then(function (pkgs) {
    var root = MK.qs('#homeServiceCards');
    if (!root) return;
    var cards = [
      { cat: 'wedding', icon: 'camera', title: 'Wedding Packages', note: 'Single-side, both-side & premium coverage.' },
      { cat: 'engagement', icon: 'heart', title: 'Engagement & Events', note: 'Engagements, birthdays and gatherings.' },
      { cat: 'prewedding', icon: 'film', title: 'Pre-Wedding', note: 'Cinematic stories at Delhi NCR locations.' }
    ];
    root.innerHTML = cards.map(function (c, i) {
      var items = pkgs.filter(function (p) { return p.category === c.cat; });
      var min = Math.min.apply(null, items.map(function (p) { return p.price; }));
      var photo = MK.photoForLabel(c.cat === 'wedding' ? 'Wedding' : c.cat === 'engagement' ? 'Engagement' : 'Pre-Wedding', i);
      return '<a class="card mini-card reveal' + (i ? ' reveal-d' + i : '') + '" href="/services/#cat-' + c.cat + '" style="--mini-image:url(\'' + photo + '\')">' +
        '<span class="mini-photo"><img src="' + photo + '" alt="' + c.title + '" loading="lazy"></span>' +
        '<span class="icon-chip">' + MK.icon(c.icon) + '</span>' +
        '<h3>' + c.title + '</h3><p>' + c.note + '</p>' +
        '<span class="from">From <b>₹' + min.toLocaleString('en-IN') + '</b></span></a>';
    }).join('');
    MK.reveal(root);
  });

  /* Gallery preview strip */
  var strip = MK.qs('#homeGalleryStrip');
  if (strip) {
    var tiles = ['Weddings', 'Candid', 'Films', 'Portraits', 'Details', 'Stories'];
    strip.innerHTML = tiles.map(function (t, i) {
      return '<div class="r-45">' + MK.phVisual(i, t, 'camera') + '</div>';
    }).join('');
  }

  /* Blogs preview — latest 3 published */
  D.blogs.list().then(function (posts) {
    var root = MK.qs('#homeBlogCards');
    if (!root) return;
    root.innerHTML = posts.slice(0, 3).map(function (p, i) {
      return '<a class="card post-card reveal' + (i ? ' reveal-d' + i : '') + '" href="/blogs/article/?slug=' + encodeURIComponent(p.slug) + '">' +
        '<div class="post-cover">' + (p.cover
          ? '<img src="' + MK.esc(p.cover.src) + '" alt="' + MK.esc(p.cover.alt || p.title) + '" style="width:100%;height:100%;object-fit:cover">'
          : MK.phVisual(i, 'Journal', 'image')) + '</div>' +
        '<div class="post-body">' +
          '<span class="post-meta">' + MK.icon('calendar') + D.util.fmtDate(p.date) + '</span>' +
          '<h3>' + MK.esc(p.title) + '</h3><p>' + MK.esc(p.excerpt) + '</p>' +
          '<span class="link-arrow">Read more ' + MK.icon('arrowRight') + '</span>' +
        '</div></a>';
    }).join('');
    MK.reveal(root);
  });

  /* Marketing preview */
  D.marketing.list().then(function (svcs) {
    var root = MK.qs('#homeMarketingCards');
    if (!root) return;
    root.innerHTML = svcs.map(function (s, i) {
      var photo = s.id === 'video' ? MK.photoForLabel('Films', i) : s.id === 'design' ? MK.photoForLabel('Portraits', i) : MK.photoForLabel('Marketing', i);
      return '<a class="card mini-card reveal' + (i ? ' reveal-d' + i : '') + '" href="/marketing/#svc-' + s.id + '" style="--mini-image:url(\'' + photo + '\')">' +
        '<span class="mini-photo"><img src="' + photo + '" alt="' + MK.esc(s.title) + '" loading="lazy"></span>' +
        '<span class="icon-chip">' + MK.icon(s.icon) + '</span>' +
        '<h3>' + MK.esc(s.title) + '</h3><p>' + MK.esc(s.intro) + '</p>' +
        '<span class="from">' + MK.esc(s.priceLine) + '</span></a>';
    }).join('');
    MK.reveal(root);
  });
})();
