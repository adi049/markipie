'use strict';
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');

const cache = {};

function fileFor(coll) { return path.join(DATA, coll + '.json'); }

function read(coll, fallback) {
  const f = fileFor(coll);
  try {
    const st = fs.statSync(f);
    if (cache[coll] && cache[coll].mtime === st.mtimeMs) return cache[coll].data;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    cache[coll] = { mtime: st.mtimeMs, data };
    return data;
  } catch (e) {
    return fallback !== undefined ? fallback : (Array.isArray(fallback) ? [] : {});
  }
}

function write(coll, data) {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  const f = fileFor(coll);
  fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 1));
  fs.renameSync(f + '.tmp', f);
  const st = fs.statSync(f);
  cache[coll] = { mtime: st.mtimeMs, data };
  return data;
}

function uid(prefix) {
  return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function list(coll) { return read(coll, []); }

function get(coll, id) { return list(coll).find(x => x.id === id); }

function saveItem(coll, item) {
  const items = list(coll);
  if (!item.id) item.id = uid(coll.slice(0, 2));
  const i = items.findIndex(x => x.id === item.id);
  if (i >= 0) items[i] = item; else items.push(item);
  write(coll, items);
  return item;
}

function remove(coll, id) {
  write(coll, list(coll).filter(x => x.id !== id));
}

module.exports = { read, write, list, get, saveItem, remove, uid, DATA };
