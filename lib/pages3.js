'use strict';
const ui = require('./ui');
const { esc } = ui;

/* ============ CLIENT ACCESS (entry) ============ */
function clientEntry(db) {
  const s = db.read('settings');
  return ui.shell({
    settings: s, active: '/client',
    meta: { path: '/client', title: 'Client Access | MARKIPIE Private Gallery', desc: 'Enter your private Markipie gallery with your event access code or QR code. AI face recognition finds your photos instantly.' },
    body: `
<section class="phead gate-head"><div class="wrap"><p class="kicker" data-rv="up">Client Access</p>
<h1 class="h1" data-rv="mask"><span>Your private gallery awaits.</span></h1>
<p class="lead" data-rv="up">Enter the access code from your photographer — or scan the QR code on your event card.</p></div></section>
<section class="sec gate-sec"><div class="wrap">
  <form class="gate-card" id="gateform" data-rv="zoom" novalidate>
    <svg class="gate-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="11" rx="2.5"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/><circle cx="12" cy="15.5" r="1.6"/></svg>
    <label>Event Access Code<input id="gatecode" placeholder="e.g. RAHUL2026" autocomplete="off" required></label>
    <button class="btn btn-dark big" type="submit">Open My Gallery</button>
    <p class="gate-hint">Your access code and registered phone number are your key.</p>
  </form>
</div></section>`,
    scripts: '<script>document.getElementById("gateform").addEventListener("submit",e=>{e.preventDefault();const c=document.getElementById("gatecode").value.trim();if(c)location.href="/client/"+encodeURIComponent(c);});</script>'
  });
}

