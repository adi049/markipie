'use strict';
/* Builds a clean deployment package in dist/.
 * Excludes secrets, backups and developer-only files. The developer's working
 * tree is left untouched — nothing is deleted here.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');

// Never ship these, at any depth.
const DENY_NAMES = new Set([
  '.env', '.adminpass', '.adminpass.txt', 'node_modules', 'dist',
  '.git', '.npm', '.cache', '.local', 'package-lock.json'
]);
const DENY_PREFIX = ['.backup-'];
const DENY_EXT = new Set([]);

// Top-level entries that make up the deployable app.
const INCLUDE = [
  'server.js', 'migrate.js', 'seed.js', 'migrate-private-media.js',
  'package.json', 'README.md', '.env.example', '.gitignore',
  'lib', 'public', 'data', 'private-media'
];

function denied(name) {
  if (DENY_NAMES.has(name)) return true;
  if (DENY_PREFIX.some(p => name.startsWith(p))) return true;
  if (DENY_EXT.has(path.extname(name))) return true;
  return false;
}

let copied = 0, skipped = [];
function copy(src, dest) {
  const name = path.basename(src);
  if (denied(name)) { skipped.push(path.relative(ROOT, src)); return; }
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src)) copy(path.join(src, e), path.join(dest, e));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }
}

function run() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const entry of INCLUDE) {
    const src = path.join(ROOT, entry);
    if (!fs.existsSync(src)) continue;
    copy(src, path.join(OUT, entry));
  }
  // runtime state should not ship with a previous deployment's sessions
  for (const f of ['sessions.json', 'clientSessions.json', 'pending.json', 'shares.json']) {
    const p = path.join(OUT, 'data', f);
    if (fs.existsSync(p)) { fs.writeFileSync(p, f === 'shares.json' ? '{}' : '{}'); }
  }
  console.log('dist/ built — ' + copied + ' files');
  console.log('excluded:');
  [...new Set(skipped)].forEach(s => console.log('  - ' + s));
}

if (require.main === module) run();
module.exports = { run };
