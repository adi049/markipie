'use strict';
const SITE = 'https://markipie.com';
const LOGO = require('./logo');
const _db = require('./db');
const SET = () => _db.read('settings', {});

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

function head(meta) {
  const title = meta.title || 'Markipie | Wedding & Event Photography | Cinematic Films & Premium Albums';
  const desc = meta.desc || 'Markipie offers premium wedding and event photography, cinematic films, trendy reels, premium albums and AI-powered private photo delivery.';
  const path = meta.path || '/';
  const img = meta.image ? (meta.image.startsWith('http') ? meta.image : SITE + meta.image) : SITE + '/og-card.svg';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${meta.keywords ? `<meta name="keywords" content="${esc(meta.keywords)}">` : ''}
<link rel="canonical" href="${SITE}${path}">
${meta.noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
<meta property="og:site_name" content="MARKIPIE">
<meta property="og:type" content="${meta.ogType || 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${img}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="mask-icon" href="/favicon.svg" color="#141210">
<meta name="apple-mobile-web-app-title" content="MARKIPIE">
<meta name="theme-color" content="#FBFAF8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
${meta.headExtra || ''}
</head>`;
}

const NAV = [
  ['/about', 'About'],
  ['/portfolio', 'Portfolio'],
  ['/gallery', 'Gallery'],
  ['/client', 'Client Access'],
  ['/blogs', 'Blogs'],
  ['/contact', 'Contact']
];

function navHtml(active, dark) {
  const links = NAV.map(([href, label]) =>
    `<a class="nav-link${active === href ? ' on' : ''}" href="${href}">${label}</a>`).join('');
  const mlinks = [['/', 'Home'], ...NAV, ['/book', 'Book Appointment']].map(([href, label], i) =>
    `<a class="m-link" style="--i:${i}" href="${href}">${label}</a>`).join('');
  const mmore = [['/services', 'Services'], ['/packages', 'Packages'], ['/albums', 'Albums'], ['/collage', 'Create Collage']].map(([href, label]) =>
    `<a href="${href}">${label}</a>`).join('');
  return `<header class="nav${dark ? ' nav-dark' : ''}" id="nav">
  <div class="nav-in">
    <a class="brand" href="/" aria-label="MARKIPIE — home">${LOGO.full({ size: 30 })}</a>
    <nav class="nav-links" aria-label="Primary">${links}</nav>
    <a class="nav-cta" href="/book">${esc(SET().bookingCta || 'Book Appointment')}<span class="cta-arrow">→</span></a>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
  <div class="m-menu" id="mmenu"><nav class="m-nav" aria-label="Mobile">${mlinks}<div class="m-more">${mmore}</div></nav></div>
</header>`;
}

function floatHtml(s) {
  return `<div class="floats" aria-label="Quick contact">
  <a class="float-btn f-wa" href="https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent('Hi Markipie! I’d like to enquire about photography.')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.3c1.9 1 3.9 1.5 4.7 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.3 1.4 1.4-4.2-.3-.4c-1.2-1.8-1.9-3.9-1.9-5C5.1 9.4 10 4.6 16 4.6S26.9 9.4 26.9 15 21.9 24.8 16 24.8zm6-7.6c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/></svg>
    <span class="float-tip">WhatsApp</span></a>
  <a class="float-btn f-call" href="tel:${esc(s.phoneRaw)}" aria-label="Call Markipie">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>
    <span class="float-tip">Call</span></a>
  <a class="float-btn f-ig" href="${esc(s.instagram)}" target="_blank" rel="noopener" aria-label="Markipie on Instagram">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c2.7 0 3 0 4.1.1 1 0 1.6.2 2 .4.5.2.8.4 1.2.8.4.4.6.7.8 1.2.2.4.3 1 .4 2 .1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.6-.4 2-.2.5-.4.8-.8 1.2-.4.4-.7.6-1.2.8-.4.2-1 .3-2 .4-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.6-.2-2-.4-.5-.2-.8-.4-1.2-.8-.4-.4-.6-.7-.8-1.2-.2-.4-.3-1-.4-2-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c0-1 .2-1.6.4-2 .2-.5.4-.8.8-1.2.4-.4.7-.6 1.2-.8.4-.2 1-.3 2-.4 1.1-.1 1.4-.1 4.1-.1zM12 0C9.3 0 8.9 0 7.8.1 6.7.1 6 .3 5.3.6c-.7.3-1.3.6-1.9 1.2C2.8 2.4 2.5 3 2.2 3.7c-.3.7-.5 1.4-.5 2.5C1.6 7.3 1.6 7.7 1.6 10.4s0 3.1.1 4.2c0 1.1.2 1.8.5 2.5.3.7.6 1.3 1.2 1.9.6.6 1.2.9 1.9 1.2.7.3 1.4.5 2.5.5 1.1.1 1.5.1 4.2.1s3.1 0 4.2-.1c1.1 0 1.8-.2 2.5-.5.7-.3 1.3-.6 1.9-1.2.6-.6.9-1.2 1.2-1.9.3-.7.5-1.4.5-2.5.1-1.1.1-1.5.1-4.2s0-3.1-.1-4.2c0-1.1-.2-1.8-.5-2.5-.3-.7-.6-1.3-1.2-1.9-.6-.6-1.2-.9-1.9-1.2-.7-.3-1.4-.5-2.5-.5C15.1 0 14.7 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.8-10.4a1.4 1.4 0 1 1-2.9 0 1.4 1.4 0 0 1 2.9 0z"/></svg>
    <span class="float-tip">Instagram</span></a>
</div>`;
}

function footerHtml(s) {
  return `<footer class="footer">
  <div class="foot-in">
    <div class="foot-brand">
      <span class="foot-logo">${LOGO.full({ size: 32 })}</span>
      <p>${esc(s.footerText || s.tagline)}</p>
      <p class="foot-addr">${esc(s.address)}</p>
    </div>
    <div class="foot-col"><h4>Explore</h4>
      <a href="/about">About Us</a><a href="/portfolio">Portfolio</a><a href="/gallery">Gallery</a><a href="/albums">Premium Albums</a><a href="/packages">Packages</a><a href="/services">Services</a>
    </div>
    <div class="foot-col"><h4>Clients</h4>
      <a href="/client">Client Access</a><a href="/book">Book Appointment</a><a href="/collage">Create Your Collage</a><a href="/blogs">Blogs</a><a href="/contact">Contact Us</a>
    </div>
    <div class="foot-col"><h4>Talk To Us</h4>
      <a href="tel:${esc(s.phoneRaw)}">${esc(s.phone)}</a>
      <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>
      <a href="${esc(s.instagram)}" target="_blank" rel="noopener">${esc(s.instagramHandle)}</a>
      <a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp us</a>
      ${s.workingHours ? `<span class="foot-hours">${esc(s.workingHours)}</span>` : ''}
    </div>
  </div>
  <div class="foot-base">
    <span>© ${new Date().getFullYear()} ${esc(s.brand || 'MARKIPIE')}. All rights reserved.</span>
    <span class="foot-tag">${esc(s.footerTagline || s.tagline)}</span>
    <a class="admin-lock" href="/mk-admin" title="Admin" aria-label="Admin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
    </a>
  </div>
</footer>`;
}

function introHtml(s) {
  if (!s.introEnabled) return '';
  return `<div class="intro" id="intro" aria-hidden="true">
  <div class="intro-inner">
    <div class="intro-name"><span class="in-l">MARK</span><span class="in-r">IPIE</span></div>
    <div class="intro-line"><i></i></div>
    <span class="intro-logo">${LOGO.mark({ size: 54, title: false })}</span>
    <div class="intro-tag">Beautifully Captured. Intelligently Delivered.</div>
  </div>
</div>`;
}

function jsonld(obj) { return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`; }

function shell({ meta, active, body, settings, scripts, noIntro, navDark }) {
  return head(meta) + `<body class="page">
${noIntro ? '' : introHtml(settings)}
<div class="progress" id="progress"></div>
${navHtml(active, navDark)}
<main id="top">${body}</main>
${footerHtml(settings)}
${floatHtml(settings)}
<script src="/js/main.js"></script>
${scripts || ''}
</body></html>`;
}

module.exports = { esc, fmtINR, head, navHtml, footerHtml, floatHtml, introHtml, shell, jsonld, SITE, LOGO };
