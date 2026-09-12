'use strict';
/* OTP service abstraction.
 *
 * PRODUCTION SAFETY: if no SMS provider is configured this module refuses to
 * verify anything in production. It NEVER auto-approves a code.
 *
 * To connect a provider set:
 *   OTP_PROVIDER=msg91|twilio
 *   plus the provider credentials (see README).
 */
const crypto = require('crypto');

const PROVIDER = (process.env.OTP_PROVIDER || '').toLowerCase();
const IS_PROD = process.env.NODE_ENV === 'production';
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map(); // key -> {hash, exp, attempts, phoneMasked}

function configured() { return PROVIDER === 'msg91' || PROVIDER === 'twilio'; }
/** OTP step is only enforced when a provider exists. */
function enabled() { return configured(); }

function hash(code, salt) {
  return crypto.createHmac('sha256', salt).update(String(code)).digest('hex');
}

async function sendSms(phoneE164, text) {
  if (PROVIDER === 'msg91') {
    const key = process.env.MSG91_AUTHKEY, tid = process.env.MSG91_TEMPLATE_ID;
    if (!key || !tid) throw new Error('MSG91 credentials missing');
    const r = await fetch('https://control.msg91.com/api/v5/otp?' + new URLSearchParams({
      template_id: tid, mobile: phoneE164.replace(/\D/g, ''), otp: text
    }), { method: 'POST', headers: { authkey: key } });
    if (!r.ok) throw new Error('MSG91 error ' + r.status);
    return true;
  }
  if (PROVIDER === 'twilio') {
    const sid = process.env.TWILIO_SID, tok = process.env.TWILIO_TOKEN, from = process.env.TWILIO_FROM;
    if (!sid || !tok || !from) throw new Error('Twilio credentials missing');
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(sid + ':' + tok).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: phoneE164, From: from, Body: `Markipie verification code: ${text}` })
    });
    if (!r.ok) throw new Error('Twilio error ' + r.status);
    return true;
  }
  throw new Error('No OTP provider configured');
}

/** @returns {Promise<{ok:boolean, error?:string, devCode?:string}>} */
async function issue(key, phoneE164) {
  if (!configured()) {
    return { ok: false, error: 'OTP provider is not configured on this server.' };
  }
  const code = String(crypto.randomInt(100000, 999999));
  const salt = crypto.randomBytes(8).toString('hex');
  store.set(key, { hash: hash(code, salt), salt, exp: Date.now() + TTL_MS, attempts: 0 });
  await sendSms(phoneE164, code);
  return { ok: true };
}

/** @returns {{ok:boolean, error?:string}} */
function verify(key, code) {
  if (!configured()) return { ok: false, error: 'OTP provider is not configured on this server.' };
  const rec = store.get(key);
  if (!rec) return { ok: false, error: 'No verification code was requested. Please start again.' };
  if (rec.exp < Date.now()) { store.delete(key); return { ok: false, error: 'Code expired. Request a new one.' }; }
  rec.attempts++;
  if (rec.attempts > MAX_ATTEMPTS) { store.delete(key); return { ok: false, error: 'Too many incorrect attempts.' }; }
  const given = hash(String(code || '').trim(), rec.salt);
  const ok = given.length === rec.hash.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(rec.hash));
  if (!ok) return { ok: false, error: 'Incorrect code. Please try again.' };
  store.delete(key);
  return { ok: true };
}

module.exports = { configured, enabled, issue, verify, PROVIDER, IS_PROD };
