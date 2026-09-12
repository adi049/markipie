'use strict';
/* Indian-first phone normalisation + constant-time comparison helpers. */

/** Normalise to bare national significant number (10 digits for IN). */
function normalize(input) {
  let d = String(input == null ? '' : input).replace(/\D/g, '');
  if (!d) return '';
  // strip international prefixes
  if (d.length > 10 && d.startsWith('00')) d = d.slice(2);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  return d;
}

/** True when the number is a plausible Indian mobile (10 digits, starts 6-9). */
function isValidIndianMobile(input) {
  const n = normalize(input);
  return /^[6-9]\d{9}$/.test(n);
}

/** Loose validity: accept 10-digit IN mobiles or any 8-15 digit international. */
function isPlausible(input) {
  const n = normalize(input);
  if (isValidIndianMobile(n)) return true;
  return n.length >= 8 && n.length <= 15;
}

/**
 * Compare two phone numbers by their normalised national number.
 * Falls back to last-10-digit comparison so stored "+91 98765 43210" and
 * user-typed "09876543210" match.
 */
function same(a, b) {
  const x = normalize(a), y = normalize(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10);
}

/** Mask for display/logs: 98765 43210 -> 98xxxxxx10 (never expose full). */
function mask(input) {
  const n = normalize(input);
  if (n.length < 4) return '••••';
  return n.slice(0, 2) + 'x'.repeat(Math.max(0, n.length - 4)) + n.slice(-2);
}

/** Stored numbers may be seeded already-masked ("+91 98xxxxxx21"). */
function isMasked(input) {
  return /x{2,}/i.test(String(input == null ? '' : input));
}

module.exports = { normalize, isValidIndianMobile, isPlausible, same, mask, isMasked };
