/* Marketing page — service cards rendered from the data layer,
   structured for future Admin management (add packages, change
   prices, edit included services). */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;

  function checkList(items) {
    return '<ul class="svc-types">' + items.map(function (it) {
      return '<li><span class="ck">' + MK.icon('check') + '</span>' + MK.esc(it) + '</li>';
    }).join('') + '</ul>';
  }

  /* Phase 9: service layer (Supabase when configured, local otherwise) */
  var src = (window.MKServices && MKServices.marketing)
    ? MKServices.marketing.listPublic()
    : D.marketing.list().then(function (list) { return { ok: true, data: list }; });
  src.then(function (res) {
    var svcs = res.data || [];
    var root = MK.qs('#svcRoot');
    if (!root) return;
    root.innerHTML = svcs.map(function (s, i) {
      var tiers = (s.tiers || []).map(function (t) {
        return '<div class="tier"><b>' + MK.esc(t.name) + '</b><span>' + MK.esc(t.desc) + '</span></div>';
      }).join('');
      var svcImage = s.id === 'video' ? MK.photoForLabel('Films', i) : s.id === 'design' ? MK.photoForLabel('Portraits', i) : MK.photoForLabel('Marketing', i);
      return '<article class="card svc-card tt-' + s.id + ' reveal" id="svc-' + s.id + '" style="--svc-image:url(\'' + svcImage + '\')">' +
        '<span class="icon-chip">' + MK.icon(s.icon) + '</span>' +
        '<h2>' + MK.esc(s.title) + '</h2>' +
        '<span class="svc-price">' + MK.esc(s.priceLine) + '</span>' +
        '<p>' + MK.esc(s.intro) + '</p>' +
        (s.includes ? checkList(s.includes) : '') +
        (s.types ? checkList(s.types) : '') +
        (tiers
          ? '<div><div class="pkg-sec-title" style="margin-bottom:10px">' + MK.icon('star') + 'Plans</div>' +
            '<div class="tier-row">' + tiers + '</div>' +
            '<p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">' + MK.esc(s.tierNote || '') + '</p></div>'
          : '') +
        '<a class="btn btn--primary" href="/contact/?service=' + s.id + '">' + MK.esc(s.cta || 'Get a Quote') + '</a>' +
      '</article>';
    }).join('');
    MK.reveal(root);
  });
})();
