'use strict';
/* Idempotent data migration.
 *  1. Link events -> clients via clientId (no data duplication, old fields kept).
 *  2. Expand per-event permissions object (back-compatible with old booleans).
 *  3. Re-price packages to the four approved tiers.
 *  4. Move admin password out of data/settings.json to env/hash.
 * Safe to run repeatedly. Creates data/.backup-<ts>/ before writing.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./lib/db');
const phone = require('./lib/phone');

const DATA = db.DATA;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(DATA, '.backup-' + stamp);

function backupAll() {
  fs.mkdirSync(backup, { recursive: true });
  for (const f of fs.readdirSync(DATA)) {
    if (f.endsWith('.json')) fs.copyFileSync(path.join(DATA, f), path.join(backup, f));
  }
  console.log('• backup written to', path.relative(process.cwd(), backup));
}

/* ---- 1 + 2: clients & events ---- */
function migrateClientsEvents() {
  const clients = db.list('clients');
  const events = db.list('events');
  let linked = 0, permsAdded = 0;

  for (const ev of events) {
    if (!ev.clientId) {
      let c = clients.find(c =>
        (ev.email && c.email && c.email.toLowerCase() === String(ev.email).toLowerCase()) ||
        (ev.phone && c.phone && phone.same(c.phone, ev.phone)) ||
        (ev.clientName && c.name && c.name.toLowerCase() === String(ev.clientName).toLowerCase())
      );
      if (!c) {
        c = { id: db.uid('cl'), name: ev.clientName || 'Client', phone: ev.phone || '', email: ev.email || '', notes: '' };
        clients.push(c);
      }
      ev.clientId = c.id;
      linked++;
    }
    // canonical permissions object; derive from legacy booleans on first run
    if (!ev.permissions) {
      ev.permissions = {
        downloadPhotos: ev.allowDownload !== false,
        downloadVideos: ev.allowDownload !== false,
        shareGallery: ev.allowShare !== false,
        faceScan: ev.faceRecognition !== false,
        selection: true,
        favorites: true
      };
      permsAdded++;
    }
    if (!Array.isArray(ev.media)) ev.media = [];
    if (!Array.isArray(ev.videos)) ev.videos = [];
    if (!Array.isArray(ev.selections)) ev.selections = [];
    if (!Array.isArray(ev.favourites)) ev.favourites = [];
    if (!ev.drive) ev.drive = { folderId: ev.driveFolder || '', lastSync: null, photos: 0, videos: 0, errors: [] };
  }
  db.write('clients', clients);
  db.write('events', events);
  console.log(`• events: ${linked} linked to clients, ${permsAdded} permission sets created`);
}

/* ---- 3: approved package pricing ---- */
const PACKAGES = [
  {
    id: 'pkg-essential', title: 'Essential', price: 25000, tag: 'Intimate', order: 1, enabled: true, popular: false,
    desc: 'For intimate shoots and simple celebrations.',
    image: '/images/bd1.jpg',
    features: ['1 Photographer (up to 6 hours)', '60+ edited photographs', 'Private online gallery', 'Album selection tool']
  },
  {
    id: 'pkg-signature', title: 'Signature', price: 45000, tag: 'Most Loved', order: 2, enabled: true, popular: false,
    desc: 'For couples wanting a richer gallery experience.',
    image: '/images/pw1.jpg',
    features: ['2 Photographers (full day)', '150+ edited photographs', 'Private gallery with AI face scan', '1 highlight reel', 'Album selection tool']
  },
  {
    id: 'pkg-premium', title: 'Premium', price: 60000, tag: 'Most Popular', order: 3, enabled: true, popular: true,
    desc: 'For complete wedding/event coverage and enhanced deliverables.',
    image: '/images/w1.jpg',
    features: ['2 Photographers + 1 Cinematographer', 'Full event coverage', 'Cinematic highlight film', '2 trendy reels', 'Premium 30-page album', 'AI face-recognition gallery']
  },
  {
    id: 'pkg-legacy', title: 'Legacy', price: 125000, tag: 'Flagship', order: 4, enabled: true, popular: false,
    desc: 'For luxury weddings, large events and complete premium coverage.',
    image: '/images/w3.jpg',
    features: ['2 Senior Photographers + 2 Cinematographers', 'All events, multi-day coverage', 'Full cinematic film + teaser', '4 trendy social reels', 'Heirloom 40-page album + 2 parent albums', 'AI face-recognition private gallery', 'Priority delivery']
  }
];

function migratePackages() {
  const existing = db.list('packages');
  const out = PACKAGES.map(p => {
    const prev = existing.find(e => e.id === p.id) || {};
    // keep admin-edited features/desc if they were customised after migration
    return Object.assign({}, prev, p, {
      features: (prev.featuresEdited && prev.features) ? prev.features : p.features,
      desc: prev.descEdited ? prev.desc : p.desc
    });
  });
  db.write('packages', out);
  console.log('• packages: 4 tiers set — ₹25,000 / ₹45,000 / ₹60,000 / ₹1,25,000');
}

/* ---- 4: admin password out of plaintext settings ---- */
function migrateSettings() {
  const s = db.read('settings', {});
  if (s.adminPassword) {
    delete s.adminPassword;
    console.log('• settings: removed plaintext adminPassword (now ADMIN_PASSWORD env / data/.adminpass)');
  }
  if (s.faceMinConfidence == null) s.faceMinConfidence = 0.4;
  if (s.faceMaxPhotos == null) s.faceMaxPhotos = 2000;
  if (s.faceThreshold == null) s.faceThreshold = 0.55;
  if (!s.driveApiKey) s.driveApiKey = '';
  db.write('settings', s);

  // one-time bootstrap credential so the owner is never locked out
  const pf = path.join(DATA, '.adminpass');
  if (!process.env.ADMIN_PASSWORD && !fs.existsSync(pf)) {
    const pw = crypto.randomBytes(9).toString('base64url');
    const salt = crypto.randomBytes(16).toString('hex');
    const h = crypto.scryptSync(pw, salt, 64).toString('hex');
    fs.writeFileSync(pf, JSON.stringify({ salt, hash: h }), { mode: 0o600 });
    fs.writeFileSync(path.join(DATA, '.adminpass.txt'), pw + '\n', { mode: 0o600 });
    console.log('\n  ┌───────────────────────────────────────────────┐');
    console.log('  │  ADMIN PASSWORD GENERATED                     │');
    console.log('  │  ' + pw.padEnd(45) + '│');
    console.log('  │  saved to data/.adminpass.txt — change it     │');
    console.log('  └───────────────────────────────────────────────┘\n');
  }
}

backupAll();
migrateClientsEvents();
migratePackages();
migrateSettings();
console.log('✓ migration complete');