/* ============ CLIENT EVENT (private gallery app shell) ============ */
function clientEvent(db, code) {
  const s = db.read('settings');
  const ev = db.list('events').find(e => e.code.toLowerCase() === String(code).toLowerCase());
  return ui.shell({
    settings: s, active: '/client', noIntro: false,
    meta: { path: '/client/' + encodeURIComponent(code), title: (ev ? ev.clientName + ' — ' : '') + 'MARKIPIE Private Gallery', desc: 'Private client gallery by Markipie. Access with your code and phone number, scan your face to find your photos, select album favourites and download approved content.' },
    body: `
<div class="cerr hidden" id="cerr" role="alert"></div><div class="ctoast" id="ctoast" role="status"></div>
<div id="capp" data-code="${esc(ev ? ev.code : code)}" data-exists="${ev ? '1' : '0'}" data-ig="${ev && ev.instagramRequired ? '1' : '0'}" data-face="${ev && ev.faceRecognition && s.faceRecognition ? '1' : '0'}" data-igurl="${esc(s.instagram)}" data-ighandle="${esc(s.instagramHandle)}">
  <!-- STEP: CODE -->
  <section class="cstep" id="step-code"><div class="wrap">
    <form class="gate-card" id="cform-code" novalidate>
      <svg class="gate-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="11" rx="2.5"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/><circle cx="12" cy="15.5" r="1.6"/></svg>
      <h2>MARKIPIE Private Gallery</h2>
      <label>Access Code<input id="cc-code" value="${esc(ev ? ev.code : code)}" required autocomplete="off"></label>
      <button class="btn btn-dark big" type="submit">Continue</button>
    </form>
  </div></section>
  <!-- STEP: PHONE -->
  <section class="cstep hidden" id="step-phone"><div class="wrap">
    <form class="gate-card" id="cform-phone" novalidate>
      <svg class="gate-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>
      <h2>Almost there</h2>
      <p class="gate-sub">We check this against the number registered for your event.</p>
      <p class="gate-sub small" id="phone-hint"></p>
      <label>Phone Number<input id="cc-phone" inputmode="tel" placeholder="+91 …" required></label>
      <button class="btn btn-dark big" type="submit">Continue</button>
    </form>
  </div></section>
  <!-- STEP: OTP -->
  <section class="cstep hidden" id="step-otp"><div class="wrap">
    <form class="gate-card" id="cform-otp" novalidate>
      <svg class="gate-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
      <h2>Verify your number</h2>
      <p class="gate-sub" id="otp-status">Sending code…</p>
      <label>6-digit Code<input id="cc-otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label>
      <button class="btn btn-dark big" type="submit">Verify</button>
      <p class="gate-hint"><a href="#" id="otp-resend">Resend code</a></p>
    </form>
  </div></section>
  <!-- STEP: INSTAGRAM -->
  <section class="cstep hidden" id="step-ig"><div class="wrap">
    <div class="gate-card" id="cform-ig">
      <svg class="gate-ic ig" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c2.7 0 3 0 4.1.1 1 0 1.6.2 2 .4.5.2.8.4 1.2.8.4.4.6.7.8 1.2.2.4.3 1 .4 2 .1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.6-.4 2-.2.5-.4.8-.8 1.2-.4.4-.7.6-1.2.8-.4.2-1 .3-2 .4-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.6-.2-2-.4-.5-.2-.8-.4-1.2-.8-.4-.4-.6-.7-.8-1.2-.2-.4-.3-1-.4-2-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c0-1 .2-1.6.4-2 .2-.5.4-.8.8-1.2.4-.4.7-.6 1.2-.8.4-.2 1-.3 2-.4 1.1-.1 1.4-.1 4.1-.1zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"/></svg>
      <h2>One lovely thing first</h2>
      <p class="gate-sub">Follow us on Instagram to continue — it’s how we share previews, reels and delivery updates. We ask for your confirmation; we don’t read your Instagram account.</p>
      <a class="btn btn-igc big" id="iglink" href="${esc(s.instagram)}" target="_blank" rel="noopener">Follow ${esc(s.instagramHandle)}</a>
      <label class="check"><input type="checkbox" id="igcheck" disabled> I’ve followed Markipie on Instagram</label>
      <button class="btn btn-dark big" id="iggo" disabled>Enter My Gallery</button>
    </div>
  </div></section>

  <!-- GALLERY APP -->
  <section class="capp-main hidden" id="cmain"><div class="wrap wide">
    <div class="c-head">
      <div><p class="kicker dark">MARKIPIE Private Gallery</p><h1 id="c-title">—</h1>
        <p class="c-event" id="c-event"></p><p id="c-date" class="c-sub"></p>
        <div class="c-stats" id="c-stats"></div></div>
      <div class="c-badges" id="c-badges"></div>
    </div>
    <div class="c-pay hidden" id="c-pay"></div>
    <div class="c-tools">
      <div class="c-tabs" id="c-tabs">
        <button class="chip on" data-tab="all">All Photos</button>
        <button class="chip" data-tab="videos">Videos</button>
        <button class="chip" data-tab="ai">✨ AI Matches</button>
        <button class="chip" data-tab="fav">Favourites</button>
        <button class="chip" data-tab="sel">Selected <span id="selcount">0</span></button>
      </div>
      <div class="c-acts">
        <button class="tbtn" id="btn-face" title="Scan your face to find your photos">📷 Scan Your Face</button>
        <button class="tbtn" id="btn-selall">Select All</button>
        <button class="tbtn" id="btn-desel">Deselect All</button>
        <button class="tbtn primary" id="btn-save">Save Selection</button>
        <button class="tbtn" id="btn-logout" title="Sign out of this gallery">Sign Out</button>
      </div>
    </div>
    <div class="c-grid" id="c-grid"></div>
    <p class="c-empty hidden" id="c-empty">Nothing here yet.</p>
  </div></section>

  <!-- FACE SCAN MODAL -->
  <div class="modal hidden" id="facemodal">
    <div class="modal-card">
      <button class="lb-x" id="faceclose" aria-label="Close">✕</button>
      <h3>Find Your Moments</h3>
      <p class="gate-sub">Look into the camera and we’ll find the moments you appear in — including photos stored on Google Drive. Matching happens on your device. Results are automatic and not guaranteed to be perfect.</p>
      <div class="face-stage"><video id="facevideo" autoplay muted playsinline></video><canvas id="faceoverlay"></canvas><div class="face-hint" id="facehint">Starting camera…</div></div>
      <div class="face-acts"><button class="btn btn-dark big" id="facescan" disabled>Scan My Face</button></div>
      <div class="face-progress hidden" id="faceprog"><div class="bar"><i id="facebar"></i></div><span id="facetext">Matching…</span><button class="tbtn hidden" id="facecancel">Cancel scan</button></div>
      <div class="face-result hidden" id="faceresult"><strong id="facecount"></strong><p class="face-note" id="facenote"></p><button class="btn btn-dark" id="faceshow">Show My Photos</button></div>
    </div>
  </div>
</div>
<div class="lightbox" id="lightbox" aria-hidden="true"><button class="lb-x" aria-label="Close">✕</button><button class="lb-prev" aria-label="Previous">‹</button><button class="lb-next" aria-label="Next">›</button><div class="lb-stage" id="lbstage"></div><div class="lb-bar"><span id="lbcount"></span><button id="lbdl" class="hidden">⬇ Download</button><button id="lbshare" class="hidden">↗ Share</button><button id="lbfav">♡ Favourite</button><button id="lbsel">Select</button></div></div>`,
    scripts: '<script src="/vendor/face-api.min.js"></script><script src="/js/client.js"></script>'
  });
}

