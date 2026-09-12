/* MARKIPIE — gallery: filters, masonry reveal, lightbox with zoom + video */
(function () {
  'use strict';
  var masonry = document.getElementById('masonry');
  if (!masonry) return;
  var items = Array.prototype.slice.call(masonry.querySelectorAll('.m-item'));
  var filters = document.getElementById('filters');

  filters.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    filters.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('on'); });
    b.classList.add('on');
    var cat = b.getAttribute('data-cat');
    items.forEach(function (it) {
      var show = cat === 'All' || it.getAttribute('data-cat') === cat;
      it.classList.toggle('hide', !show);
    });
  });

  /* preselect category from ?cat= */
  var qs = new URLSearchParams(location.search).get('cat');
  if (qs) {
    var chip = filters.querySelector('[data-cat="' + CSS.escape(qs) + '"]');
    if (chip) chip.click();
  }

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var stage = document.getElementById('lbstage');
  var count = document.getElementById('lbcount');
  var zoomed = false, scale = 1, tx = 0, ty = 0, drag = null;
  var visible = function () { return items.filter(function (i) { return !i.classList.contains('hide'); }); };
  var list = [], idx = 0;

  function apply() {
    var el = stage.firstChild;
    if (el) el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  }
  function reset() { zoomed = false; scale = 1; tx = 0; ty = 0; apply(); }

  function show(i) {
    idx = (i + list.length) % list.length;
    var it = list[idx];
    stage.innerHTML = '';
    reset();
    if (it.getAttribute('data-type') === 'video') {
      var v = document.createElement('video');
      v.src = it.getAttribute('data-src'); v.poster = it.getAttribute('data-poster');
      v.controls = true; v.autoplay = true; v.playsInline = true;
      stage.appendChild(v);
      document.getElementById('lbzoom').style.display = 'none';
    } else {
      var img = document.createElement('img');
      img.src = it.getAttribute('data-src'); img.alt = it.getAttribute('aria-label') || '';
      stage.appendChild(img);
      document.getElementById('lbzoom').style.display = '';
    }
    count.textContent = (idx + 1) + ' / ' + list.length + ' · ' + (it.getAttribute('data-cat') || '');
  }
  function open(it) {
    list = visible();
    idx = list.indexOf(it);
    lb.classList.add('on'); lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    show(idx);
  }
  function close() {
    lb.classList.remove('on'); lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
    stage.innerHTML = '';
  }

  masonry.addEventListener('click', function (e) {
    var it = e.target.closest('.m-item'); if (it) open(it);
  });
  masonry.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var it = e.target.closest('.m-item'); if (it) open(it); }
  });
  lb.querySelector('.lb-x').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  document.getElementById('lbzoom').addEventListener('click', function () {
    zoomed = !zoomed; scale = zoomed ? 2.2 : 1; if (!zoomed) { tx = 0; ty = 0; } apply();
  });
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    scale = Math.min(4, Math.max(1, scale - e.deltaY * 0.002));
    if (scale === 1) { tx = 0; ty = 0; }
    zoomed = scale > 1; apply();
  }, { passive: false });
  stage.addEventListener('pointerdown', function (e) { if (scale > 1) drag = { x: e.clientX - tx, y: e.clientY - ty }; });
  addEventListener('pointermove', function (e) { if (drag) { tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); } });
  addEventListener('pointerup', function () { drag = null; });
  addEventListener('keydown', function (e) {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();
