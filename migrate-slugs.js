'use strict';
/* Adds stable slugs to portfolio projects (and backfills any blog missing one).
 * Idempotent: existing slugs are never changed, so published URLs stay valid. */
const db = require('./lib/db');

const slugify = (s) => String(s || '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

function unique(base, taken) {
  let s = base || 'item', i = 2;
  while (taken.has(s)) { s = base + '-' + i; i++; }
  taken.add(s);
  return s;
}

function run() {
  for (const coll of ['portfolio', 'blogs']) {
    const rows = db.list(coll);
    const taken = new Set(rows.map(r => r.slug).filter(Boolean));
    let n = 0;
    for (const r of rows) {
      if (r.slug) continue;
      r.slug = unique(slugify(r.title || r.name), taken);
      db.saveItem(coll, r);
      n++;
    }
    console.log(`  ${coll}: ${n} slug(s) added, ${rows.length} total`);
  }
}

if (require.main === module) { console.log('slug migration:'); run(); }
module.exports = { run, slugify };
