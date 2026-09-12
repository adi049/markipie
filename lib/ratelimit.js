'use strict';
/* In-memory fixed-window rate limiter. Process-local by design (single-node
   deployment). Swap for Redis if the app is ever horizontally scaled. */

const buckets = new Map();

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/**
 * @returns {{ok:boolean, remaining:number, retryAfter:number}}
 */
function hit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  const ok = b.count <= limit;
  return { ok, remaining: Math.max(0, limit - b.count), retryAfter: Math.ceil((b.reset - now) / 1000) };
}

function reset(key) { buckets.delete(key); }

// periodic cleanup so the map cannot grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
}, 60000).unref();

module.exports = { hit, reset, clientIp };
