'use strict';
/* Moves private client/event media out of the publicly served directory.
 *
 * Public site assets (portfolio, blogs, services, packages, homepage) stay in
 * public/. Only media attached to a client EVENT is copied into PRIVATE_DIR and
 * re-pointed at the authenticated endpoint /api/client/media/:mediaId.
 *
 * Idempotent: safe to run repeatedly. Existing Drive-backed media is untouched.
 */
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const PRIV = path.join(ROOT, 'private-media');

function ensure(d) { fs.mkdirSync(d, { recursive: true }); }

function run() {
  ensure(PRIV);
  const events = db.list('events');
  let moved = 0, already = 0, missing = 0, driveSkipped = 0;

  for (const ev of events) {
    const dir = path.join(PRIV, 'events', ev.id);
    let touched = false;

    for (const m of [].concat(ev.media || [], ev.videos || [])) {
      if (m.driveId) { driveSkipped++; continue; }          // served by the Drive proxy
      if (m.privateFile) { already++; continue; }           // already migrated

      const rel = String(m.src || '').split('?')[0].replace(/^\/+/, '');
      if (!rel) { missing++; continue; }
      const from = path.join(PUB, rel);
      if (!fs.existsSync(from)) { missing++; continue; }

      ensure(dir);
      // Keep a per-event copy so two events never share a file on disk.
      const base = path.basename(rel);
      const dest = path.join(dir, m.id + path.extname(base));
      fs.copyFileSync(from, dest);

      m.privateFile = path.relative(PRIV, dest).split(path.sep).join('/');
      m.src = '/api/client/media/' + m.id;
      m.thumb = '/api/client/media/' + m.id + '?thumb=1';
      delete m.publicSrc;
      moved++; touched = true;
    }
    if (touched) db.saveItem('events', ev);
  }

  console.log('private media migration:');
  console.log('  copied to private-media : ' + moved);
  console.log('  already private         : ' + already);
  console.log('  drive-backed (skipped)  : ' + driveSkipped);
  console.log('  source file missing     : ' + missing);
  console.log('  store                   : ' + PRIV);
}

if (require.main === module) run();
module.exports = { run, PRIV };
