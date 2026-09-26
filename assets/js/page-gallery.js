/* Public gallery — editorial masonry of placeholder frames with lightbox.
   Real photography will replace the placeholder visuals later. */
(function () {
  'use strict';
  var MK = window.MK;

  var TILES = [
    { r: 'r-45', label: 'Weddings' }, { r: 'r-11', label: 'Candid' },
    { r: 'r-34', label: 'Ceremony' }, { r: 'r-45', label: 'Portraits' },
    { r: 'r-169', label: 'Films' }, { r: 'r-45', label: 'Details' },
    { r: 'r-11', label: 'Haldi' }, { r: 'r-34', label: 'Reception' },
    { r: 'r-45', label: 'Stories' }, { r: 'r-11', label: 'Mehndi' },
    { r: 'r-169', label: 'Behind the scenes' }, { r: 'r-34', label: 'Pre-wedding' },
    { r: 'r-45', label: 'Sangeet' }, { r: 'r-11', label: 'Emotions' }
  ];

  var grid = MK.qs('#galleryGrid');
  if (!grid) return;

  grid.innerHTML = TILES.map(function (t, i) {
    var video = t.label === 'Films' || t.label === 'Behind the scenes';
    return '<button class="m-item ' + t.r + ' reveal" data-idx="' + i + '" aria-label="Open ' + MK.esc(t.label) + ' frame">' +
      MK.phVisual(i, t.label, video ? 'play' : 'camera') + '</button>';
  }).join('');
  MK.reveal(grid);

  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.m-item');
    if (!btn) return;
    var i = Number(btn.getAttribute('data-idx'));
    MK.lightbox.open(TILES.map(function (t, j) {
      var type = (t.label === 'Films' || t.label === 'Behind the scenes') ? 'video' : 'photo';
      return {
        caption: t.label + ' — Markipie story',
        type: type,
        src: type === 'video' ? '' : MK.photoForLabel(t.label, j),
        category: t.label
      };
    }), i);
  });
})();
