'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./lib/db');
const ui = require('./lib/ui');
const P1 = require('./lib/pages1');
const P2 = require('./lib/pages2');
const P3 = require('./lib/pages3');
const LOGO = require('./lib/logo');
const auth = require('./lib/auth');
const phoneUtil = require('./lib/phone');
const rl = require('./lib/ratelimit');
const otp = require('./lib/otp');
const drive = require('./lib/drive');

const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const PRIVATE_MEDIA = path.join(__dirname, 'private-media'); // NEVER served statically
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.bin': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.ico': 'image/x-icon', '.json': 'application/json' };

/* ---------- helpers ---------- */
const send = (res, code, body, headers) => { res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers)); res.end(body); };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const html = (res, code, body) => send(res, code, body, { 'Cache-Control': 'no-cache' });

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function rawBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('too-large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = ''; let len = 0;
    req.on('data', c => { len += c.length; if (len > 2 * 1024 * 1024) { reject(new Error('too large')); req.destroy(); } data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); } });
    req.on('error', reject);
  });
}
const token = () => crypto.randomBytes(24).toString('hex');
const cookieFlags = (maxAge) => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (IS_PROD ? '; Secure' : '');

/* input sanitisation */
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max || 500);
const cleanEmail = (v) => { const s = clean(v, 200); return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s) ? s : ''; };

function adminOk(req) {
  const c = parseCookies(req); const t = c.mk_admin; if (!t) return false;
  const s = db.read('sessions', {}); const rec = s[t];
  return !!(rec && rec.exp > Date.now());
}
function clientSession(req) {
  const c = parseCookies(req); const t = c.mk_client; if (!t) return null;
  const s = db.read('clientSessions', {}); const rec = s[t];
  if (!rec || rec.exp < Date.now()) return null;
  return rec;
}
function saveClientSession(t, rec) { const s = db.read('clientSessions', {}); s[t] = rec; db.write('clientSessions', s); }

/** Canonical permissions for an event (handles legacy records). */
function permsOf(ev) {
  const p = ev.permissions || {};
  const legacyD = ev.allowDownload !== false, legacyS = ev.allowShare !== false;
  return {
    downloadPhotos: p.downloadPhotos !== undefined ? !!p.downloadPhotos : legacyD,
    downloadVideos: p.downloadVideos !== undefined ? !!p.downloadVideos : legacyD,
    shareGallery: p.shareGallery !== undefined ? !!p.shareGallery : legacyS,
    faceScan: p.faceScan !== undefined ? !!p.faceScan : ev.faceRecognition !== false,
    selection: p.selection !== undefined ? !!p.selection : true,
    favorites: p.favorites !== undefined ? !!p.favorites : true
  };
}
/** Server-side download authority. Never trust the frontend. */
function canDownload(ev, media) {
  const perms = permsOf(ev);
  const isVideo = media && media.type === 'video';
  if (isVideo && !perms.downloadVideos) return { ok: false, error: 'Video downloads are not enabled for this gallery.' };
  if (!isVideo && !perms.downloadPhotos) return { ok: false, error: 'Photo downloads are not enabled for this gallery.' };
  if (ev.paymentStatus !== 'paid') return { ok: false, error: 'Downloads unlock once the final payment is complete.' };
  return { ok: true };
}
const findEventByCode = (code) => db.list('events').find(e => String(e.code || '').toLowerCase() === String(code || '').toLowerCase());
const clientOf = (ev) => (ev.clientId ? db.get('clients', ev.clientId) : null);

/** The phone(s) a gallery will accept. */
function expectedPhones(ev) {
  const out = [];
  const c = clientOf(ev);
  if (c && c.phone) out.push(c.phone);
  if (ev.phone) out.push(ev.phone);
  if (Array.isArray(ev.allowedPhones)) out.push(...ev.allowedPhones);
  return out.filter(p => p && !phoneUtil.isMasked(p));
}

/* ---------- static ---------- */
function serveStatic(req, res, urlPath) {
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const file = path.join(PUB, safe);
  if (!file.startsWith(PUB)) return false;
  let st; try { st = fs.statSync(file); } catch (e) { return false; }
  if (st.isDirectory()) return false;
  const ext = path.extname(file).toLowerCase();
  // §15: only content-addressed media may be cached hard. Code (js/css) must
  // revalidate, otherwise admin/site updates never reach returning browsers.
  const CODE = ext === '.js' || ext === '.css' || ext === '.html' || ext === '.json';
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': CODE ? 'no-cache, must-revalidate' : 'public, max-age=604800'
  };
  // ETag lets the browser revalidate cheaply (304 instead of a full re-download)
  const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
  headers.ETag = etag;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return true; }
  // range support for video scrubbing
  const range = req.headers.range;
  if (range && (ext === '.mp4')) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= st.size) end = st.size - 1;
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); res.end(); return true; }
    res.writeHead(206, Object.assign({}, headers, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 }));
    fs.createReadStream(file, { start, end }).pipe(res);
    return true;
  }
  headers['Content-Length'] = st.size;
  if (ext === '.mp4') headers['Accept-Ranges'] = 'bytes';
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
  return true;
}

