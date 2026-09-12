'use strict';
const ui = require('./ui');
const { esc } = ui;

/* ============ SERVICES ============ */
function services(db) {
  const s = db.read('settings');
  const list = db.list('services').filter(x => x.published !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const rows = list.map((v, i) => `
  <article class="sv-row ${i % 2 ? 'rev' : ''}" data-rv="up">
    <div class="sv-img"><img loading="lazy" src="${v.image}" alt="${esc(v.title)} by Markipie"></div>
    <div class="sv-copy"><span class="pf-num sm">${String(i + 1).padStart(2, '0')}</span><h2>${esc(v.title)}${v.featured ? ' <em class="cms-star">Featured</em>' : ''}</h2><p>${esc(v.desc || v.benefit)}</p>${(v.features || []).length ? `<ul class="sv-feat">${(v.features || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
  </article>`).join('');
  return ui.shell({
    settings: s, active: '/services',
    meta: { path: '/services', title: 'Services | MARKIPIE — Photography, Films, Albums & AI Delivery', desc: 'Wedding, candid, traditional and pre-wedding photography, cinematic films, teasers, trendy reels, premium albums, AI photo delivery and album selection.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Services</p>
<h1 class="h1" data-rv="mask"><span>Every service, one promise —</span></h1><p class="h1 it" data-rv="mask" data-d="140"><span>you feel it again.</span></p></div></section>
<section class="sec sv-sec"><div class="wrap sv-wrap">${rows}</div></section>
<section class="sec cta-band"><div class="wrap cta-in"><h2 data-rv="mask"><span>Bundle them your way.</span></h2><p data-rv="up">Every service can be combined and customized into your package.</p><div class="cta-btns" data-rv="up"><a class="btn btn-light" href="/packages">See Packages</a><a class="btn btn-ghost" href="/book">Book Appointment</a></div></div></section>`
  });
}

/* ============ PACKAGES ============ */
function packages(db) {
  const s = db.read('settings');
  const pkgs = db.list('packages').filter(p => p.enabled !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const _max = Math.max(...pkgs.map(p => p.price || 0)); pkgs.forEach(p => p.flagship = p.price === _max);
  return ui.shell({
    settings: s, active: '/packages',
    meta: { path: '/packages', title: 'Packages & Pricing | MARKIPIE', desc: 'Transparent premium photography packages from ₹25,000 to ₹1,25,000 — cinematic films, premium albums and AI-powered private delivery. Fully customizable.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Packages</p>
<h1 class="h1" data-rv="mask"><span>Premium, transparent,</span></h1><p class="h1 it" data-rv="mask" data-d="140"><span>made around you.</span></p></div></section>
<section class="sec"><div class="wrap">
  <div class="tier-grid">
    ${pkgs.map((p, i) => `
    <article class="tier${p.popular ? ' tier-pop' : ''}${p.flagship ? ' tier-flag' : ''}" data-rv="up" data-d="${i * 90}">
      ${p.popular ? '<span class="tier-badge">Most Popular</span>' : ''}
      ${p.flagship ? '<span class="tier-badge flag">Flagship</span>' : ''}
      <p class="tier-name">${esc(p.title)}</p>
      <div class="tier-price"><strong>${ui.fmtINR(p.price)}</strong><span>onwards</span></div>
      <p class="tier-desc">${esc(p.desc)}</p>
      <ul class="tier-feat">${(p.features || []).map(f => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12.5l5 5L20 6.5"/></svg><span>${esc(f)}</span></li>`).join('')}</ul>
      <a class="btn ${p.flagship || p.popular ? 'btn-dark' : 'btn-line'} tier-cta" href="/book?pkg=${encodeURIComponent(p.title || '')}">Choose ${esc(p.title || 'Package')}</a>
    </article>`).join('')}
  </div>
  <div class="tier-compare" data-rv="up">
    <table>
      <thead><tr><th>What's included</th>${pkgs.map(p => `<th>${esc(p.title)}<em>${ui.fmtINR(p.price)}</em></th>`).join('')}</tr></thead>
      <tbody>${(() => {
        const all = []; pkgs.forEach(p => (p.features || []).forEach(f => { if (!all.includes(f)) all.push(f); }));
        return all.map(f => `<tr><td>${esc(f)}</td>${pkgs.map(p => `<td>${(p.features || []).includes(f) ? '<i class="yes">✓</i>' : '<i class="no">–</i>'}</td>`).join('')}</tr>`).join('');
      })()}</tbody>
    </table>
  </div>
  <div class="custom-band" data-rv="up">
    <div><h2>Need Something Custom?</h2><p>Create a package around your vision — mix photography, films, reels and albums your way.</p></div>
    <a class="btn btn-light" href="/book?pkg=Custom%20Quote">Request Custom Quote</a>
  </div>
</div></section>`
  });
}

/* ============ ALBUMS ============ */
function albums(db) {
  const s = db.read('settings');
  const list = db.list('albums').filter(x => x.published !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  return ui.shell({
    settings: s, active: '/albums',
    meta: { path: '/albums', title: 'Premium Albums Showcase | MARKIPIE', desc: 'Heirloom wedding albums — leather, acrylic, lay-flat silk, gold foil personalisation, parent copies and cinematic QR albums. Designed around your story.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Album Showcase</p>
<h1 class="h1" data-rv="mask"><span>Objects your grandchildren</span></h1><p class="h1 it" data-rv="mask" data-d="140"><span>will argue over.</span></p></div></section>
<section class="sec"><div class="wrap alb-show">
  ${list.map((a, i) => `
  <article class="show-row ${i % 2 ? 'rev' : ''}" data-rv="up">
    <div class="show-img"><img loading="lazy" src="${a.image}" alt="${esc(a.title)} album by Markipie"></div>
    <div class="show-copy"><h2>${esc(a.title)}${a.featured ? ' <em class="cms-star">Featured</em>' : ''}</h2><span class="show-fin">${esc(a.finish)}</span><p>${esc(a.desc)}</p>${(a.features || []).length ? `<ul class="sv-feat">${(a.features || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
  </article>`).join('')}
</div></section>
<section class="sec soft"><div class="wrap">
  <div class="finish-strip" data-rv="up">
    <div><h3>Finishes</h3><p>Leather · Acrylic · Silk · Linen · Gold/Silver Foil · Deboss</p></div>
    <div><h3>Packaging</h3><p>Handcrafted slipcases, USB crystal boxes, magnetic proofing kits</p></div>
    <div><h3>Personalised</h3><p>Your names, your date, your motif — stamped in foil</p></div>
  </div>
</div></section>
<section class="sec cta-band"><div class="wrap cta-in"><h2 data-rv="mask"><span>Design yours after your event.</span></h2><p data-rv="up">Use the album selection tool inside your private gallery — we craft the rest.</p><div class="cta-btns" data-rv="up"><a class="btn btn-light" href="/client">Client Access</a></div></div></section>`
  });
}

/* ============ BLOGS ============ */
function blogs(db) {
  const s = db.read('settings');
  const posts = db.list('blogs').filter(b => b.status === 'published').sort((a, b) => (a.order || 99) - (b.order || 99) || String(b.date || '').localeCompare(String(a.date || '')));
  return ui.shell({
    settings: s, active: '/blogs',
    meta: { path: '/blogs', title: 'Blogs | MARKIPIE — Photography Guides & Stories', desc: 'Guides on choosing photographers, cinematic wedding films, AI face-recognition delivery and premium wedding albums — by Markipie.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Blogs</p>
<h1 class="h1" data-rv="mask"><span>Notes on memory-making.</span></h1></div></section>
<section class="sec"><div class="wrap blog-grid">
  ${posts.map((b, i) => `
  <a class="blog-card${i === 0 ? ' lead-card' : ''}" href="/blogs/${b.slug}" data-rv="up" data-d="${(i % 3) * 90}">
    <div class="blog-cov"><img loading="lazy" src="${b.cover}" alt="${esc(b.title)}"></div>
    <div class="blog-body"><span class="blog-cat">${esc(b.category)}</span><h2>${esc(b.title)}</h2>
    <p>${esc((b.seoDesc || '').slice(0, 110))}…</p>
    <span class="blog-meta">${esc(b.author)} · ${new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
  </a>`).join('')}
</div></section>`
  });
}

function blogPost(db, slug) {
  const s = db.read('settings');
  const b = db.list('blogs').find(x => x.slug === slug && x.status === 'published');
  if (!b) return null;
  const others = db.list('blogs').filter(x => x.status === 'published' && x.id !== b.id).slice(0, 2);
  return ui.shell({
    settings: s, active: '/blogs',
    meta: { path: '/blogs/' + b.slug, title: b.seoTitle || b.title, desc: b.seoDesc, ogType: 'article', image: b.cover },
    body: `
<article class="post"><div class="wrap post-wrap">
  <a class="back" href="/blogs">← All blogs</a>
  <span class="blog-cat">${esc(b.category)}</span>
  <h1>${esc(b.title)}</h1>
  <div class="blog-meta">${esc(b.author)} · ${new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  <div class="post-cov" data-rv="zoom"><img src="${b.cover}" alt="${esc(b.title)}"></div>
  <div class="post-body" data-rv="up">${b.content}</div>
  <div class="post-cta" data-rv="up"><h3>Planning an event?</h3><a class="btn btn-dark" href="/book">Check Your Date</a></div>
</div></article>
<section class="sec"><div class="wrap"><h2 class="h2" data-rv="mask"><span>Keep reading</span></h2>
<div class="blog-grid small">${others.map(o => `<a class="blog-card" href="/blogs/${o.slug}" data-rv="up"><div class="blog-cov"><img loading="lazy" src="${o.cover}" alt="${esc(o.title)}"></div><div class="blog-body"><span class="blog-cat">${esc(o.category)}</span><h2>${esc(o.title)}</h2></div></a>`).join('')}</div></div></section>`
  });
}

/* ============ BOOK ============ */
function book(db, query) {
  const s = db.read('settings');
  const pkg = query.get('pkg') || '';
  return ui.shell({
    settings: s, active: '/book',
    meta: { path: '/book', title: 'Book Appointment | MARKIPIE — Check Your Date', desc: 'Book Markipie for your wedding or event. Check your date, tell us your vision, and get a custom package — photography, cinematic films and premium albums.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Book Appointment</p>
<h1 class="h1" data-rv="mask"><span>Your date is the headline.</span></h1><p class="h1 it" data-rv="mask" data-d="140"><span>Let’s check it first.</span></p></div></section>
<section class="sec form-sec"><div class="wrap form-wrap">
  <form id="bookform" class="pform" novalidate>
    <div class="frow"><label>Name<input name="name" required placeholder="Your name"></label>
    <label>Phone<input name="phone" required inputmode="tel" placeholder="+91 …"></label></div>
    <div class="frow"><label>Email<input name="email" type="email" placeholder="you@example.com"></label>
    <label>Event Date<input name="eventDate" type="date" required></label></div>
    <div class="frow"><label>Event Type<select name="eventType"><option>Wedding</option><option>Pre-Wedding</option><option>Engagement</option><option>Birthday</option><option>Anniversary</option><option>Baby Event</option><option>Party</option><option>Corporate Event</option><option>Fashion</option><option>Traditional Event</option><option>Other</option></select></label>
    <label>Location<input name="location" placeholder="City / venue"></label></div>
    <div class="frow"><label>Budget<select name="budget"><option>Under ₹25,000</option><option>₹25,000 – ₹45,000</option><option>₹45,000 – ₹60,000</option><option>₹60,000 – ₹1,25,000</option><option>₹1,25,000+</option><option>Custom / not sure</option></select></label>
    <label>Interested Package<select name="requirements"><option value="">—</option>${db.list('packages').filter(p => p.enabled !== false).sort((a, b) => (a.order || 99) - (b.order || 99)).map(p => `<option${p.title === pkg ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}<option${pkg === 'Custom' ? ' selected' : ''}>Custom Package</option></select></label></div>
    <label class="full">Message<textarea name="message" rows="4" placeholder="Tell us about your event, your people, your dream frames…"></textarea></label>
    <button class="btn btn-dark big" type="submit">Check My Date</button>
    <p class="form-note" id="booknote" role="status"></p>
  </form>
  <aside class="form-side" data-rv="right">
    <h3>What happens next</h3>
    <ol><li>We confirm your date within hours.</li><li>A short call to understand your vision.</li><li>A package made around you — never a template.</li></ol>
    <div class="side-contact"><a href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">WhatsApp ${esc(s.phone)}</a><a href="tel:${s.phoneRaw}">Call us anytime</a></div>
  </aside>
</div></section>`,
    scripts: '<script src="/js/forms.js"></script>'
  });
}

/* ============ CONTACT ============ */
function contact(db) {
  const s = db.read('settings');
  return ui.shell({
    settings: s, active: '/contact',
    meta: { path: '/contact', title: 'Contact Us | MARKIPIE', desc: 'Reach Markipie — call, WhatsApp, Instagram or visit our Tagore Garden, Delhi studio. We reply fast, because your date won’t wait.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Contact Us</p>
<h1 class="h1" data-rv="mask"><span>Say hello. We reply fast.</span></h1></div></section>
<section class="sec"><div class="wrap contact-grid">
  <div class="contact-cards">
    <a class="c-card" href="tel:${s.phoneRaw}" data-rv="up"><span>Call</span><strong>${esc(s.phone)}</strong><em>Open until 10:30 pm</em></a>
    <a class="c-card" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener" data-rv="up" data-d="90"><span>WhatsApp</span><strong>${esc(s.phone)}</strong><em>Fastest for date checks</em></a>
    <a class="c-card" href="${esc(s.instagram)}" target="_blank" rel="noopener" data-rv="up" data-d="180"><span>Instagram</span><strong>${esc(s.instagramHandle)}</strong><em>DMs open</em></a>
    <a class="c-card" href="mailto:${esc(s.email)}" data-rv="up" data-d="270"><span>Email</span><strong>${esc(s.email)}</strong><em>For detailed enquiries</em></a>
    <div class="c-card" data-rv="up" data-d="360"><span>Studio</span><strong>Tagore Garden, Delhi</strong><em>${esc(s.address)}</em></div>
  </div>
  <form id="contactform" class="pform" novalidate data-rv="right">
    <div class="frow"><label>Name<input name="name" required placeholder="Your name"></label>
    <label>Phone<input name="phone" inputmode="tel" placeholder="+91 …"></label></div>
    <label class="full">Email<input name="email" type="email" placeholder="you@example.com"></label>
    <label class="full">Subject<input name="subject" placeholder="Wedding enquiry, album, collab…"></label>
    <label class="full">Message<textarea name="message" rows="5" required placeholder="How can we help?"></textarea></label>
    <button class="btn btn-dark big" type="submit">Send Message</button>
    <p class="form-note" id="contactnote" role="status"></p>
  </form>
</div></section>`,
    scripts: '<script src="/js/forms.js"></script>'
  });
}

module.exports = { services, packages, albums, blogs, blogPost, book, contact };