/* ============ COLLAGE ============ */
function collage(db) {
  const s = db.read('settings');
  const tpls = db.list('collageTemplates');
  return ui.shell({
    settings: s, active: '/collage',
    meta: { path: '/collage', title: 'Create Your Collage | MARKIPIE Studio', desc: 'Create your own premium photo collage free — upload photos, choose beautiful layouts, drag, zoom, add text and download. A gift from Markipie.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Create Your Collage</p>
<h1 class="h1" data-rv="mask"><span>Your photos, our canvas.</span></h1>
<p class="lead" data-rv="up">Upload, arrange, zoom, add a line of text — and take home a premium collage. Free, from us to you.</p></div></section>
<section class="sec col-sec"><div class="wrap wide col-wrap">
  <div class="col-side">
    <div class="col-block"><h3>1 · Upload Photos</h3><label class="up-btn">Choose Photos<input type="file" id="up" accept="image/*" multiple hidden></label><p class="col-hint" id="upcount">0 photos added</p></div>
    <div class="col-block"><h3>2 · Layout</h3><div class="tpl-row" id="tplrow">${tpls.map((t, i) => `<button class="tpl${i === 3 ? ' on' : ''}" data-tpl="${t.id}" title="${esc(t.name)}"><span class="tpl-prev" data-cells='${JSON.stringify(t.cells)}'></span><em>${esc(t.name)}</em></button>`).join('')}</div></div>
    <div class="col-block"><h3>3 · Backdrop</h3><div class="sw-row" id="swrow">${['#FBFAF8', '#F1EBE6', '#EAEAE4', '#E4DDD1', '#141210', '#B08D57'].map((c, i) => `<button class="sw${i === 0 ? ' on' : ''}" data-bg="${c}" style="background:${c}"></button>`).join('')}</div></div>
    <div class="col-block"><h3>4 · Text (optional)</h3><input id="ctext" class="col-input" placeholder="e.g. Always & Forever"><div class="txt-opts"><select id="cfont"><option value="serif">Serif · Elegant</option><option value="sans">Sans · Modern</option></select><select id="ctcol"><option value="#141210">Charcoal</option><option value="#FBFAF8">Ivory</option><option value="#B08D57">Champagne</option><option value="#C9A227">Gold</option></select></div></div>
    <div class="col-block"><button class="btn btn-dark big" id="cdownload">Create Collage ⬇</button><p class="col-hint">Free download after a quick hello 👋</p></div>
  </div>
  <div class="col-stage"><canvas id="ccanvas" width="1200" height="1500"></canvas><p class="col-hint stage-hint">Click a photo to select · drag to move · scroll / pinch to zoom</p></div>
</div></section>

<div class="modal hidden" id="cgate">
  <div class="modal-card">
    <button class="lb-x" id="cgx" aria-label="Close">✕</button>
    <h3>Almost yours ✨</h3>
    <p class="gate-sub">Tell us your number and follow Markipie on Instagram to download your collage.</p>
    <label>Phone Number<input id="cg-phone" inputmode="tel" placeholder="+91 …"></label>
    <a class="btn btn-igc big" id="cg-ig" href="${esc(s.instagram)}" target="_blank" rel="noopener">Follow ${esc(s.instagramHandle)}</a>
    <label class="check"><input type="checkbox" id="cg-check" disabled> I’ve followed Markipie on Instagram</label>
    <button class="btn btn-dark big" id="cg-go" disabled>Download My Collage</button>
  </div>
</div>`,
    scripts: '<script src="/js/collage.js"></script>'
  });
}

/* ============ ADMIN ============ */
function admin(db) {
  const s = db.read('settings');
  return ui.shell({
    settings: s, active: '',
    meta: { path: '/mk-admin', title: 'MK Admin | MARKIPIE', desc: 'Markipie studio administration.', headExtra: '<meta name="robots" content="noindex,nofollow"><script>document.documentElement.classList.add("adminhtml")</script>' },
    body: '<div id="admin"></div><script>document.body.classList.add("admin-page")</script>',
    scripts: '<script src="/vendor/qrcode.min.js"></script><script src="/js/admin.js"></script>'
  });
}

function notFound(db) {
  const s = db.read('settings');
  return ui.shell({
    settings: s, active: '',
    meta: { path: '/404', title: 'Page Not Found | MARKIPIE' },
    body: '<section class="phead"><div class="wrap"><p class="kicker">404</p><h1 class="h1">This frame doesn’t exist.</h1><p class="lead">Let’s take you back to something beautiful.</p><div class="cta-btns" style="margin-top:24px"><a class="btn btn-dark" href="/">Back Home</a></div></div></section>'
  });
}


/* ============ §10 PUBLIC SHARED GALLERY (read-only, token-scoped) ============
   Deliberately minimal: photographs only. No phone, no payment status, no
   selections/favourites, no download endpoints, no access code. */
function sharedGallery(db, ev, tok) {
  const s = db.read('settings');
  const cl = ev.clientId ? db.get('clients', ev.clientId) : null;
  const name = esc((cl && cl.name) || ev.clientName || 'Private Gallery');
  const photos = (ev.media || []).filter(m => m.type !== 'video');
  const grid = photos.map((m, i) => `
    <figure class="sg-item" data-i="${i}">
      <img loading="lazy" src="/api/s/${esc(tok)}/m/${esc(m.id)}" alt="${esc(m.alt || name + ' photograph')}">
    </figure>`).join('');
  return ui.shell({
    settings: s, active: '', noIntro: true,
    meta: {
      path: '/s/' + tok,
      title: name + ' · Shared Gallery | MARKIPIE',
      desc: 'A shared selection of photographs by Markipie.',
      noindex: true
    },
    body: `
<section class="phead sg-head"><div class="wrap">
  <p class="kicker" data-rv="up">Shared Gallery</p>
  <h1 class="h1" data-rv="mask"><span>${name}</span></h1>
  <p class="sg-meta">${esc(ev.eventType || '')}${ev.date ? ' · ' + esc(ev.date) : ''} · ${photos.length} photograph${photos.length === 1 ? '' : 's'}</p>
  <p class="sg-note">You are viewing a read-only gallery shared with you. Downloads and selections are available to the client only.</p>
</div></section>
<section class="sec"><div class="wrap"><div class="sg-grid">${grid || '<p class="sg-note">No photographs have been shared yet.</p>'}</div></div></section>
<div class="sg-lb" id="sglb" aria-hidden="true"><button class="sg-x" id="sgx" aria-label="Close">&times;</button><img id="sgimg" alt=""></div>`,
    scripts: `<script>
(function(){
  var lb=document.getElementById('sglb'),im=document.getElementById('sgimg');
  var srcs=${JSON.stringify(photos.map(m => '/api/s/' + tok + '/m/' + m.id))};
  document.querySelectorAll('.sg-item').forEach(function(el){
    el.addEventListener('click',function(){ im.src=srcs[+el.dataset.i]; lb.classList.add('on'); });
  });
  function close(){ lb.classList.remove('on'); im.src=''; }
  document.getElementById('sgx').addEventListener('click',close);
  lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
  addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
})();
</script>`
  });
}

module.exports = { clientEntry, clientEvent, collage, admin, notFound, sharedGallery };