/* ---------- API ---------- */
async function api(req, res, u) {
  const p = u.pathname; const m = req.method;
  const settings = db.read('settings');
  const ip = rl.clientIp(req);

  /* public: bookings + contact */
  if (p === '/api/bookings' && m === 'POST') {
    const lim = rl.hit('bk:' + ip, 10, 10 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: 'Too many requests. Please try again shortly.' });
    const b = await body(req);
    const name = clean(b.name, 120), ph = clean(b.phone, 30), date = clean(b.eventDate, 30);
    if (!name || !ph || !date) return json(res, 400, { ok: false, error: 'Name, phone and event date are required.' });
    if (!phoneUtil.isPlausible(ph)) return json(res, 400, { ok: false, error: 'Please enter a valid phone number.' });
    db.saveItem('bookings', {
      id: db.uid('bk'), name, phone: ph, email: cleanEmail(b.email), eventDate: date,
      eventType: clean(b.eventType, 60), location: clean(b.location, 160), package: clean(b.package, 80),
      message: clean(b.message, 1500), status: 'new', createdAt: new Date().toISOString().slice(0, 10)
    });
    return json(res, 200, { ok: true, message: 'Request received — we will confirm your date shortly.' });
  }
  if (p === '/api/contact' && m === 'POST') {
    const lim = rl.hit('ct:' + ip, 10, 10 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: 'Too many requests. Please try again shortly.' });
    const b = await body(req);
    const name = clean(b.name, 120), msg = clean(b.message, 2000);
    if (!name || !msg) return json(res, 400, { ok: false, error: 'Name and message are required.' });
    db.saveItem('messages', { id: db.uid('msg'), name, phone: clean(b.phone, 30), email: cleanEmail(b.email), message: msg, createdAt: new Date().toISOString().slice(0, 10) });
    return json(res, 200, { ok: true });
  }

  /* ---------- client access ---------- */
  if (p === '/api/client/verify' && m === 'POST') {
    const lim = rl.hit('cv:' + ip, 12, 10 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: `Too many attempts. Try again in ${lim.retryAfter}s.` });
    const { code } = await body(req);
    const ev = findEventByCode(code);
    if (!ev) return json(res, 404, { ok: false, error: 'Access code not found. Check your event card or message us.' });
    if (!ev.galleryLive) return json(res, 403, { ok: false, error: 'This gallery is not live yet. Your photographer will switch it on soon.' });
    const c = clientOf(ev);
    return json(res, 200, {
      ok: true,
      title: (c ? c.name : ev.clientName) + ' · ' + ev.eventType,
      instagramRequired: !!ev.instagramRequired,
      face: permsOf(ev).faceScan && !!settings.faceRecognition,
      otp: otp.enabled(),
      // §3: never reveal the stored phone, not even masked/partial.
      hasPhone: expectedPhones(ev).length > 0
    });
  }

  /* step 1: phone must match the event/client record */
  if (p === '/api/client/phone' && m === 'POST') {
    const b = await body(req);
    const ev = findEventByCode(b.code);
    if (!ev) return json(res, 404, { ok: false, error: 'Access code not found.' });
    const lim = rl.hit('cp:' + ip + ':' + ev.id, 8, 15 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: `Too many verification attempts. Try again in ${Math.ceil(lim.retryAfter / 60)} minute(s).` });
    if (!ev.galleryLive) return json(res, 403, { ok: false, error: 'Gallery not live yet.' });
    if (!phoneUtil.isPlausible(b.phone)) return json(res, 400, { ok: false, error: 'Please enter a valid phone number.' });

    const allowed = expectedPhones(ev);
    if (!allowed.length) {
      return json(res, 403, { ok: false, error: 'No verified phone number is on file for this event. Please contact the studio.' });
    }
    const match = allowed.some(a => phoneUtil.same(a, b.phone));
    if (!match) {
      // deliberately vague; never reveal the stored number
      return json(res, 403, { ok: false, error: 'This phone number is not registered for this event. Please use the number you gave the studio.' });
    }
    // phone matched -> issue a short-lived pending ticket (not a gallery session)
    const t = token();
    const pend = db.read('pending', {});
    pend[t] = { event: ev.id, phone: phoneUtil.normalize(b.phone), exp: Date.now() + 15 * 60 * 1000, phoneOk: true, otpOk: !otp.enabled(), ig: false };
    db.write('pending', pend);
    res.setHeader('Set-Cookie', 'mk_pending=' + t + '; ' + cookieFlags(900));
    return json(res, 200, { ok: true, otpRequired: otp.enabled(), instagramRequired: !!ev.instagramRequired });
  }

  /* step 2 (optional): OTP */
  if (p === '/api/client/otp/send' && m === 'POST') {
    const c = parseCookies(req); const pend = db.read('pending', {}); const rec = pend[c.mk_pending];
    if (!rec || rec.exp < Date.now() || !rec.phoneOk) return json(res, 401, { ok: false, error: 'Start again from your access code.' });
    const lim = rl.hit('otp:' + ip, 5, 15 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: 'Too many code requests. Please wait.' });
    if (!otp.configured()) return json(res, 501, { ok: false, error: 'OTP verification is not configured on this server.' });
    try {
      const r = await otp.issue(c.mk_pending, '+91' + rec.phone);
      if (!r.ok) return json(res, 502, { ok: false, error: r.error });
      return json(res, 200, { ok: true, sentTo: phoneUtil.mask(rec.phone) });
    } catch (e) { return json(res, 502, { ok: false, error: 'Could not send the code: ' + e.message }); }
  }
  if (p === '/api/client/otp/verify' && m === 'POST') {
    const b = await body(req);
    const c = parseCookies(req); const pend = db.read('pending', {}); const rec = pend[c.mk_pending];
    if (!rec || rec.exp < Date.now()) return json(res, 401, { ok: false, error: 'Start again from your access code.' });
    const lim = rl.hit('otpv:' + ip, 12, 15 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: 'Too many attempts.' });
    const r = otp.verify(c.mk_pending, b.code);
    if (!r.ok) return json(res, 400, { ok: false, error: r.error });
    rec.otpOk = true; pend[c.mk_pending] = rec; db.write('pending', pend);
    return json(res, 200, { ok: true });
  }

  /* step 3: instagram gate + session issue */
  if (p === '/api/client/unlock' && m === 'POST') {
    const b = await body(req);
    const c = parseCookies(req); const pend = db.read('pending', {}); const rec = pend[c.mk_pending];
    if (!rec || rec.exp < Date.now() || !rec.phoneOk) {
      return json(res, 401, { ok: false, error: 'Please verify your phone number first.' });
    }
    const ev = db.get('events', rec.event);
    if (!ev) return json(res, 404, { ok: false, error: 'Event not found.' });
    if (!ev.galleryLive) return json(res, 403, { ok: false, error: 'Gallery not live yet.' });
    if (otp.enabled() && !rec.otpOk) return json(res, 403, { ok: false, error: 'Please complete SMS verification.' });
    if (ev.instagramRequired && !b.instagram) return json(res, 400, { ok: false, error: 'Please follow Markipie on Instagram to continue.' });

    ev.accessLog = ev.accessLog || [];
    ev.accessLog.push({ phone: phoneUtil.mask(rec.phone), at: new Date().toISOString(), instagram: !!b.instagram, ip });
    if (ev.accessLog.length > 200) ev.accessLog = ev.accessLog.slice(-200);
    db.saveItem('events', ev);

    const t = token();
    saveClientSession(t, {
      event: ev.id, exp: Date.now() + 24 * 3600 * 1000,
      phone: phoneUtil.mask(rec.phone),
      igGate: !!b.instagram, igAt: b.instagram ? new Date().toISOString() : null
    });
    delete pend[c.mk_pending]; db.write('pending', pend);
    res.setHeader('Set-Cookie', ['mk_client=' + t + '; ' + cookieFlags(86400), 'mk_pending=; Path=/; Max-Age=0']);
    return json(res, 200, { ok: true });
  }

  if (p === '/api/client/logout' && m === 'POST') {
    const c = parseCookies(req); const s = db.read('clientSessions', {}); delete s[c.mk_client]; db.write('clientSessions', s);
    res.setHeader('Set-Cookie', 'mk_client=; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  if (p === '/api/client/media') {
    const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false, error: 'Session expired — enter your access code again.' });
    const ev = db.get('events', sess.event);
    if (!ev) return json(res, 404, { ok: false });
    const perms = permsOf(ev);
    const cl = clientOf(ev);
    const paidFull = ev.paymentStatus === 'paid';
    return json(res, 200, {
      ok: true,
      event: {
        id: ev.id,
        clientName: cl ? cl.name : ev.clientName,
        eventType: ev.eventType,
        title: (cl ? cl.name : ev.clientName) + ' · ' + ev.eventType,
        date: ev.date, location: ev.location,
        paymentStatus: ev.paymentStatus,
        permissions: perms,
        allowDownload: (perms.downloadPhotos || perms.downloadVideos) && paidFull,
        allowShare: perms.shareGallery && ['paid', 'partial'].includes(ev.paymentStatus),
        face: perms.faceScan && !!settings.faceRecognition,
        threshold: Number(process.env.FACE_MATCH_THRESHOLD) || Number(settings.faceThreshold) || 0.55,
        minConfidence: Number(process.env.FACE_MIN_CONFIDENCE) || Number(settings.faceMinConfidence) || 0.4,
        maxScan: Number(process.env.FACE_MAX_PHOTOS) || Number(settings.faceMaxPhotos) || 2000,
        media: ev.media || [], videos: ev.videos || [],
        selections: ev.selections || [], favourites: ev.favourites || []
      }
    });
  }

  /* ---- §11/§13 PUBLIC content API: published/visible records only ----
     No authentication, so it must never leak drafts, hidden items or any
     internal field. Every response is filtered and whitelisted. */
  {
    const cm = p.match(/^\/api\/content\/([a-z]+)$/);
    if (cm && m === 'GET') {
      const PUBLIC_COLLS = {
        portfolio: ['id', 'slug', 'title', 'category', 'location', 'date', 'blurb', 'desc', 'image', 'images', 'featured', 'order'],
        packages:  ['id', 'title', 'tag', 'price', 'desc', 'features', 'image', 'popular', 'featured', 'order'],
        blogs:     ['id', 'slug', 'title', 'category', 'author', 'date', 'cover', 'seoTitle', 'seoDesc', 'order'],
        reviews:   ['id', 'name', 'rating', 'text', 'event', 'source', 'date', 'image', 'order'],
        team:      ['id', 'name', 'role', 'bio', 'image', 'instagram', 'linkedin', 'order'],
        services:  ['id', 'title', 'desc', 'benefit', 'image', 'features', 'featured', 'order'],
        albums:    ['id', 'title', 'finish', 'desc', 'image', 'images', 'features', 'featured', 'order'],
        gallery:   ['id', 'cat', 'alt', 'type', 'src', 'poster', 'order']
      };
      const coll = cm[1];
      const fields = PUBLIC_COLLS[coll];
      if (!fields) return json(res, 404, { ok: false, error: 'Unknown collection.' });

      const visible = (r) => {
        if (coll === 'blogs') return r.status === 'published';
        if (coll === 'team') return r.visible !== false && String(r.name || '').trim();
        if (coll === 'packages') return r.enabled !== false;
        return r.published !== false;
      };
      const items = db.list(coll).filter(visible)
        .sort((a, b) => (a.order || 99) - (b.order || 99))
        .map(r => { const o = {}; for (const k of fields) if (r[k] !== undefined) o[k] = r[k]; return o; });

      return json(res, 200, { ok: true, count: items.length, items });
    }
  }

  /* ---- §10 SHARE: create a signed, revocable, expiring share link ---- */
  if (p === '/api/client/share' && m === 'POST') {
    const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false, error: 'Your session has expired. Please sign in again.' });
    const ev = db.get('events', sess.event);
    if (!ev) return json(res, 404, { ok: false, error: 'Gallery not found.' });
    const perms = permsOf(ev);
    // Backend is the authority — never trust the button being visible.
    if (!perms.shareGallery) return json(res, 403, { ok: false, error: 'Sharing is not enabled for this gallery.' });
    if (!['paid', 'partial'].includes(ev.paymentStatus)) return json(res, 403, { ok: false, error: 'Sharing is not available for this gallery yet.' });

    const lim = rl.hit('share:' + sess.event, 10, 60 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: 'Too many share links created. Please try again later.' });

    const shares = db.read('shares', {});
    // Reuse an existing live link so repeated clicks don't spawn tokens.
    let tok = Object.keys(shares).find(k => shares[k].eventId === ev.id && !shares[k].revoked && shares[k].exp > Date.now());
    if (!tok) {
      tok = token();
      shares[tok] = { eventId: ev.id, created: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000, revoked: false, views: 0 };
      db.write('shares', shares);
    }
    return json(res, 200, { ok: true, url: '/s/' + tok, expires: shares[tok].exp });
  }

  if (p === '/api/client/share/revoke' && m === 'POST') {
    const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false, error: 'Your session has expired.' });
    const shares = db.read('shares', {});
    let n = 0;
    Object.keys(shares).forEach(k => { if (shares[k].eventId === sess.event && !shares[k].revoked) { shares[k].revoked = true; n++; } });
    db.write('shares', shares);
    return json(res, 200, { ok: true, revoked: n });
  }

  if (p === '/api/client/save' && m === 'POST') {
    const b = await body(req); const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false });
    const ev = db.get('events', sess.event); if (!ev) return json(res, 404, { ok: false });
    const perms = permsOf(ev);
    const ids = new Set([].concat(ev.media || [], ev.videos || []).map(x => x.id));
    if (Array.isArray(b.selections)) {
      if (!perms.selection) return json(res, 403, { ok: false, error: 'Photo selection is disabled for this gallery.' });
      ev.selections = b.selections.filter(id => ids.has(id)).slice(0, 5000);
    }
    if (Array.isArray(b.favourites)) {
      if (!perms.favorites) return json(res, 403, { ok: false, error: 'Favourites are disabled for this gallery.' });
      ev.favourites = b.favourites.filter(id => ids.has(id)).slice(0, 5000);
    }
    db.saveItem('events', ev);
    return json(res, 200, { ok: true, count: (ev.selections || []).length, favourites: (ev.favourites || []).length });
  }

  if (p === '/api/client/logmatch' && m === 'POST') {
    const b = await body(req); const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false });
    const ev = db.get('events', sess.event); if (!ev) return json(res, 404, { ok: false });
    ev.matchLog = ev.matchLog || [];
    ev.matchLog.push({ count: b.count | 0, scanned: b.scanned | 0, at: new Date().toISOString() });
    if (ev.matchLog.length > 100) ev.matchLog = ev.matchLog.slice(-100);
    db.saveItem('events', ev);
    return json(res, 200, { ok: true });
  }

  /* ---------- shared-gallery media (token-scoped, read-only) ----------
     A valid, unrevoked, unexpired share token authorises read access to that
     event's photos only. No session, no downloads, no videos. */
  let sm2 = p.match(/^\/api\/s\/([A-Za-z0-9]+)\/m\/([A-Za-z0-9_-]+)$/);
  if (sm2) {
    const shares = db.read('shares', {});
    const rec = shares[sm2[1]];
    if (!rec || rec.revoked || rec.exp < Date.now()) return json(res, 404, { ok: false, error: 'Link not available.' });
    const ev = db.get('events', rec.eventId);
    if (!ev) return json(res, 404, { ok: false, error: 'Not found.' });
    if (!permsOf(ev).shareGallery) return json(res, 404, { ok: false, error: 'Not available.' });
    if (!['paid', 'partial'].includes(ev.paymentStatus)) return json(res, 404, { ok: false, error: 'Not available.' });

    const media = (ev.media || []).find(x => x.id === sm2[2] && x.type !== 'video');
    if (!media) return json(res, 404, { ok: false, error: 'Not found.' });

    if (media.driveId) {
      const key = drive.apiKey(settings);
      if (!key) return json(res, 503, { ok: false, error: 'Drive not configured.' });
      try {
        const r = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(media.driveId) + '?alt=media&key=' + encodeURIComponent(key));
        if (!r.ok) return json(res, 502, { ok: false, error: 'Unavailable.' });
        res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'private, max-age=600' });
        return res.end(Buffer.from(await r.arrayBuffer())), true;
      } catch (e) { return json(res, 502, { ok: false, error: 'Unavailable.' }); }
    }
    if (!media.privateFile) return json(res, 404, { ok: false, error: 'Not available.' });
    const safeRel = path.normalize(media.privateFile).replace(/^([/\\])+/, '');
    const file = path.join(PRIVATE_MEDIA, safeRel);
    if (!file.startsWith(PRIVATE_MEDIA)) return json(res, 400, { ok: false, error: 'Bad path.' });
    let st2; try { st2 = fs.statSync(file); } catch (e) { return json(res, 404, { ok: false, error: 'Missing.' }); }
    const ext2 = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext2] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': st2.size,
      'Cache-Control': 'private, max-age=600'
    });
    fs.createReadStream(file).pipe(res);
    return true;
  }

  /* ---------- authenticated private media (§1) ----------
     Serves client/event photos that live OUTSIDE public/. Every request must
     prove an active gallery session that owns the media. Used by the gallery
     grid, lightbox and Face Scan — never by the public site. */
  let pm = p.match(/^\/api\/client\/media\/([A-Za-z0-9_-]+)$/);
  if (pm) {
    const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false, error: 'Session expired.' });
    const ev = db.get('events', sess.event);
    if (!ev) return json(res, 404, { ok: false, error: 'Event not found.' });
    if (!ev.galleryLive) return json(res, 403, { ok: false, error: 'Gallery is not available.' });

    // Media must belong to THIS event — cross-event ids resolve to 404.
    const media = [].concat(ev.media || [], ev.videos || []).find(x => x.id === pm[1]);
    if (!media) return json(res, 404, { ok: false, error: 'Not part of your gallery.' });

    if (!media.privateFile) return json(res, 404, { ok: false, error: 'File not available.' });
    const safeRel = path.normalize(media.privateFile).replace(/^([/\\])+/, '');
    const file = path.join(PRIVATE_MEDIA, safeRel);
    if (!file.startsWith(PRIVATE_MEDIA)) return json(res, 400, { ok: false, error: 'Bad path.' });

    let st; try { st = fs.statSync(file); } catch (e) { return json(res, 404, { ok: false, error: 'File missing on server.' }); }

    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      // private: authenticated content must never land in a shared cache
      'Cache-Control': 'private, max-age=600, no-store'
    };

    // Range support so private videos still scrub in the lightbox.
    const range = req.headers.range;
    if (range && ext === '.mp4') {
      const rm = /bytes=(\d*)-(\d*)/.exec(range);
      let start = rm && rm[1] ? parseInt(rm[1], 10) : 0;
      let end = rm && rm[2] ? parseInt(rm[2], 10) : st.size - 1;
      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end >= st.size) end = st.size - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); res.end(); return true; }
      res.writeHead(206, Object.assign({}, headers, {
        'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1
      }));
      fs.createReadStream(file, { start, end }).pipe(res);
      return true;
    }
    headers['Content-Length'] = st.size;
    if (ext === '.mp4') headers['Accept-Ranges'] = 'bytes';
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
    return true;
  }

  /* ---------- secure download: every check server-side ---------- */
  let dm = p.match(/^\/api\/client\/download\/([A-Za-z0-9_-]+)$/);
  if (dm) {
    const sess = clientSession(req);
    if (!sess) return json(res, 401, { ok: false, error: 'Session expired.' });
    const ev = db.get('events', sess.event);
    if (!ev) return json(res, 404, { ok: false, error: 'Event not found.' });
    const media = [].concat(ev.media || [], ev.videos || []).find(x => x.id === dm[1]);
    if (!media) return json(res, 404, { ok: false, error: 'This file is not part of your gallery.' });
    const gate = canDownload(ev, media);
    if (!gate.ok) return json(res, 403, { ok: false, error: gate.error });

    const fname = (media.alt || 'markipie').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80);

    if (media.driveId) {
      const key = drive.apiKey(settings);
      if (!key) return json(res, 503, { ok: false, error: 'Drive not configured.' });
      try {
        const r = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(media.driveId) + '?alt=media&key=' + encodeURIComponent(key));
        if (!r.ok) return json(res, 502, { ok: false, error: 'Source file unavailable.' });
        res.writeHead(200, {
          'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fname || 'markipie'}"`,
          'Cache-Control': 'private, no-store'
        });
        const buf = Buffer.from(await r.arrayBuffer());
        res.end(buf);
        return true;
      } catch (e) { return json(res, 502, { ok: false, error: 'Could not fetch the file.' }); }
    }
    // local file — private media lives outside public/
    let file;
    if (media.privateFile) {
      const safeRel = path.normalize(media.privateFile).replace(/^([/\\])+/, '');
      file = path.join(PRIVATE_MEDIA, safeRel);
      if (!file.startsWith(PRIVATE_MEDIA) || !fs.existsSync(file)) return json(res, 404, { ok: false, error: 'File missing on server.' });
    } else {
      const rel = String(media.src || '').split('?')[0].replace(/^\/+/, '');
      file = path.join(PUB, path.normalize(rel));
      if (!file.startsWith(PUB) || !fs.existsSync(file)) return json(res, 404, { ok: false, error: 'File missing on server.' });
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fname || 'markipie'}${ext}"`,
      'Content-Length': fs.statSync(file).size,
      'Cache-Control': 'private, no-store'
    });
    fs.createReadStream(file).pipe(res);
    return true;
  }

  /* ---------- Drive proxy (same-origin => face-api can read pixels) ---------- */
  if (p === '/api/drive/file') {
    const id = u.searchParams.get('id'); const evCode = u.searchParams.get('ev');
    const wantThumb = u.searchParams.get('thumb') === '1';
    const ev = db.list('events').find(e => e.id === evCode || String(e.code || '').toLowerCase() === String(evCode || '').toLowerCase());
    if (!ev) return json(res, 403, { ok: false });
    const sess = clientSession(req);
    if (!sess || sess.event !== ev.id) { if (!adminOk(req)) return json(res, 401, { ok: false }); }
    // the requested file must actually belong to this event
    const owned = [].concat(ev.media || [], ev.videos || []).some(x => x.driveId === id);
    if (!owned) return json(res, 403, { ok: false, error: 'File does not belong to this event.' });
    const key = drive.apiKey(settings); if (!key) return json(res, 503, { ok: false, error: 'Drive not configured' });
    const up = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media&key=' + encodeURIComponent(key);
    try {
      const r = await fetch(up);
      if (!r.ok) {
        // deleted / permission-changed file — fail soft so the gallery keeps working
        return json(res, r.status === 404 ? 404 : 502, { ok: false, error: 'Source file unavailable' });
      }
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, {
        'Content-Type': r.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': buf.length,
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(buf);
    } catch (e) { return json(res, 502, { ok: false, error: 'Drive fetch failed' }); }
    return true;
  }

  if (p === '/api/collage/download' && m === 'POST') {
    const lim = rl.hit('cd:' + ip, 20, 10 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: 'Too many requests.' });
    const b = await body(req);
    if (!phoneUtil.isPlausible(b.phone)) return json(res, 400, { ok: false, error: 'Please enter a valid phone number.' });
    db.saveItem('collageLeads', { id: db.uid('cl'), phone: clean(b.phone, 30), instagram: !!b.instagram, at: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }

  /* ---------- admin auth ---------- */
  if (p === '/api/admin/login' && m === 'POST') {
    const lim = rl.hit('al:' + ip, 8, 15 * 60 * 1000);
    if (!lim.ok) return json(res, 429, { ok: false, error: `Too many attempts. Try again in ${Math.ceil(lim.retryAfter / 60)} minute(s).` });
    const b = await body(req);
    if (!auth.configured()) return json(res, 503, { ok: false, error: 'No admin credential configured. Run: node migrate.js' });
    if (!auth.verify(b.password)) return json(res, 401, { ok: false, error: 'Incorrect password.' });
    rl.reset('al:' + ip);
    const t = token(); const ss = db.read('sessions', {});
    ss[t] = { exp: Date.now() + 12 * 3600 * 1000, ip };
    db.write('sessions', ss);
    res.setHeader('Set-Cookie', 'mk_admin=' + t + '; ' + cookieFlags(43200));
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/logout' && m === 'POST') {
    const c = parseCookies(req); const ss = db.read('sessions', {}); delete ss[c.mk_admin]; db.write('sessions', ss);
    res.setHeader('Set-Cookie', 'mk_admin=; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  /* ---------- admin only ---------- */
  if (p.startsWith('/api/admin/')) {
    if (!adminOk(req)) return json(res, 401, { ok: false, error: 'auth' });

    if (p === '/api/admin/all') {
      const cols = ['settings', 'packages', 'services', 'portfolio', 'gallery', 'albums', 'blogs', 'reviews', 'reviewMeta', 'team', 'collageTemplates', 'clients', 'events', 'bookings', 'messages'];
      const out = {}; cols.forEach(c => out[c] = db.read(c, c === 'settings' || c === 'reviewMeta' ? {} : []));
      if (out.settings) { out.settings = Object.assign({}, out.settings); delete out.settings.adminPassword; out.settings.driveApiKeySet = !!drive.apiKey(out.settings); delete out.settings.driveApiKey; }
      out.assets = fs.readdirSync(path.join(PUB, 'images')).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).map(f => '/images/' + f);
      out.videos = fs.readdirSync(path.join(PUB, 'videos')).filter(f => /\.mp4$/i.test(f)).map(f => '/videos/' + f);
      out.integrations = { drive: drive.configured(db.read('settings')), otp: otp.configured(), otpProvider: otp.PROVIDER || null, bootstrapPassword: auth.isBootstrap() };
      // real stats only
      const evs = out.events || [];
      out.stats = {
        clients: (out.clients || []).length,
        activeEvents: evs.filter(e => e.galleryLive).length,
        totalEvents: evs.length,
        media: evs.reduce((n, e) => n + (e.media || []).length + (e.videos || []).length, 0),
        pendingPayments: evs.filter(e => e.paymentStatus !== 'paid').length,
        newBookings: (out.bookings || []).filter(b => b.status === 'new').length,
        selections: evs.reduce((n, e) => n + (e.selections || []).length, 0)
      };
      return json(res, 200, out);
    }

    if (p === '/api/admin/password' && m === 'POST') {
      const b = await body(req);
      const pw = String(b.password || '');
      if (pw.length < 8) return json(res, 400, { ok: false, error: 'Password must be at least 8 characters.' });
      auth.setPassword(pw);
      return json(res, 200, { ok: true });
    }

    let mm = p.match(/^\/api\/admin\/coll\/([a-zA-Z]+)\/(save|delete)$/);
    if (mm && m === 'POST') {
      const coll = mm[1]; const allowed = ['packages', 'services', 'portfolio', 'gallery', 'albums', 'blogs', 'reviews', 'reviewMeta', 'team', 'collageTemplates', 'clients', 'events', 'bookings', 'messages', 'settings'];
      if (!allowed.includes(coll)) return json(res, 400, { ok: false });
      const b = await body(req);
      if (coll === 'settings') {
        // §14: whitelist. Anything not listed here can never be written via the
        // CMS — that includes credentials, face tuning and internal flags.
        const TEXT = ['brand', 'tagline', 'bookingCta', 'phone', 'phoneRaw', 'whatsapp', 'email',
          'address', 'workingHours', 'instagram', 'instagramHandle', 'facebook', 'youtube',
          'twitter', 'footerTagline', 'footerText'];
        const BOOL = ['introEnabled', 'faceRecognition'];
        const src = b.item || {};
        const item = {};
        for (const k of TEXT) if (src[k] !== undefined) item[k] = clean(src[k], k === 'footerText' ? 600 : 300);
        for (const k of BOOL) if (src[k] !== undefined) item[k] = !!src[k];
        // URL-ish fields must look like links (or be blank)
        for (const k of ['instagram', 'facebook', 'youtube', 'twitter']) {
          if (item[k] && !/^https?:\/\//i.test(item[k])) return json(res, 400, { ok: false, error: k + ' must start with http:// or https://' });
        }
        if (item.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(item.email)) return json(res, 400, { ok: false, error: 'Please enter a valid email address.' });
        if (item.brand !== undefined && !item.brand.trim()) return json(res, 400, { ok: false, error: 'Brand name cannot be empty.' });
        // driveApiKey is a credential, not CMS content: only the dedicated Drive
        // panel may set it, and only when it sends nothing else.
        const onlyDriveKey = Object.keys(src).length === 1 && typeof src.driveApiKey === 'string';
        if (onlyDriveKey && src.driveApiKey !== '') item.driveApiKey = src.driveApiKey;
        db.write('settings', Object.assign(db.read('settings', {}), item));
        return json(res, 200, { ok: true });
      }
      if (coll === 'reviewMeta') { db.write(coll, Object.assign(db.read(coll, {}), b.item || {})); return json(res, 200, { ok: true }); }
      if (mm[2] === 'delete') { db.remove(coll, b.id); return json(res, 200, { ok: true }); }
      const prev = b.item && b.item.id ? db.get(coll, b.item.id) : null;
      const item = Object.assign({}, prev || {}, b.item || {});
      if (coll === 'packages') {
        if (item.price != null) item.price = Math.max(0, Number(item.price) || 0);
        if (item.features && !Array.isArray(item.features)) item.features = String(item.features).split('\n').map(s => s.trim()).filter(Boolean);
        if (prev && item.features && JSON.stringify(item.features) !== JSON.stringify(prev.features)) item.featuresEdited = true;
        if (prev && item.desc !== prev.desc) item.descEdited = true;
      }
      if (coll === 'events') {
        if (!item.code) item.code = (item.clientName || 'EVENT').replace(/[^a-zA-Z]+/g, '').toUpperCase().slice(0, 8) + String(Date.now()).slice(-4);
        if (!item.id) { item.id = db.uid('ev'); item.media = item.media || []; item.videos = item.videos || []; item.selections = []; item.favourites = []; item.accessLog = []; }
        if (!item.permissions) item.permissions = { downloadPhotos: true, downloadVideos: true, shareGallery: true, faceScan: true, selection: true, favorites: true };
        // keep client link + denormalised name in sync
        if (item.clientId) { const c = db.get('clients', item.clientId); if (c) item.clientName = c.name; }
      }
      if (coll === 'blogs' && !item.slug && item.title) item.slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // ---- §14 server-side CMS validation (never trust the admin UI) ----
      const CMS = ['portfolio', 'services', 'albums', 'team', 'reviews', 'blogs', 'packages', 'gallery'];
      if (CMS.includes(coll)) {
        if (item.order !== undefined) item.order = Math.max(0, Number(item.order) || 0);
        for (const k of ['published', 'featured', 'enabled', 'popular', 'visible']) {
          if (item[k] !== undefined) item[k] = !!item[k];
        }
        for (const k of ['features', 'images']) {
          if (item[k] !== undefined && !Array.isArray(item[k])) {
            item[k] = String(item[k]).split(/[\n,]/).map(x => x.trim()).filter(Boolean);
          }
        }
        if (coll === 'reviews' && item.rating !== undefined) {
          item.rating = Math.min(5, Math.max(1, Number(item.rating) || 5));
        }
        if (coll === 'blogs' && item.status && !['published', 'draft'].includes(item.status)) item.status = 'draft';
        // a name is required for every content record
        const titleish = item.title || item.name;
        if (!mm[2].includes('delete') && titleish !== undefined && !String(titleish).trim()) {
          return json(res, 400, { ok: false, error: 'Title / name cannot be empty.' });
        }
      }
      db.saveItem(coll, item);
      return json(res, 200, { ok: true, item });
    }

    /* ---- §14 image upload (admin only) ----
       Accepts a raw image body with ?name=. Validated by magic bytes, not by
       the supplied filename or Content-Type, both of which a client controls. */
    if (p === '/api/admin/upload' && m === 'POST') {
      const MAX = 8 * 1024 * 1024;
      let buf;
      try { buf = await rawBody(req, MAX); }
      catch (e) { return json(res, 413, { ok: false, error: 'Image is larger than 8 MB.' }); }
      if (!buf || buf.length < 64) return json(res, 400, { ok: false, error: 'Empty upload.' });

      // sniff real type
      let ext = '';
      if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) ext = '.jpg';
      else if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) ext = '.png';
      else if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') ext = '.webp';
      if (!ext) return json(res, 415, { ok: false, error: 'Only JPG, PNG or WebP images are accepted.' });

      const raw = clean(u.searchParams.get('name') || 'upload', 80);
      const base = (raw.replace(/\.[^.]+$/, '') || 'upload')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'upload';
      const dir = path.join(PUB, 'images');
      let name = base + ext, i = 2;
      while (fs.existsSync(path.join(dir, name))) { name = base + '-' + i + ext; i++; }
      const dest = path.join(dir, name);
      if (!dest.startsWith(dir)) return json(res, 400, { ok: false, error: 'Bad filename.' });
      fs.writeFileSync(dest, buf);
      return json(res, 200, { ok: true, src: '/images/' + name, bytes: buf.length });
    }

    /* ---- §14 delete an uploaded image (admin only, refuses if still in use) ---- */
    if (p === '/api/admin/upload/delete' && m === 'POST') {
      const b = await body(req);
      const src = clean(b.src, 200);
      if (!/^\/images\/[A-Za-z0-9._-]+$/.test(src)) return json(res, 400, { ok: false, error: 'Bad path.' });
      const file = path.join(PUB, 'images', path.basename(src));
      if (!file.startsWith(path.join(PUB, 'images'))) return json(res, 400, { ok: false, error: 'Bad path.' });
      if (!fs.existsSync(file)) return json(res, 404, { ok: false, error: 'Already gone.' });

      // refuse while any CMS record still references it
      const used = [];
      for (const coll of ['portfolio', 'packages', 'blogs', 'reviews', 'team', 'services', 'albums', 'gallery']) {
        for (const r of db.list(coll)) {
          const hay = [r.image, r.cover, r.src, r.poster].concat(r.images || []);
          if (hay.includes(src)) used.push(coll + ':' + (r.title || r.name || r.id));
        }
      }
      if (used.length) return json(res, 409, { ok: false, error: 'Still used by ' + used.slice(0, 3).join(', ') + (used.length > 3 ? ' and more' : '') + '.' });
      fs.unlinkSync(file);
      return json(res, 200, { ok: true });
    }

    /* export selections as CSV */
    let ex = p.match(/^\/api\/admin\/export\/selections\/([A-Za-z0-9_-]+)$/);
    if (ex) {
      const ev = db.get('events', ex[1]); if (!ev) return json(res, 404, { ok: false });
      const all = [].concat(ev.media || [], ev.videos || []);
      const rows = [['id', 'filename', 'type', 'selected', 'favourite']];
      all.forEach(x => rows.push([x.id, (x.alt || '').replace(/,/g, ' '), x.type || 'image',
        (ev.selections || []).includes(x.id) ? 'yes' : 'no', (ev.favourites || []).includes(x.id) ? 'yes' : 'no']));
      const csv = rows.map(r => r.join(',')).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="selections-${ev.code}.csv"` });
      res.end(csv);
      return true;
    }

    if (p === '/api/admin/drive/sync' && m === 'POST') {
      const b = await body(req);
      const ev = db.get('events', b.eventId); if (!ev) return json(res, 404, { ok: false, error: 'Event not found.' });
      const folder = clean(b.folderId, 200) || (ev.drive && ev.drive.folderId) || ev.driveFolder;
      if (!drive.configured(settings)) return json(res, 503, { ok: false, error: 'Google Drive API key is not configured. Add GOOGLE_DRIVE_API_KEY to the environment or set it in Settings.' });
      if (!folder) return json(res, 400, { ok: false, error: 'Enter a Google Drive folder ID for this event.' });

      const started = Date.now();
      const r = await drive.listFolder(folder, settings);
      if (!r.ok && !r.files.length) {
        ev.drive = Object.assign({}, ev.drive, { folderId: folder, lastSync: new Date().toISOString(), lastError: r.error, status: 'error' });
        db.saveItem('events', ev);
        return json(res, 502, { ok: false, error: r.error });
      }
      const media = [], videos = [];
      for (const f of r.files) {
        const md = drive.toMedia(f, ev.id);
        (md.type === 'video' ? videos : media).push(md);
      }
      // preserve any locally-added media that isn't from Drive
      const localMedia = (ev.media || []).filter(x => !x.driveId);
      const localVideos = (ev.videos || []).filter(x => !x.driveId);
      ev.media = localMedia.concat(media);
      ev.videos = localVideos.concat(videos);
      ev.driveFolder = folder;
      ev.drive = {
        folderId: folder, lastSync: new Date().toISOString(), photos: media.length, videos: videos.length,
        total: media.length + videos.length, pages: r.pages, status: r.partial ? 'partial' : 'ok',
        lastError: r.error || null, durationMs: Date.now() - started
      };
      // drop selections that point at files no longer present
      const ids = new Set([].concat(ev.media, ev.videos).map(x => x.id));
      ev.selections = (ev.selections || []).filter(id => ids.has(id));
      ev.favourites = (ev.favourites || []).filter(id => ids.has(id));
      db.saveItem('events', ev);
      return json(res, 200, { ok: true, images: media.length, videos: videos.length, total: media.length + videos.length, pages: r.pages, partial: !!r.partial, error: r.error || null });
    }

    if (p === '/api/admin/drive/status') {
      const evs = db.list('events').map(e => ({ id: e.id, code: e.code, clientName: e.clientName, drive: e.drive || null }));
      return json(res, 200, { ok: true, configured: drive.configured(settings), events: evs });
    }

    return json(res, 404, { ok: false });
  }

  return json(res, 404, { ok: false });
}

/* ---------- pages ---------- */
function page(req, res, u) {
  const p = u.pathname;
  const q = u.searchParams;
  const route = (fn, ...args) => html(res, 200, fn(db, ...args));

  if (p === '/') return route(P1.home);
  if (p === '/about' || p === '/about-us') return route(P1.about);
  if (p === '/portfolio' || p === '/our-work') return route(P1.portfolio);
  if (p === '/gallery') return route(P1.gallery);
  if (p === '/services') return route(P2.services);
  if (p === '/packages') return route(P2.packages);
  if (p === '/albums') return route(P2.albums);
  // §2 portfolio project detail (CMS-driven)
  {
    const pm2 = p.match(/^\/portfolio\/([a-z0-9-]+)$/);
    if (pm2) { const out = P1.portfolioItem(db, pm2[1]); if (out) return html(res, 200, out); return html(res, 404, P3.notFound(db)); }
  }
  // §4 singular /blog/... redirects to the canonical /blogs/... URL
  {
    const bm = p.match(/^\/blog\/([a-z0-9-]+)$/);
    if (bm) { res.writeHead(301, { Location: '/blogs/' + bm[1] }); return res.end(); }
    if (p === '/blog') { res.writeHead(301, { Location: '/blogs' }); return res.end(); }
  }
  if (p === '/blogs') return route(P2.blogs);
  let m = p.match(/^\/blogs\/([a-z0-9-]+)$/);
  if (m) { const out = P2.blogPost(db, m[1]); if (out) return html(res, 200, out); }
  if (p === '/book' || p === '/book-appointment') return route(P2.book, q);
  if (p === '/contact' || p === '/contact-us') return route(P2.contact);
  if (p === '/client/') { res.writeHead(301, { Location: '/client' }); return res.end(); }
  if (p === '/client') return route(P3.clientEntry);
  m = p.match(/^\/client\/([A-Za-z0-9-]+)$/);
  if (m) return route(P3.clientEvent, m[1]);
  {
    const sm = p.match(/^\/s\/([A-Za-z0-9]+)$/);
    if (sm) {
      const shares = db.read('shares', {});
      const rec = shares[sm[1]];
      if (!rec || rec.revoked || rec.exp < Date.now()) return html(res, 404, P3.notFound(db));
      const ev = db.get('events', rec.eventId);
      if (!ev) return html(res, 404, P3.notFound(db));
      // Re-check live permission on EVERY view: turning sharing off in admin
      // must instantly kill links that were already handed out.
      if (!permsOf(ev).shareGallery) return html(res, 404, P3.notFound(db));
      if (!['paid', 'partial'].includes(ev.paymentStatus)) return html(res, 404, P3.notFound(db));
      rec.views = (rec.views || 0) + 1; rec.lastView = Date.now(); shares[sm[1]] = rec; db.write('shares', shares);
      return html(res, 200, P3.sharedGallery(db, ev, sm[1]));
    }
  }
  if (p === '/collage' || p === '/create-collage') return route(P3.collage);
  if (p === '/mk-admin') return route(P3.admin);

  if (p === '/robots.txt') return send(res, 200, 'User-agent: *\nAllow: /\nDisallow: /mk-admin\nDisallow: /client\nDisallow: /api/\nSitemap: ' + ui.SITE + '/sitemap.xml\n', { 'Content-Type': 'text/plain' });
  if (p === '/sitemap.xml') {
    const urls = ['/', '/about', '/portfolio', '/gallery', '/services', '/packages', '/albums', '/client', '/collage', '/book', '/contact', '/blogs']
      .concat(db.list('blogs').filter(b => b.status === 'published').map(b => '/blogs/' + b.slug));
    const lastmod = new Date().toISOString().slice(0, 10);
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(x => `<url><loc>${ui.SITE}${x}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`).join('') + '</urlset>';
    return send(res, 200, xml, { 'Content-Type': 'application/xml' });
  }
  if (p === '/favicon.svg') return send(res, 200, LOGO.favicon(), { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' });
  if (p === '/og-card.svg') return send(res, 200, LOGO.ogCard(db.read('settings').tagline), { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' });
  if (p === '/favicon.ico') { res.writeHead(302, { Location: '/favicon.svg' }); return res.end(); }
  if (p === '/logo.png') { res.writeHead(301, { Location: '/favicon.svg' }); return res.end(); }

  return html(res, 404, P3.notFound(db));
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  try {
    if (u.pathname.startsWith('/api/')) { const r = await api(req, res, u); if (r !== true && !res.writableEnded) return; return; }
    if (serveStatic(req, res, u.pathname)) return;
    page(req, res, u);
  } catch (e) {
    console.error('ERR', req.url, e);
    if (!res.writableEnded) json(res, 500, { ok: false, error: 'server error' });
  }
});

/* §8: refuse to boot in production while the admin credential is still the
   auto-generated bootstrap password. Development is unaffected. */
if (IS_PROD && auth.isBootstrap()) {
  console.error('\nREFUSING TO START IN PRODUCTION\n' +
    '  The admin password is still the auto-generated bootstrap credential.\n' +
    '  Set a real one before deploying, either:\n' +
    '    • export ADMIN_PASSWORD="<a long unique password>"   (recommended), or\n' +
    '    • log in and change it via Admin -> Settings -> Change password.\n');
  process.exit(1);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('MARKIPIE running on :' + PORT + (IS_PROD ? ' [production]' : ' [development]'));
  if (!auth.configured()) console.warn('  ! No admin credential. Run: node migrate.js');
  if (auth.isBootstrap()) console.warn('  ! Admin password is the generated bootstrap one — change it before production (data/.adminpass.txt)');
  if (!drive.configured(db.read('settings'))) console.warn('  ! Google Drive not configured (GOOGLE_DRIVE_API_KEY)');
  if (!otp.configured()) console.warn('  ! OTP provider not configured — phone step uses record matching only');
});
