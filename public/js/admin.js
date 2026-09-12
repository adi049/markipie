/* MARKIPIE — mk-admin SPA */
(function () {
  'use strict';
  var root = document.getElementById('admin');
  if (!root) return;
  var S = null, TAB = 'dashboard', editing = null, detail = null;

  var collSearch = {};

  var SECTIONS = [
    ['dashboard', 'Dashboard'], ['clients', 'Clients'], ['events', 'Events'],
    ['gallery', 'Gallery'], ['media', 'Media'], ['packages', 'Packages'],
    ['bookings', 'Bookings'], ['payments', 'Payments'], ['blogs', 'Blogs'],
    ['reviews', 'Reviews'], ['team', 'Team'], ['portfolio', 'Portfolio'],
    ['services', 'Services'], ['albums', 'Albums'], ['drive', 'Google Drive'],
    ['face', 'Face Recognition'], ['messages', 'Messages'],
    ['collageTemplates', 'Collage Templates'], ['settings', 'Settings']
  ];

  var SCHEMA = {
    packages: [
      ['title', 'Title', 'text'], ['tag', 'Tag', 'text'], ['price', 'Price (₹)', 'number'],
      ['desc', 'Description', 'textarea'], ['image', 'Image', 'image'], ['features', 'Features (one per line)', 'lines'],
      ['order', 'Display order', 'number'], ['popular', 'Mark as Most Popular', 'bool'],
      ['featured', 'Featured / flagship', 'bool'], ['enabled', 'Enabled (visible on site)', 'bool']
    ],
    services: [
      ['title', 'Service name', 'text'], ['desc', 'Description', 'textarea'], ['benefit', 'Client benefit (short)', 'textarea'],
      ['image', 'Image', 'image'], ['features', 'Features (one per line)', 'lines'],
      ['featured', 'Featured', 'bool'], ['order', 'Display order', 'number'],
      ['published', 'Published (visible on site)', 'bool']
    ],
    portfolio: [
      ['title', 'Project title', 'text'], ['category', 'Category', 'select', ['Weddings', 'Pre-Weddings', 'Engagements', 'Birthdays', 'Anniversaries', 'Bridal', 'Groom', 'Baby Events', 'Parties', 'Corporate', 'Fashion', 'Traditional', 'Other']],
      ['location', 'Location', 'text'], ['date', 'Date / Year', 'text'],
      ['blurb', 'Short blurb (listing)', 'text'], ['desc', 'Description', 'textarea'],
      ['image', 'Cover image', 'image'], ['images', 'Gallery images', 'images'],
      ['featured', 'Featured', 'bool'], ['order', 'Display order', 'number'],
      ['published', 'Published (visible on site)', 'bool']
    ],
    gallery: [
      ['cat', 'Category', 'text'], ['alt', 'Alt text', 'text'], ['type', 'Type', 'select', ['image', 'video']],
      ['src', 'Image', 'image'], ['video', 'Video file', 'vselect'], ['poster', 'Video poster', 'image'], ['order', 'Display order', 'number'], ['published', 'Published (visible on site)', 'bool']
    ],
    albums: [
      ['title', 'Album name', 'text'], ['finish', 'Material / finish', 'text'], ['desc', 'Description', 'textarea'],
      ['image', 'Cover image', 'image'], ['images', 'Gallery images', 'images'],
      ['features', 'Features (one per line)', 'lines'],
      ['featured', 'Featured', 'bool'], ['order', 'Display order', 'number'],
      ['published', 'Published (visible on site)', 'bool']
    ],
    blogs: [
      ['title', 'Title', 'text'], ['slug', 'Slug', 'text'], ['category', 'Category', 'text'], ['author', 'Author', 'text'],
      ['date', 'Date', 'date'], ['cover', 'Cover', 'image'], ['seoTitle', 'SEO Title', 'text'], ['seoDesc', 'SEO Description', 'textarea'],
      ['status', 'Status', 'select', ['published', 'draft']], ['order', 'Display order', 'number'], ['content', 'Content (HTML)', 'textarea']
    ],
    reviews: [
      ['name', 'Client name', 'text'], ['rating', 'Rating (1-5)', 'number'], ['text', 'Review text', 'textarea'],
      ['event', 'Event type', 'text'], ['source', 'Source', 'text'], ['date', 'Date', 'date'],
      ['image', 'Client photo (optional)', 'image'], ['order', 'Display order', 'number'],
      ['published', 'Published (visible on site)', 'bool']
    ],
    team: [
      ['name', 'Name', 'text'], ['role', 'Role', 'text'], ['bio', 'Bio', 'textarea'], ['image', 'Photo', 'image'],
      ['instagram', 'Instagram URL', 'text'], ['linkedin', 'LinkedIn / other URL', 'text'],
      ['order', 'Display order', 'number'], ['visible', 'Visible on About page', 'bool']
    ],
    collageTemplates: [['name', 'Name', 'text'], ['cells', 'Cells JSON [[x,y,w,h]…]', 'textarea']],
    clients: [['name', 'Name', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], ['notes', 'Notes', 'textarea']],
    events: [
      ['clientId', 'Linked Client', 'client'], ['clientName', 'Client Name (display)', 'text'], ['phone', 'Phone (verifies gallery access)', 'text'], ['email', 'Email', 'text'],
      ['eventType', 'Event Type', 'select', ['Wedding', 'Pre-Wedding', 'Engagement', 'Birthday', 'Anniversary', 'Baby Event', 'Party', 'Corporate Event', 'Fashion', 'Traditional Event', 'Other']],
      ['date', 'Event Date', 'date'], ['location', 'Location', 'text'], ['code', 'Access Code', 'text'],
      ['driveFolder', 'Google Drive Folder ID', 'text'],
      ['paymentStatus', 'Payment Status', 'select', ['pending', 'partial', 'paid', 'failed', 'refunded']],
      ['galleryLive', 'Gallery Live', 'bool'],
      ['perm.downloadPhotos', 'Permission — Download Photos', 'bool'], ['perm.downloadVideos', 'Permission — Download Videos', 'bool'],
      ['perm.shareGallery', 'Permission — Share Gallery', 'bool'], ['perm.faceScan', 'Permission — Face Scan', 'bool'],
      ['perm.selection', 'Permission — Photo Selection', 'bool'], ['perm.favorites', 'Permission — Favourites', 'bool'],
      ['instagramRequired', 'Instagram Gate', 'bool']
    ],
    bookings: [['name', 'Name', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], ['eventDate', 'Event Date', 'date'], ['eventType', 'Type', 'text'], ['location', 'Location', 'text'], ['budget', 'Budget', 'text'], ['requirements', 'Package', 'text'], ['message', 'Message', 'textarea'], ['status', 'Status', 'select', ['new', 'contacted', 'confirmed', 'closed']]],
    messages: [['name', 'Name', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], ['subject', 'Subject', 'text'], ['message', 'Message', 'textarea']]
  };

  function post(url, data) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function (r) { return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

  /* ---------------- login ---------------- */
  function login() {
    root.innerHTML = '<div class="ad-login"><form id="adform" class="gate-card"><span class="ad-logo lg lg-stack">' + '<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" style="display:block"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"><rect x="1.6" y="1.6" width="36.8" height="36.8"/><path d="M11 27.4V12.6l9 9.2 9-9.2v14.8"/><path d="M20 21.8v5.6" opacity=".45"/></g></svg>' + '<span class="lg-name">MARKIPIE</span><span class="lg-rule"></span><span class="lg-desc">Studio Console</span></span><h2>Studio Admin</h2><label>Password<input type="password" id="adpass" autocomplete="current-password"></label><button class="btn btn-dark big" type="submit">Enter</button><p class="gate-hint" id="aderr"></p></form></div>';
    document.getElementById('adform').addEventListener('submit', function (e) {
      e.preventDefault();
      post('/api/admin/login', { password: document.getElementById('adpass').value }).then(function (j) {
        if (j.ok) load(); else document.getElementById('aderr').textContent = j.error;
      });
    });
  }

  function load() {
    fetch('/api/admin/all').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (d) {
      S = d; render();
    }).catch(login);
  }

  /* ---------------- shell ---------------- */
  function render() {
    root.innerHTML = '<div class="ad-shell"><aside class="ad-side"><span class="ad-logo lg lg-stack">' + '<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" style="display:block"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"><rect x="1.6" y="1.6" width="36.8" height="36.8"/><path d="M11 27.4V12.6l9 9.2 9-9.2v14.8"/><path d="M20 21.8v5.6" opacity=".45"/></g></svg>' + '<span class="lg-name">MARKIPIE</span><span class="lg-rule"></span><span class="lg-desc">Studio Console</span></span><nav>' +
      SECTIONS.map(function (s) { return '<button class="ad-tab' + (TAB === s[0] ? ' on' : '') + '" data-t="' + s[0] + '">' + s[1] + '</button>'; }).join('') +
      '</nav><button class="ad-logout" id="adout">Log out</button></aside><main class="ad-main" id="admain"></main></div>';
    root.querySelectorAll('.ad-tab').forEach(function (b) { b.addEventListener('click', function () { TAB = b.getAttribute('data-t'); editing = null; detail = null; render(); }); });
    document.getElementById('adout').addEventListener('click', function () { post('/api/admin/logout', {}).then(function () { location.reload(); }); });
    var main = document.getElementById('admain');
    if (TAB === 'dashboard') return dash(main);
    if (TAB === 'payments') return payments(main);
    if (TAB === 'drive') return drive(main);
    if (TAB === 'face') return face(main);
    if (TAB === 'events') return events(main);
    if (TAB === 'clients') return clients(main);
    if (TAB === 'media') return media(main);
    if (TAB === 'settings') return settings(main);
    return collView(main, TAB);
  }

  function upBtn(key) {
    return '<div class="imgup"><label class="imgup-b">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="' + key + '" hidden></label><span class="imgup-s"></span></div>';
  }

  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }

  /* ---------------- dashboard ---------------- */
  function dash(main) {
    var ev = S.events, bk = S.bookings, mg = S.messages;
    var st = S.stats || {};
    var cards = [
      ['Total Clients', st.clients], ['Active Events', st.activeEvents], ['Total Media', st.media],
      ['Pending Payments', st.pendingPayments], ['New Bookings', st.newBookings], ['Photos Selected', st.selections]
    ];
    var secWarn = (S.integrations && S.integrations.bootstrapPassword)
      ? '<div class="ad-warn ad-warn-big">Security: this admin account still uses the auto-generated bootstrap password. '
        + 'Change it in Settings, or set ADMIN_PASSWORD in the environment, before going live. '
        + 'The server refuses to start in production until you do.</div>'
      : '';
    main.innerHTML = secWarn + '<h1>Dashboard</h1><div class="ad-cards">' + cards.map(function (c) { return '<div class="ad-card"><strong>' + c[1] + '</strong><span>' + c[0] + '</span></div>'; }).join('') + '</div>' +
      '<div class="ad-int">' + intBadge('Google Drive', S.integrations && S.integrations.drive) + intBadge('SMS OTP', S.integrations && S.integrations.otp) + '</div>' +
      '<h2>Latest bookings</h2>' + table(bk.slice(-5).reverse(), ['name', 'eventType', 'eventDate', 'status']) +
      '<h2>Latest messages</h2>' + table(mg.slice(-5).reverse(), ['name', 'subject', 'createdAt']);
  }
  function intBadge(name, on) {
    return '<span class="ad-badge ' + (on ? 'ok' : 'off') + '">' + name + ': ' + (on ? 'Connected' : 'Not configured') + '</span>';
  }
  function table(rows, cols) {
    if (!rows.length) return '<p class="ad-empty">Nothing yet.</p>';
    return '<table class="ad-table"><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' +
      rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(r[c]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }

  /* ---------------- generic collection editor ---------------- */
  function collView(main, name) {
    var schema = SCHEMA[name];
    var rows = (S[name] || []).slice();
    if (editing) return editForm(main, name, schema, editing);

    // the visibility flag differs per collection
    var VIS = { team: 'visible', packages: 'enabled', blogs: 'status' };
    var visKey = VIS[name] || 'published';
    var hasVis = schema.some(function (f) { return f[0] === visKey; });
    var hasOrder = schema.some(function (f) { return f[0] === 'order'; });
    if (hasOrder) rows.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });

    function isHidden(r) {
      if (visKey === 'status') return r.status !== 'published';
      return r[visKey] === false;
    }
    function label(r) { return String(r.title || r.name || r.slug || r.id || ''); }

    var q = (collSearch[name] || '').toLowerCase();
    var shown = q ? rows.filter(function (r) {
      return JSON.stringify(r).toLowerCase().indexOf(q) >= 0;
    }) : rows;

    main.innerHTML = '<h1>' + SECTIONS.find(function (s) { return s[0] === name; })[1] + '</h1>' +
      '<div class="ad-toolbar">' +
        '<button class="btn btn-dark" id="adadd">+ Add New</button>' +
        '<input id="adsearch" class="ad-search" type="search" placeholder="Search ' + name + '…" value="' + esc(collSearch[name] || '') + '">' +
        '<span class="ad-count">' + shown.length + ' of ' + rows.length + '</span>' +
      '</div>' +
      '<div id="adstatus" class="ad-status" hidden></div>' +
      '<div class="ad-list">' + (shown.length ? shown.map(function (r, i) {
        return '<div class="ad-row' + (isHidden(r) ? ' is-hidden' : '') + '">' +
          (r.image || r.cover || r.src ? '<img src="' + esc(r.image || r.cover || r.src) + '" class="ad-thumb" loading="lazy">' : '') +
          '<div class="ad-row-t"><strong>' + esc(label(r)) +
            (typeof r.price === 'number' ? ' <em class="ad-row-price">' + inr(r.price) + '</em>' : '') +
            (isHidden(r) ? ' <em class="ad-row-off">' + (visKey === 'status' ? 'draft' : 'hidden') + '</em>' : '') +
            (r.featured || r.popular ? ' <em class="ad-row-feat">featured</em>' : '') +
          '</strong><span>' + esc(r.tag || r.role || r.cat || r.category || r.finish || r.event || '') + '</span></div>' +
          '<div class="ad-row-a">' +
            (hasOrder ? '<button class="tbtn ord" data-up="' + r.id + '"' + (i === 0 ? ' disabled' : '') + ' title="Move up">↑</button>' +
                        '<button class="tbtn ord" data-dn="' + r.id + '"' + (i === shown.length - 1 ? ' disabled' : '') + ' title="Move down">↓</button>' : '') +
            (hasVis ? '<button class="tbtn" data-v="' + r.id + '">' + (isHidden(r) ? 'Publish' : 'Hide') + '</button>' : '') +
            '<button class="tbtn" data-e="' + r.id + '">Edit</button>' +
            '<button class="tbtn danger" data-d="' + r.id + '">Delete</button>' +
          '</div></div>';
      }).join('') : '<p class="ad-empty">' + (q ? 'No matches for “' + esc(q) + '”.' : 'Nothing yet — add your first item.') + '</p>') + '</div>';

    var box = document.getElementById('adstatus');
    function say(msg, bad) {
      box.textContent = msg; box.className = 'ad-status' + (bad ? ' bad' : ' ok'); box.hidden = false;
      setTimeout(function () { box.hidden = true; }, 3200);
    }
    function busy(on) { main.classList.toggle('is-busy', !!on); }

    var si = document.getElementById('adsearch');
    si.addEventListener('input', function () {
      collSearch[name] = si.value;
      var pos = si.selectionStart; render();
      var ns = document.getElementById('adsearch');
      if (ns) { ns.focus(); ns.setSelectionRange(pos, pos); }
    });

    document.getElementById('adadd').addEventListener('click', function () { editing = {}; render(); });

    main.querySelectorAll('[data-e]').forEach(function (b) {
      b.addEventListener('click', function () {
        editing = JSON.parse(JSON.stringify(rows.find(function (r) { return r.id === b.getAttribute('data-e'); })));
        render();
      });
    });

    main.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = rows.find(function (x) { return x.id === b.getAttribute('data-d'); });
        if (!confirm('Delete “' + label(r) + '”?\n\nThis removes it from the public website immediately and cannot be undone.')) return;
        busy(true);
        post('/api/admin/coll/' + name + '/delete', { id: b.getAttribute('data-d') })
          .then(function (j) { busy(false); if (j && j.ok === false) return say(j.error || 'Delete failed.', true); say('Deleted.'); load(); })
          .catch(function () { busy(false); say('Delete failed — check your connection.', true); });
      });
    });

    // publish / hide
    main.querySelectorAll('[data-v]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = rows.find(function (x) { return x.id === b.getAttribute('data-v'); });
        var patch = { id: r.id };
        if (visKey === 'status') patch.status = isHidden(r) ? 'published' : 'draft';
        else patch[visKey] = isHidden(r);
        busy(true);
        post('/api/admin/coll/' + name + '/save', { item: patch })
          .then(function (j) { busy(false); if (j && j.ok === false) return say(j.error || 'Update failed.', true); say(isHidden(r) ? 'Published — now live.' : 'Hidden from the public site.'); load(); })
          .catch(function () { busy(false); say('Update failed.', true); });
      });
    });

    // reorder: swap order values with the neighbour
    function move(id, dir) {
      var i = shown.findIndex(function (r) { return r.id === id; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= shown.length) return;
      var a = shown[i], b2 = shown[j];
      var ao = a.order || (i + 1) * 10, bo = b2.order || (j + 1) * 10;
      if (ao === bo) { bo = ao + dir * 10; }
      busy(true);
      Promise.all([
        post('/api/admin/coll/' + name + '/save', { item: { id: a.id, order: bo } }),
        post('/api/admin/coll/' + name + '/save', { item: { id: b2.id, order: ao } })
      ]).then(function () { busy(false); say('Order updated.'); load(); })
        .catch(function () { busy(false); say('Could not reorder.', true); });
    }
    main.querySelectorAll('[data-up]').forEach(function (b) { b.addEventListener('click', function () { move(b.getAttribute('data-up'), -1); }); });
    main.querySelectorAll('[data-dn]').forEach(function (b) { b.addEventListener('click', function () { move(b.getAttribute('data-dn'), 1); }); });
  }

  function editForm(main, name, schema, item) {
    main.innerHTML = '<h1>' + (item.id ? 'Edit' : 'New') + ' — ' + name + '</h1><form id="adform" class="ad-form">' +
      schema.map(function (f) {
        var key = f[0], label = f[1], type = f[2], val = item[key];
        if (type === 'lines') val = (val || []).join('\n');
        if (type === 'textarea') return '<label class="full">' + label + '<textarea name="' + key + '" rows="4">' + esc(val) + '</textarea></label>';
        if (type === 'select') return '<label>' + label + '<select name="' + key + '">' + f[3].map(function (o) { return '<option' + (val === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></label>';
        if (type === 'client') {
          return '<label>' + label + '<select name="' + key + '"><option value="">— none —</option>' +
            (S.clients || []).map(function (c) { return '<option value="' + c.id + '"' + (val === c.id ? ' selected' : '') + '>' + esc(c.name) + (c.phone ? ' · ' + esc(c.phone) : '') + '</option>'; }).join('') + '</select></label>';
        }
        if (type === 'bool') {
          if (key.indexOf('perm.') === 0) { var pk = key.slice(5); val = (item.permissions || {})[pk]; if (val === undefined) val = true; }
          return '<label class="check"><input type="checkbox" name="' + key + '"' + (val ? ' checked' : '') + '> ' + label + '</label>';
        }
        if (type === 'image') return '<label class="full">' + label + '<div class="imgpick"><input name="' + key + '" value="' + esc(val) + '" placeholder="/images/… or https://…">' + upBtn(key) + '<div class="imgprev">' + (val ? '<img src="' + esc(val) + '">' : '') + '</div><div class="imgopts">' + S.assets.map(function (a) { return '<img src="' + a + '" data-a="' + a + '" class="' + (val === a ? 'on' : '') + '">'; }).join('') + '</div></div></label>';
        if (type === 'images') {
          var sel = Array.isArray(val) ? val : [];
          return '<label class="full">' + label +
            '<div class="imgpick multi" data-multi="' + key + '">' +
              '<input type="hidden" name="' + key + '" value="' + esc(sel.join(',')) + '">' + upBtn(key) +
              '<div class="imgsel">' + (sel.length ? sel.map(function (a) {
                  return '<span class="imgsel-i"><img src="' + esc(a) + '"><button type="button" class="imgsel-x" data-rm="' + esc(a) + '">&times;</button></span>';
                }).join('') : '<em class="imgsel-none">No images selected</em>') + '</div>' +
              '<div class="imgopts">' + S.assets.map(function (a) {
                  return '<img src="' + a + '" data-add="' + a + '" class="' + (sel.indexOf(a) >= 0 ? 'on' : '') + '">';
                }).join('') + '</div>' +
            '</div></label>';
        }
        if (type === 'vselect') return '<label class="full">' + label + '<select name="' + key + '"><option value="">—</option>' + S.videos.map(function (v) { return '<option' + (val === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label>';
        return '<label>' + label + '<input name="' + key + '" type="' + (type === 'number' ? 'number' : type === 'date' ? 'date' : 'text') + '" value="' + esc(val) + '"></label>';
      }).join('') +
      '<div class="ad-form-a"><button class="btn btn-dark" type="submit">Save</button><button class="tbtn" type="button" id="adcancel">Cancel</button></div></form>';
    var form = document.getElementById('adform');
    // Delegated so it survives any re-render of the picker's inner markup.
    function multiVals(pick) {
      return pick.querySelector('input').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    function paintMulti(pick) {
      var cur = multiVals(pick);
      var box = pick.querySelector('.imgsel');
      box.innerHTML = cur.length ? cur.map(function (a) {
        return '<span class="imgsel-i"><img src="' + a + '"><button type="button" class="imgsel-x" data-rm="' + a + '">&times;</button></span>';
      }).join('') : '<em class="imgsel-none">No images selected</em>';
      pick.querySelectorAll('.imgopts img').forEach(function (o) {
        o.classList.toggle('on', cur.indexOf(o.getAttribute('data-add')) >= 0);
      });
    }
    form.addEventListener('click', function (ev) {
      // remove chip
      var rm = ev.target.closest('[data-rm]');
      if (rm && form.contains(rm)) {
        ev.preventDefault();
        var pick = rm.closest('.imgpick');
        var inp = pick.querySelector('input');
        inp.value = multiVals(pick).filter(function (x) { return x !== rm.getAttribute('data-rm'); }).join(',');
        paintMulti(pick);
        return;
      }
      var im = ev.target.closest('img[data-add], img[data-a]');
      if (!im || !form.contains(im)) return;
      ev.preventDefault();
      ev.stopPropagation();
      var pick = im.closest('.imgpick');
      var inp = pick.querySelector('input');
      if (pick.classList.contains('multi')) {
        var add = im.getAttribute('data-add');
        var cur = multiVals(pick);
        var i = cur.indexOf(add);
        if (i >= 0) cur.splice(i, 1); else cur.push(add);
        inp.value = cur.join(',');
        paintMulti(pick);
        return;
      }
      inp.value = im.getAttribute('data-a');
      var prev = pick.querySelector('.imgprev');
      if (prev) prev.innerHTML = '<img src="' + im.getAttribute('data-a') + '">';
    });
    form.querySelectorAll('.imgpick.multi').forEach(function (pk) { paintMulti(pk); });

    // §14 upload: post raw bytes, then select the returned path
    form.querySelectorAll('[data-upload]').forEach(function (fi) {
      fi.addEventListener('change', function () {
        var file = fi.files && fi.files[0]; if (!file) return;
        var pick = fi.closest('.imgpick');
        var note = pick.querySelector('.imgup-s');
        if (file.size > 8 * 1024 * 1024) { note.textContent = 'Too large (max 8 MB).'; note.className = 'imgup-s bad'; fi.value = ''; return; }
        note.textContent = 'Uploading\u2026'; note.className = 'imgup-s';
        fetch('/api/admin/upload?name=' + encodeURIComponent(file.name), {
          method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j.ok) { note.textContent = j.error || 'Upload failed.'; note.className = 'imgup-s bad'; return; }
          note.textContent = 'Uploaded \u2713'; note.className = 'imgup-s ok';
          var multi = pick.classList.contains('multi');
          var inp = multi ? pick.querySelector('input[type=hidden]') : pick.querySelector('input[name]');
          if (multi) { var cur = multiVals(pick); cur.push(j.src); inp.value = cur.join(','); }
          else {
            inp.value = j.src;
            var prev = pick.querySelector('.imgprev'); if (prev) prev.innerHTML = '<img src="' + j.src + '">';
          }
          var opts = pick.querySelector('.imgopts');
          if (opts && !opts.querySelector('[data-add="' + j.src + '"], [data-a="' + j.src + '"]')) {
            var im = document.createElement('img');
            im.src = j.src;
            im.setAttribute(multi ? 'data-add' : 'data-a', j.src);
            opts.insertBefore(im, opts.firstChild);
          }
          if (multi) paintMulti(pick);
          if (S.assets.indexOf(j.src) < 0) S.assets.unshift(j.src);
        }).catch(function () { note.textContent = 'Upload failed.'; note.className = 'imgup-s bad'; });
        fi.value = '';
      });
    });
    document.getElementById('adcancel').addEventListener('click', function () { editing = null; render(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = JSON.parse(JSON.stringify(item));
      schema.forEach(function (f) {
        var el = form.elements[f[0]]; if (!el) return;
        if (f[2] === 'bool') {
          if (f[0].indexOf('perm.') === 0) { out.permissions = out.permissions || {}; out.permissions[f[0].slice(5)] = el.checked; }
          else out[f[0]] = el.checked;
        }
        else if (f[2] === 'number') out[f[0]] = Number(el.value);
        else if (f[2] === 'lines') out[f[0]] = el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        else if (f[2] === 'images') out[f[0]] = el.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        else if (f[2] === 'textarea' && f[0] === 'cells') { try { out.cells = JSON.parse(el.value); } catch (err) { } }
        else out[f[0]] = el.value;
      });
      post('/api/admin/coll/' + name + '/save', { item: out }).then(function () { editing = null; load(); });
    });
  }


  /* ---------------- clients (with linked events) ---------------- */
  function clients(main) {
    if (editing) return editForm(main, 'clients', SCHEMA.clients, editing);
    if (detail) {
      var c = S.clients.find(function (x) { return x.id === detail; });
      if (!c) { detail = null; return render(); }
      var evs = S.events.filter(function (e) { return e.clientId === c.id; });
      main.innerHTML = '<button class="tbtn" id="cback">← All clients</button><h1>' + esc(c.name) + '</h1>' +
        '<p class="gate-hint">' + esc(c.phone || 'no phone') + ' · ' + esc(c.email || 'no email') + '</p>' +
        '<p class="ad-warn">The phone number here is what the client must enter to unlock their gallery.</p>' +
        '<h2>Events</h2>' + (evs.length ? evs.map(function (e) {
          return '<div class="ad-row"><div class="ad-row-t"><strong>' + esc(e.eventType) + ' · ' + esc(e.date || '') + '</strong>' +
            '<span>code <code>' + esc(e.code) + '</code> · ' + esc(e.paymentStatus) + ' · ' + (e.media || []).length + ' photos · ' +
            (e.selections || []).length + ' selected · ' + (e.favourites || []).length + ' favourites</span>' +
            '<span class="ev-meta">' + (e.galleryLive ? 'Gallery live' : 'Gallery off') + ' · ' + (e.accessLog || []).length + ' unlocks</span></div>' +
            '<div class="ad-row-a"><a class="tbtn" href="/client/' + esc(e.code) + '" target="_blank">Open gallery</a>' +
            '<a class="tbtn" href="/api/admin/export/selections/' + e.id + '">Selections CSV</a></div></div>';
        }).join('') : '<p class="ad-empty">No events linked yet.</p>') +
        '<h2>Notes</h2><p>' + (esc(c.notes) || '—') + '</p>';
      document.getElementById('cback').addEventListener('click', function () { detail = null; render(); });
      return;
    }
    main.innerHTML = '<h1>Clients</h1><button class="btn btn-dark" id="adadd">+ Add Client</button><div class="ad-list">' +
      S.clients.map(function (c) {
        var n = S.events.filter(function (e) { return e.clientId === c.id; }).length;
        return '<div class="ad-row"><div class="ad-row-t"><strong>' + esc(c.name) + '</strong><span>' + esc(c.phone || '') + ' · ' + n + ' event(s)</span></div>' +
          '<div class="ad-row-a"><button class="tbtn" data-v="' + c.id + '">View</button><button class="tbtn" data-e="' + c.id + '">Edit</button><button class="tbtn danger" data-d="' + c.id + '">Delete</button></div></div>';
      }).join('') + '</div>';
    document.getElementById('adadd').addEventListener('click', function () { editing = {}; render(); });
    main.querySelectorAll('[data-v]').forEach(function (b) { b.addEventListener('click', function () { detail = b.getAttribute('data-v'); render(); }); });
    main.querySelectorAll('[data-e]').forEach(function (b) { b.addEventListener('click', function () { editing = JSON.parse(JSON.stringify(S.clients.find(function (r) { return r.id === b.getAttribute('data-e'); }))); render(); }); });
    main.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Delete client?')) return; post('/api/admin/coll/clients/delete', { id: b.getAttribute('data-d') }).then(load); }); });
  }


  /* ---------------- media library (real assets on disk + per-event media) ---------------- */
  function media(main) {
    var evTotal = S.events.reduce(function (n, e) { return n + (e.media || []).length + (e.videos || []).length; }, 0);
    var driveTotal = S.events.reduce(function (n, e) { return n + (e.media || []).concat(e.videos || []).filter(function (m) { return m.driveId; }).length; }, 0);
    main.innerHTML = '<h1>Media Library</h1>' +
      '<div class="ad-cards">' +
        '<div class="ad-card"><strong>' + S.assets.length + '</strong><span>Site images</span></div>' +
        '<div class="ad-card"><strong>' + S.videos.length + '</strong><span>Site videos</span></div>' +
        '<div class="ad-card"><strong>' + evTotal + '</strong><span>Event media</span></div>' +
        '<div class="ad-card"><strong>' + driveTotal + '</strong><span>From Google Drive</span></div>' +
      '</div>' +
      '<p class="gate-hint">Site assets live in <code>public/images</code> and <code>public/videos</code>. Event media is imported per event from Google Drive (see the Google Drive tab).</p>' +
      '<h2>Site images</h2><div class="ad-assets">' +
        S.assets.map(function (a) { return '<figure class="ad-asset"><img loading="lazy" src="' + a + '" alt=""><figcaption>' + a.replace('/images/', '') + '</figcaption></figure>'; }).join('') +
      '</div>' +
      '<h2>Site videos</h2><div class="ad-assets">' +
        S.videos.map(function (v) { return '<figure class="ad-asset"><video src="' + v + '" muted preload="metadata"></video><figcaption>' + v.replace('/videos/', '') + '</figcaption></figure>'; }).join('') +
      '</div>' +
      '<h2>Media per event</h2>' + table(S.events.map(function (e) {
        return { event: e.clientName + ' · ' + e.eventType, photos: (e.media || []).length, videos: (e.videos || []).length,
                 drive: (e.drive && e.drive.lastSync) ? new Date(e.drive.lastSync).toLocaleDateString('en-IN') : '—' };
      }), ['event', 'photos', 'videos', 'drive']);
  }

  /* ---------------- events + share kit ---------------- */
  function events(main) {
    if (editing) {
      editForm(main, 'events', SCHEMA.events, editing);
      return;
    }
    main.innerHTML = '<h1>Events & Client Access</h1><button class="btn btn-dark" id="adadd">+ New Event</button><div class="ad-list">' +
      S.events.map(function (e) {
        return '<div class="ad-row ev"><div class="ad-row-t"><strong>' + esc(e.clientName) + ' · ' + esc(e.eventType) + '</strong>' +
          '<span>' + esc(e.date) + ' · ' + esc(e.location) + ' · <code>' + esc(e.code) + '</code> · ' + esc(e.paymentStatus) + '</span>' +
          '<span class="ev-meta">' + (e.selections || []).length + ' selected · ' + (e.favourites || []).length + ' favourites · ' + (e.accessLog || []).length + ' unlocks · ' + (e.media || []).length + ' photos</span></div>' +
          '<div class="ad-row-a"><button class="tbtn" data-k="' + e.id + '">Share Kit + QR</button><button class="tbtn" data-e="' + e.id + '">Edit</button><button class="tbtn danger" data-d="' + e.id + '">Delete</button></div></div>';
      }).join('') + '</div><div id="kit"></div>';
    document.getElementById('adadd').addEventListener('click', function () { editing = { galleryLive: true, instagramRequired: true, faceRecognition: true, paymentStatus: 'pending' }; render(); });
    main.querySelectorAll('[data-e]').forEach(function (b) { b.addEventListener('click', function () { editing = JSON.parse(JSON.stringify(S.events.find(function (r) { return r.id === b.getAttribute('data-e'); }))); render(); }); });
    main.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Delete event?')) return; post('/api/admin/coll/events/delete', { id: b.getAttribute('data-d') }).then(load); }); });
    main.querySelectorAll('[data-k]').forEach(function (b) { b.addEventListener('click', function () { kit(S.events.find(function (r) { return r.id === b.getAttribute('data-k'); })); }); });
  }
  function kit(e) {
    var link = location.origin + '/client/' + e.code;
    var el = h('<div class="ad-kit"><h2>Share Kit — ' + esc(e.clientName) + '</h2>' +
      '<div class="kit-grid"><div><label>Client Access Link</label><div class="kit-row"><input readonly value="' + link + '"><button class="tbtn" id="kcopy">Copy</button></div>' +
      '<label>Access Code</label><div class="kit-row"><input readonly value="' + esc(e.code) + '"><button class="tbtn" id="kcopy2">Copy</button></div>' +
      '<p class="gate-hint">Share the link or print the QR on the event card. Clients enter with their access code and the phone number registered for the event.</p></div>' +
      '<div id="kqr" class="kit-qr"></div></div>');
    document.getElementById('kit').innerHTML = '';
    document.getElementById('kit').appendChild(el);
    new QRCode(el.querySelector('#kqr'), { text: link, width: 168, height: 168, colorDark: '#23272B', colorLight: '#FBFAF8' });
    el.querySelector('#kcopy').addEventListener('click', function () { navigator.clipboard.writeText(link); this.textContent = '✓'; });
    el.querySelector('#kcopy2').addEventListener('click', function () { navigator.clipboard.writeText(e.code); this.textContent = '✓'; });
    el.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------------- payments ---------------- */
  function payments(main) {
    main.innerHTML = '<h1>Payments & Permissions</h1><p class="gate-hint">Status is verified server-side. Downloads require “paid”. Gallery access, downloads and sharing are enforced by the server, never by the browser.</p>' +
      '<div class="ad-list">' + S.events.map(function (e) {
        return '<div class="ad-row"><div class="ad-row-t"><strong>' + esc(e.clientName) + '</strong><span>' + esc(e.eventType) + ' · ' + esc(e.date) + '</span></div>' +
          '<div class="ad-row-a pay-a"><select data-pay="' + e.id + '">' + ['pending', 'partial', 'paid', 'failed', 'refunded'].map(function (s) { return '<option' + (e.paymentStatus === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
          ['downloadPhotos:Photos', 'downloadVideos:Videos', 'shareGallery:Share', 'faceScan:Face', 'selection:Select', 'favorites:Favs'].map(function (pp) {
            var k = pp.split(':')[0], lbl = pp.split(':')[1];
            var on = (e.permissions || {})[k]; if (on === undefined) on = true;
            return '<label class="check"><input type="checkbox" data-perm="' + e.id + '" data-pk="' + k + '"' + (on ? ' checked' : '') + '> ' + lbl + '</label>';
          }).join('') +
          '<label class="check"><input type="checkbox" data-gl="' + e.id + '"' + (e.galleryLive ? ' checked' : '') + '> Live</label>' +
          '<a class="tbtn" href="/api/admin/export/selections/' + e.id + '">Export CSV</a></div></div>';
      }).join('') + '</div>';
    main.querySelectorAll('[data-pay],[data-perm],[data-gl]').forEach(function (el) {
      el.addEventListener('change', function () {
        var id = el.getAttribute('data-pay') || el.getAttribute('data-perm') || el.getAttribute('data-gl');
        var e = S.events.find(function (x) { return x.id === id; });
        if (el.hasAttribute('data-pay')) e.paymentStatus = el.value;
        if (el.hasAttribute('data-perm')) { e.permissions = e.permissions || {}; e.permissions[el.getAttribute('data-pk')] = el.checked; }
        if (el.hasAttribute('data-gl')) e.galleryLive = el.checked;
        post('/api/admin/coll/events/save', { item: e }).then(load);
      });
    });
  }

  /* ---------------- drive ---------------- */
  function drive(main) {
    main.innerHTML = '<h1>Google Drive Delivery</h1>' +
      '<p class="gate-hint">Connect a Drive folder per event. Markipie imports the media and serves it through the private gallery — clients are <strong>never</strong> sent to Google Drive, and your API key stays on the server.</p>' +
      '<div class="ad-int">' + intBadge('Google Drive', S.integrations && S.integrations.drive) + '</div>' +
      (S.integrations && S.integrations.drive ? '' : '<p class="ad-warn">Set <code>GOOGLE_DRIVE_API_KEY</code> in the environment (recommended) or paste a key below. Without it, syncing is disabled — no fake success is reported.</p>') +
      '<label class="full ad-field">Google Drive API Key' + (S.settings.driveApiKeySet ? ' <em>(a key is saved — leave blank to keep it)</em>' : '') + '<input id="dkey" value="" type="password" placeholder="AIza…"></label>' +
      '<button class="btn btn-dark" id="dsavekey">Save Key</button>' +
      '<div class="ad-list" style="margin-top:22px">' + S.events.map(function (e) {
        var d = e.drive || {};
        var sync = d.lastSync ? new Date(d.lastSync).toLocaleString('en-IN') : 'never';
        return '<div class="ad-row"><div class="ad-row-t"><strong>' + esc(e.clientName) + '</strong>' +
          '<span>' + (e.media || []).length + ' photos · ' + (e.videos || []).length + ' videos · last sync: ' + esc(sync) + (d.pages ? ' · ' + d.pages + ' page(s)' : '') + '</span>' +
          (d.lastError ? '<span class="ev-meta err">⚠ ' + esc(d.lastError) + '</span>' : '') + '</div>' +
          '<div class="ad-row-a"><input data-f="' + e.id + '" value="' + esc((e.drive && e.drive.folderId) || e.driveFolder || '') + '" placeholder="Drive folder ID"><button class="tbtn" data-s="' + e.id + '">Sync Now</button><a class="tbtn" href="/client/' + esc(e.code) + '" target="_blank">View Media</a><span class="syncmsg" id="sm-' + e.id + '"></span></div></div>';
      }).join('') + '</div>';
    document.getElementById('dsavekey').addEventListener('click', function () {
      var v = document.getElementById('dkey').value.trim();
      if (!v) { alert('Enter a key, or leave the existing one in place.'); return; }
      post('/api/admin/coll/settings/save', { item: { driveApiKey: v } }).then(function () { alert('Saved.'); load(); });
    });
    main.querySelectorAll('[data-f]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var e = S.events.find(function (x) { return x.id === inp.getAttribute('data-f'); });
        e.driveFolder = inp.value.trim();
        post('/api/admin/coll/events/save', { item: e });
      });
    });
    main.querySelectorAll('[data-s]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-s'); var msg = document.getElementById('sm-' + id);
        msg.textContent = 'Syncing… (all pages)'; b.disabled = true;
        var fid = main.querySelector('[data-f="' + id + '"]').value.trim();
        post('/api/admin/drive/sync', { eventId: id, folderId: fid }).then(function (j) {
          b.disabled = false;
          msg.textContent = j.ok ? ('✓ ' + j.images + ' photos, ' + j.videos + ' videos across ' + j.pages + ' page(s)' + (j.partial ? ' (partial: ' + j.error + ')' : '')) : ('✗ ' + (j.error || 'error'));
          if (j.ok) setTimeout(load, 900);
        }).catch(function () { b.disabled = false; msg.textContent = '✗ network error'; });
      });
    });
  }

  /* ---------------- face recognition ---------------- */
  function face(main) {
    main.innerHTML = '<h1>Face Recognition</h1>' +
      '<div class="ad-cards"><div class="ad-card"><strong>On-device</strong><span>Models run in the client’s browser</span></div><div class="ad-card"><strong>Live camera</strong><span>No uploads, no skips</span></div><div class="ad-card"><strong>' + (S.settings.faceRecognition ? 'Enabled' : 'Disabled') + '</strong><span>Global switch</span></div></div>' +
      '<label class="check ad-field"><input type="checkbox" id="fon"' + (S.settings.faceRecognition ? ' checked' : '') + '> Enable AI face recognition in client galleries</label>' +
      '<label class="ad-field">Match threshold (lower = stricter, default 0.55)<input id="fth" type="number" step="0.01" min="0.3" max="0.8" value="' + esc(S.settings.faceThreshold) + '"></label>' +
      '<label class="ad-field">Minimum detector confidence (default 0.4)<input id="fmc" type="number" step="0.05" min="0.1" max="0.9" value="' + esc(S.settings.faceMinConfidence == null ? 0.4 : S.settings.faceMinConfidence) + '"></label>' +
      '<label class="ad-field">Maximum photos per scan (default 2000)<input id="fmp" type="number" step="50" min="50" value="' + esc(S.settings.faceMaxPhotos == null ? 2000 : S.settings.faceMaxPhotos) + '"></label>' +
      '<button class="btn btn-dark" id="fsave">Save</button>' +
      '<p class="gate-hint">Matching is automatic and never 100% accurate — lighting, angle and partial faces affect results. Models served locally: tiny face detector, 68-landmark alignment, 128-d recognition embedding (dlib ResNet). Matching uses Euclidean distance between live-scan embedding and per-photo embeddings.</p>';
    document.getElementById('fsave').addEventListener('click', function () {
      post('/api/admin/coll/settings/save', { item: {
        faceRecognition: document.getElementById('fon').checked,
        faceThreshold: Number(document.getElementById('fth').value) || 0.55,
        faceMinConfidence: Number(document.getElementById('fmc').value) || 0.4,
        faceMaxPhotos: Number(document.getElementById('fmp').value) || 2000
      } }).then(function () { alert('Saved.'); load(); });
    });
  }

  /* ---------------- settings ---------------- */
  function settings(main) {
    var s = S.settings;
    var GROUPS = [
      ['Brand', [['brand', 'Brand name'], ['tagline', 'Tagline'], ['bookingCta', 'Booking CTA label']]],
      ['Contact', [['phone', 'Phone (display)'], ['phoneRaw', 'Phone (tel: link)'], ['whatsapp', 'WhatsApp number'], ['email', 'Email'], ['address', 'Address'], ['workingHours', 'Working hours']]],
      ['Social', [['instagram', 'Instagram URL'], ['instagramHandle', 'Instagram handle'], ['facebook', 'Facebook URL'], ['youtube', 'YouTube URL'], ['twitter', 'X / Twitter URL']]],
      ['Footer', [['footerTagline', 'Footer tagline'], ['footerText', 'Footer description']]]
    ];
    var FIELDS = GROUPS.reduce(function (a, g) { return a.concat(g[1].map(function (f) { return f[0]; })); }, []);

    main.innerHTML = '<h1>Settings</h1>' +
      '<p class="gate-hint">Business information only. API keys, passwords and credentials are never stored here — they live in environment variables on the server.</p>' +
      '<div id="adstatus" class="ad-status" hidden></div>' +
      '<form id="adform" class="ad-form">' +
      GROUPS.map(function (g) {
        return '<h2 class="ad-group">' + g[0] + '</h2>' + g[1].map(function (f) {
          var long = f[0] === 'footerText' || f[0] === 'address';
          return long
            ? '<label class="full">' + f[1] + '<textarea name="' + f[0] + '" rows="3">' + esc(s[f[0]] || '') + '</textarea></label>'
            : '<label class="full">' + f[1] + '<input name="' + f[0] + '" value="' + esc(s[f[0]] || '') + '"></label>';
        }).join('');
      }).join('') +
      '<h2 class="ad-group">Logo</h2>' +
      '<p class="gate-hint">The logo is drawn in code as an SVG wordmark and monogram (no image file), so it stays sharp everywhere. Edit it in <code>lib/logo.js</code>; the brand name above is used for the copyright line.</p>' +
      '<h2 class="ad-group">Display</h2>' +
      '<label class="check"><input type="checkbox" name="introEnabled"' + (s.introEnabled ? ' checked' : '') + '> Cinematic intro on first visit</label>' +
      '<h2 class="ad-group">Admin access</h2>' +
      '<label class="full">Change admin password (min 8 characters — leave blank to keep current)<input name="newPassword" type="password" autocomplete="new-password" value=""></label>' +
      '<div class="ad-form-a"><button class="btn btn-dark" type="submit" id="adsave">Save Settings</button></div></form>';

    var box = document.getElementById('adstatus');
    function say(msg, bad) {
      box.textContent = msg; box.className = 'ad-status' + (bad ? ' bad' : ' ok'); box.hidden = false;
      setTimeout(function () { box.hidden = true; }, 3500);
    }
    document.getElementById('adform').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = document.getElementById('adsave');
      if (btn.disabled) return;                       // prevent duplicate submit
      btn.disabled = true; btn.textContent = 'Saving…';
      var out = {};
      FIELDS.forEach(function (k) { if (f.elements[k]) out[k] = f.elements[k].value; });
      out.introEnabled = f.elements.introEnabled.checked;
      var np = f.elements.newPassword.value;
      post('/api/admin/coll/settings/save', { item: out }).then(function (j) {
        if (j && j.ok === false) { btn.disabled = false; btn.textContent = 'Save Settings'; return say(j.error || 'Could not save.', true); }
        if (!np) { say('Saved — public website updated.'); btn.disabled = false; btn.textContent = 'Save Settings'; return load(); }
        post('/api/admin/password', { password: np }).then(function (p) {
          btn.disabled = false; btn.textContent = 'Save Settings';
          say(p.ok ? 'Saved. Admin password updated.' : (p.error || 'Saved, but password unchanged.'), !p.ok);
          load();
        });
      }).catch(function () { btn.disabled = false; btn.textContent = 'Save Settings'; say('Network error — nothing saved.', true); });
    });
  }


  load();
})();
