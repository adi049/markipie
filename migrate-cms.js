'use strict';
/* Adds CMS fields (published / order / richer metadata) to existing collections.
 * Idempotent and non-destructive: existing values are never overwritten and
 * every record defaults to VISIBLE so nothing disappears from the public site.
 */
const db = require('./lib/db');

function setDefaults(coll, defaults, orderFrom) {
  const rows = db.list(coll);
  let changed = 0;
  rows.forEach((r, i) => {
    let touched = false;
    for (const [k, v] of Object.entries(defaults)) {
      if (r[k] === undefined) { r[k] = typeof v === 'function' ? v(r, i) : v; touched = true; }
    }
    if (r.order === undefined) { r.order = (i + 1) * 10; touched = true; }
    if (touched) { db.saveItem(coll, r); changed++; }
  });
  console.log(`  ${coll.padEnd(12)} ${rows.length} rows, ${changed} updated`);
}

function run() {
  console.log('CMS field migration:');

  // 1. PORTFOLIO — projects get full project metadata
  setDefaults('portfolio', {
    published: true, featured: false, category: (r) => r.category || r.title || 'Other',
    location: '', date: '', desc: (r) => r.desc || r.blurb || '', images: () => []
  });

  // 2. PACKAGES — already has order/popular/enabled; normalise only
  setDefaults('packages', { enabled: true, popular: false, featured: (r) => !!r.popular });

  // 3. BLOGS — status already exists
  setDefaults('blogs', { status: 'published', author: 'Markipie', seoTitle: '', seoDesc: '' });

  // 4. REVIEWS
  setDefaults('reviews', { published: true, event: '', image: '' });

  // 5. TEAM
  setDefaults('team', { visible: true, bio: '', instagram: '', linkedin: '' });

  // 6. SERVICES
  setDefaults('services', {
    published: true, featured: false, features: () => [],
    desc: (r) => r.desc || r.benefit || ''
  });

  // 7. ALBUMS
  setDefaults('albums', { published: true, featured: false, features: () => [], images: () => [] });

  // 8. GALLERY (already has published)
  setDefaults('gallery', { published: true });

  // 9. SETTINGS — business info only. No secrets.
  const s = db.read('settings', {});
  const defaults = {
    brand: 'MARKIPIE',
    workingHours: 'Mon – Sat, 10:00 AM – 8:00 PM',
    footerText: 'Premium photography, cinematic films, heirloom albums and intelligent private delivery — crafted in Delhi, delivered everywhere.',
    footerTagline: 'Beautifully Captured. Intelligently Delivered.',
    bookingCta: 'Book Appointment',
    facebook: 'https://www.facebook.com/markipieofficial',
    youtube: 'https://www.youtube.com/@Markipie',
    twitter: ''
  };
  let n = 0;
  for (const [k, v] of Object.entries(defaults)) if (s[k] === undefined) { s[k] = v; n++; }
  // secrets must never live in the CMS
  delete s.adminPassword;
  db.write('settings', s);
  console.log(`  settings     ${n} new business fields`);
  console.log('done — every record defaults to visible.');
}

if (require.main === module) run();
module.exports = { run };
