/* Blogs — listing and article pages, both rendered from the data
   layer. Posts created/published in the Admin Panel appear here
   automatically (no code changes needed). */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;
  var isArticle = document.body.classList.contains('page-article');

  function coverHTML(p, i) {
    return p.cover
      ? '<img src="' + MK.esc(p.cover.src) + '" alt="' + MK.esc(p.cover.alt || p.title) + '" style="width:100%;height:100%;object-fit:cover">'
      : MK.phVisual(i, 'Journal', 'image');
  }

  if (!isArticle) {
    /* ---------- listing ---------- */
    var src = (window.MKServices && MKServices.blogs)
      ? MKServices.blogs.listPublic()
      : D.blogs.list().then(function (list) { return { ok: true, data: list }; });
    src.then(function (res) {
      var posts = res.data || [];
      var feat = MK.qs('#blogFeatured');
      var list = MK.qs('#blogList');
      var empty = MK.qs('#blogEmpty');
      if (!posts.length) { empty.hidden = false; return; }
      var f = posts[0], rest = posts.slice(1);

      feat.innerHTML =
        '<a class="card blog-featured reveal" href="/blogs/article/?slug=' + encodeURIComponent(f.slug) + '" style="position:relative">' +
          '<span class="new-chip featured-flag">Featured</span>' +
          '<div class="post-cover">' + coverHTML(f, 0) + '</div>' +
          '<div class="post-body" style="padding:26px 24px">' +
            '<span class="post-meta">' + MK.icon('calendar') + D.util.fmtDate(f.date) + '</span>' +
            '<h2 style="font-size:clamp(1.3rem,4.6vw,1.7rem)">' + MK.esc(f.title) + '</h2>' +
            '<p>' + MK.esc(f.excerpt) + '</p>' +
            '<span class="link-arrow">Read the article ' + MK.icon('arrowRight') + '</span>' +
          '</div></a>';
      list.innerHTML = rest.map(function (p, i) {
        return '<a class="card post-card reveal' + (i ? ' reveal-d' + i : '') + '" href="/blogs/article/?slug=' + encodeURIComponent(p.slug) + '">' +
          '<div class="post-cover">' + coverHTML(p, i + 1) + '</div>' +
          '<div class="post-body">' +
            '<span class="post-meta">' + MK.icon('calendar') + D.util.fmtDate(p.date) + '</span>' +
            '<h3>' + MK.esc(p.title) + '</h3><p>' + MK.esc(p.excerpt) + '</p>' +
            '<span class="link-arrow">Read more ' + MK.icon('arrowRight') + '</span>' +
          '</div></a>';
      }).join('');
      MK.reveal(document);
    });
    return;
  }

  /* ---------- article ---------- */
  function blockHTML(b) {
    if (!b) return '';
    if (b.type === 'h2') return '<h2>' + (b.html || '') + '</h2>';
    if (b.type === 'h3') return '<h3>' + (b.html || '') + '</h3>';
    if (b.type === 'img') {
      return b.src
        ? '<figure style="margin:4px 0"><img src="' + MK.esc(b.src) + '" alt="' + MK.esc(b.alt || '') + '" style="border-radius:14px;width:100%"></figure>'
        : MK.phVisual(2, 'Photo', 'image');
    }
    return '<p>' + (b.html || '') + '</p>'; // p / html
  }

  var slug = MK.param('slug');
  if (!slug) {
    MK.qs('#articleRoot').hidden = true;
    MK.qs('#articleMissing').hidden = false;
    return;
  }

  var srcArt = (window.MKServices && MKServices.blogs)
    ? MKServices.blogs.getPublic(slug)
    : D.blogs.get(slug).then(function (p) { return { ok: true, data: p }; });
  srcArt.then(function (res) {
    var p = res.data;
    var root = MK.qs('#articleRoot');
    if (!p) { root.hidden = true; MK.qs('#articleMissing').hidden = false; return; }
    document.title = p.title + ' — Markipie';

    var gallery = (p.gallery || []).map(function (g, i) {
      var cls = 'reveal rv-img" style="transition-delay:' + ((i % 2) * 100) + 'ms';
      return g && g.src
        ? '<img class="' + cls + '" src="' + MK.esc(g.src) + '" alt="' + MK.esc(g.alt || p.title) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px">'
        : '<div class="' + cls + '">' + MK.phVisual(i, 'Additional photo', 'image') + '</div>';
    }).join('');

    root.innerHTML =
      '<div class="article-cover reveal rv-img">' +
        (p.cover
          ? '<img src="' + MK.esc(p.cover.src) + '" alt="' + MK.esc(p.cover.alt || p.title) + '" style="border-radius:18px;aspect-ratio:16/9;object-fit:cover;width:100%">'
          : MK.phVisual(0, 'Journal', 'image')) +
      '</div>' +
      '<div class="article-head reveal reveal-d1">' +
        '<span class="eyebrow">Journal</span>' +
        '<h1>' + MK.esc(p.title) + '</h1>' +
        '<div class="article-meta"><span>' + MK.icon('calendar') + '</span>' + D.util.fmtDate(p.date) +
          '<span class="dot"></span><span>Markipie Studio</span></div>' +
      '</div>' +
      '<div class="article-body reveal">' + (p.intro || []).map(blockHTML).join('') + '</div>' +
      (gallery ? '<div class="article-gallery">' + gallery + '</div>' : '') +
      ((p.outro || []).length
        ? '<div class="article-body article-outro reveal">' + p.outro.map(blockHTML).join('') + '</div>'
        : '') +
      '<div class="article-back reveal"><a class="btn btn--soft" href="/blogs/">' + MK.icon('chevLeft') + ' All articles</a></div>';
    MK.reveal(root);
  });
})();
