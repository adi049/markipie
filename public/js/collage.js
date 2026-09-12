/* MARKIPIE — collage studio */
(function () {
  'use strict';
  var canvas = document.getElementById('ccanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height, GAP = 14, PAD = 40;

  var tpls = {};
  document.querySelectorAll('.tpl').forEach(function (b) {
    tpls[b.getAttribute('data-tpl')] = JSON.parse(b.querySelector('.tpl-prev').getAttribute('data-cells'));
    var prev = b.querySelector('.tpl-prev');
    JSON.parse(prev.getAttribute('data-cells')).forEach(function (c) {
      var s = document.createElement('i');
      s.style.left = (c[0] * 100) + '%'; s.style.top = (c[1] * 100) + '%';
      s.style.width = (c[2] * 100) + '%'; s.style.height = (c[3] * 100) + '%';
      prev.appendChild(s);
    });
  });

  var state = { tpl: 'ct4', bg: '#FBFAF8', photos: [], cells: [], sel: 0, text: '', font: 'serif', tcol: '#23272B' };

  function setTpl(id) {
    state.tpl = id;
    state.cells = tpls[id].map(function (c, i) {
      var old = state.cells[i];
      return { rect: c, photo: old ? old.photo : (state.photos[i] ? i : -1), zoom: old ? old.zoom : 1, ox: 0, oy: 0 };
    });
    // assign first photos sequentially if empty
    state.cells.forEach(function (c, i) { if (c.photo < 0 && state.photos[i]) c.photo = i; });
    draw();
  }

  function cellRect(c) {
    var x = PAD + c.rect[0] * (W - PAD * 2), y = PAD + c.rect[1] * (H - PAD * 2);
    var w = c.rect[2] * (W - PAD * 2), h = c.rect[3] * (H - PAD * 2);
    return [x + GAP / 2, y + GAP / 2, w - GAP, h - GAP];
  }

  function draw() {
    ctx.fillStyle = state.bg; ctx.fillRect(0, 0, W, H);
    state.cells.forEach(function (c, i) {
      var r = cellRect(c);
      ctx.save();
      ctx.beginPath(); ctx.rect(r[0], r[1], r[2], r[3]); ctx.clip();
      if (c.photo >= 0 && state.photos[c.photo]) {
        var img = state.photos[c.photo];
        var sc = Math.max(r[2] / img.width, r[3] / img.height) * c.zoom;
        var dw = img.width * sc, dh = img.height * sc;
        ctx.drawImage(img, r[0] + (r[2] - dw) / 2 + c.ox, r[1] + (r[3] - dh) / 2 + c.oy, dw, dh);
      } else {
        ctx.fillStyle = 'rgba(35,39,43,.06)'; ctx.fillRect(r[0], r[1], r[2], r[3]);
        ctx.fillStyle = 'rgba(35,39,43,.35)';
        ctx.font = '600 28px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('＋ photo', r[0] + r[2] / 2, r[1] + r[3] / 2);
      }
      if (i === state.sel) { ctx.strokeStyle = '#B08D57'; ctx.lineWidth = 5; ctx.strokeRect(r[0] + 2, r[1] + 2, r[2] - 4, r[3] - 4); }
      ctx.restore();
    });
    if (state.text) {
      ctx.save();
      ctx.fillStyle = state.tcol;
      ctx.font = (state.font === 'serif' ? 'italic 600 64px "Cormorant Garamond", serif' : '700 48px Manrope, sans-serif');
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12;
      ctx.fillText(state.text, W / 2, H - PAD - 30);
      ctx.restore();
    }
  }

  /* controls */
  document.getElementById('tplrow').addEventListener('click', function (e) {
    var b = e.target.closest('.tpl'); if (!b) return;
    document.querySelectorAll('.tpl').forEach(function (t) { t.classList.remove('on'); });
    b.classList.add('on'); setTpl(b.getAttribute('data-tpl'));
  });
  document.getElementById('swrow').addEventListener('click', function (e) {
    var b = e.target.closest('.sw'); if (!b) return;
    document.querySelectorAll('.sw').forEach(function (t) { t.classList.remove('on'); });
    b.classList.add('on'); state.bg = b.getAttribute('data-bg'); draw();
  });
  document.getElementById('ctext').addEventListener('input', function () { state.text = this.value; draw(); });
  document.getElementById('cfont').addEventListener('change', function () { state.font = this.value; draw(); });
  document.getElementById('ctcol').addEventListener('change', function () { state.tcol = this.value; draw(); });

  /* uploads */
  document.getElementById('up').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files);
    files.forEach(function (f) {
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          state.photos.push(img);
          var empty = state.cells.findIndex(function (c) { return c.photo < 0; });
          if (empty >= 0) state.cells[empty].photo = state.photos.length - 1;
          document.getElementById('upcount').textContent = state.photos.length + ' photo' + (state.photos.length === 1 ? '' : 's') + ' added — click a photo below, then a frame to place it';
          draw();
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    this.value = '';
  });

  /* interact: select / drag / zoom */
  var drag = null, moved = 0, pending = -1;
  function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e);
    for (var i = 0; i < state.cells.length; i++) {
      var r = cellRect(state.cells[i]);
      if (p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3]) {
        state.sel = i; drag = { i: i, x: p[0], y: p[1], ox: state.cells[i].ox, oy: state.cells[i].oy };
        moved = 0; draw(); break;
      }
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = pos(e);
    var dx = p[0] - drag.x, dy = p[1] - drag.y;
    moved += Math.abs(dx) + Math.abs(dy);
    state.cells[drag.i].ox = drag.ox + dx; state.cells[drag.i].oy = drag.oy + dy;
    draw();
  });
  addEventListener('pointerup', function () { drag = null; });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var c = state.cells[state.sel]; if (!c) return;
    c.zoom = Math.min(4, Math.max(0.5, c.zoom - e.deltaY * 0.0016));
    draw();
  }, { passive: false });

  /* download gate: phone + instagram, no OTP */
  var gate = document.getElementById('cgate');
  document.getElementById('cdownload').addEventListener('click', function () {
    if (!state.photos.length) { alert('Add at least one photo first ✨'); return; }
    gate.classList.remove('hidden');
  });
  document.getElementById('cgx').addEventListener('click', function () { gate.classList.add('hidden'); });
  document.getElementById('cg-ig').addEventListener('click', function () { document.getElementById('cg-check').disabled = false; });
  document.getElementById('cg-check').addEventListener('change', function () { document.getElementById('cg-go').disabled = !this.checked; });
  document.getElementById('cg-go').addEventListener('click', function () {
    var phone = document.getElementById('cg-phone').value.trim();
    if (phone.replace(/\D/g, '').length < 8) { alert('Please enter a valid phone number.'); return; }
    fetch('/api/collage/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone, instagram: true }) }).catch(function () { });
    var a = document.createElement('a');
    a.download = 'markipie-collage.png';
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();
    gate.classList.add('hidden');
  });

  setTpl('ct4');
})();
