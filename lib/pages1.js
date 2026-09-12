'use strict';
const ui = require('./ui');
const { esc } = ui;

/* ============ HOME — cinematic editorial ============ */
function home(db) {
  const s = db.read('settings');
  const rm = db.read('reviewMeta', {});
  const reviews = db.list('reviews').filter(r => r.published !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const pkgs = db.list('packages').filter(p => p.enabled !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const gallery = db.list('gallery').filter(x => x.type === 'image' && x.published !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const ig = [gallery[2], gallery[7], gallery[14], gallery[4], gallery[18], gallery[23], gallery[28], gallery[0]].filter(Boolean);

  const why = [
    ['Years of Experienced Team', 'A seasoned crew that has lived a thousand ceremonies.'],
    ['AI Face Recognition', 'Find yourself across two thousand photographs — instantly.'],
    ['Album Selection Tool', 'You choose the frames; we craft the heirloom.'],
    ['Latest Trendy Videos', 'Vertical reels cut for the social age.'],
    ['Cinematic Teaser Videos', 'Sixty seconds that feel like cinema.'],
    ['Premium Album Designs', 'Editorial spreads, never templates.'],
    ['Premium Albums', 'Leather, acrylic, lay-flat — built to outlive trends.'],
    ['Fully Customizable', 'Made around you, down to the foil stamp.']
  ];

  const stories = [
    { href: '/gallery?cat=Weddings', img: '/images/w3.jpg', cat: 'Wedding · Delhi', title: 'Vows in Brick & Bloom', cls: 'st-a', alt: 'Wedding couple holding hands against a brick wall' },
    { href: '/gallery?cat=Pre-Wedding', img: '/images/pw1.jpg', cat: 'Pre-Wedding · The Hills', title: 'Before the Forever', cls: 'st-b', alt: 'Pre-wedding couple by the water' },
    { href: '/gallery?cat=Engagements', img: '/images/en1.jpg', cat: 'Engagement', title: 'The Question, Answered', cls: 'st-c', alt: 'Engagement proposal moment' },
    { href: '/gallery?cat=Traditional', img: '/images/hd1.jpg', cat: 'Traditional · Haldi', title: 'Marigold Mornings', cls: 'st-d', alt: 'Haldi ceremony colours' },
    { href: '/gallery?cat=Films', img: '/images/pt2.jpg', cat: 'Cinematic · Film', title: 'The First Dance', cls: 'st-e', video: '/videos/reel-dance.mp4', alt: 'Cinematic wedding film still' }
  ];

  const flow = [
    ['Event', 'Your day, covered end to end'],
    ['Face Scan', 'Live camera, on your device'],
    ['Your Photos', 'Every frame of you, matched by AI'],
    ['Select', 'Shortlist for your album'],
    ['Download', 'Approved memories, privately']
  ];

  return ui.shell({
    settings: s, active: '/', navDark: true,
    meta: {
      path: '/',
      title: 'Markipie | Wedding & Event Photography | Cinematic Films & Premium Albums',
      desc: 'Markipie offers premium wedding and event photography, cinematic films, trendy reels, premium albums and AI-powered private photo delivery.',
      keywords: 'Markipie, Markipie photography, wedding photographer, wedding photography, candid wedding photographer, cinematic wedding photography, wedding videography, pre wedding photography, event photographer, birthday photography, premium wedding albums, wedding reels, cinematic wedding films, AI photo delivery, AI face recognition photography',
      headExtra: '<link rel="preload" as="image" href="/images/w3.jpg">' + ui.jsonld({
        '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'MARKIPIE',
        url: ui.SITE, logo: ui.SITE + '/favicon.svg', telephone: s.phoneRaw, email: s.email,
        address: { '@type': 'PostalAddress', streetAddress: 'D-106, Near Janta Book Depot, Shop No. 1, Tagore Garden', addressLocality: 'Delhi', postalCode: '110027', addressCountry: 'IN' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: rm.rating || 5, reviewCount: rm.count || 25 },
        sameAs: [s.instagram, 'https://www.facebook.com/markipieofficial']
      })
    },
    body: `
<section class="hero">
  <div class="hero-bg" data-px="0.16"><img src="/images/w3.jpg" alt="Wedding couple captured by Markipie" fetchpriority="high"></div>
  <div class="hero-scrim"></div>
  <div class="hero-in">
    <p class="kicker" data-rv="up">Markipie — Photography & Films</p>
    <h1 class="hero-h1">
      <span class="line" data-rv="mask"><span>Your Story. Our Vision.</span></span>
      <span class="line" data-rv="mask" data-d="140"><span><em>Beautifully Captured.</em></span></span>
    </h1>
    <p class="hero-sub" data-rv="up" data-d="280">Cinematic films, heirloom albums and intelligent private delivery — for the moments you will keep forever.</p>
    <div class="hero-cta" data-rv="up" data-d="400">
      <a class="btn btn-light" href="/portfolio">View Our Work</a>
      <a class="btn btn-ghost" href="/book">Book Appointment</a>
    </div>
  </div>
  <div class="hero-scroll" aria-hidden="true"><span></span><em>Scroll</em></div>
</section>

<section class="sec sig">
  <div class="wrap sig-wrap">
    <div class="sig-copy">
      <p class="kicker" data-rv="up">The Studio</p>
      <h2 class="h2 xl" data-rv="mask"><span>More Than</span></h2>
      <h2 class="h2 xl it" data-rv="mask" data-d="120"><span>Photography.</span></h2>
      <p class="lead" data-rv="up" data-d="160">We capture emotion as it happens. We shape it into cinematic films, design it into premium albums, and deliver it back to you — privately, intelligently, instantly.</p>
      <p class="sig-tag" data-rv="up" data-d="260">Beautifully Captured. <em>Intelligently Delivered.</em></p>
    </div>
    <div class="sig-imgs" data-rv="zoom">
      <img class="sig-a" data-px="0.05" loading="lazy" src="/images/br1.jpg" alt="Bridal portrait through a red veil">
      <img class="sig-b" data-px="-0.06" loading="lazy" src="/images/hd1.jpg" alt="Colourful haldi ceremony">
    </div>
  </div>
</section>

<section class="sec why2">
  <div class="wrap why2-wrap">
    <div class="why2-left">
      <p class="kicker" data-rv="up">Why Markipie</p>
      <h2 class="h2 xl" data-rv="mask"><span>Craft, meets</span></h2>
      <h2 class="h2 xl it" data-rv="mask" data-d="120"><span>intelligence.</span></h2>
      <div class="why2-fig"><img loading="lazy" data-px="0.05" src="/images/w5.jpg" alt="Candid wedding emotion"></div>
    </div>
    <ol class="why2-list">
      ${why.map((w, i) => `<li data-rv="up" data-d="${(i % 4) * 70}"><span class="wn">${String(i + 1).padStart(2, '0')}</span><div><h3>${w[0]}</h3><p>${w[1]}</p></div></li>`).join('')}
    </ol>
  </div>
</section>

<section class="sec ai-band">
  <div class="wrap ai-wrap">
    <div class="ai-copy">
      <p class="kicker light" data-rv="up">The Markipie Difference</p>
      <h2 class="h2 xl" data-rv="mask"><span>AI Face</span></h2>
      <h2 class="h2 xl it" data-rv="mask" data-d="120"><span>Recognition.</span></h2>
      <p class="lead light" data-rv="up">Inside your private gallery, scan your face with the live camera — and watch the event return every photograph of you. No scrolling. No searching. No OTP.</p>
      <a class="btn btn-ghost" href="/client" data-rv="up" data-d="140">Enter Client Access</a>
    </div>
    <div class="ai-visual" data-rv="zoom">
      <img loading="lazy" src="/images/br2.jpg" alt="Face recognition matching a bride across her wedding photos">
      <span class="ai-frame"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><b class="scanline"></b></span>
      <span class="ai-chip">487 photos found</span>
    </div>
  </div>
</section>

<section class="sec stories">
  <div class="wrap st-head">
    <div><p class="kicker" data-rv="up">Featured Stories</p>
    <h2 class="h2 xl" data-rv="mask"><span>Stories We’ve Told.</span></h2></div>
  </div>
  <div class="wrap wide st-grid">
    ${stories.map((st, i) => `
    <a class="st ${st.cls}" href="${st.href}" data-rv="up" data-d="${i * 80}">
      <img loading="lazy" src="${st.img}" alt="${esc(st.alt)}">
      ${st.video ? '<span class="st-play">▶</span>' : ''}
      <div class="st-ov"><span>${esc(st.cat)}</span><h3>${esc(st.title)}</h3></div>
    </a>`).join('')}
  </div>
  <div class="wrap st-more" data-rv="up"><a class="link-arrow big" href="/portfolio">Explore All Work <span>→</span></a></div>
</section>

<section class="sec films2">
  <div class="wrap fm-head">
    <p class="kicker light" data-rv="up">Cinematic Films</p>
    <h2 class="h2 xl light" data-rv="mask"><span>Some moments deserve to move.</span></h2>
  </div>
  <div class="film-hero" data-rv="zoom">
    <video id="filmvideo" src="/videos/film-ring.mp4" poster="/images/en1.jpg" preload="metadata" playsinline aria-label="Markipie cinematic wedding film"></video>
    <button class="playbtn" id="playbtn" aria-label="Play film"><i></i></button>
    <div class="film-tags"><span>Cinematic Films</span><i>·</i><span>Catchy Teasers</span><i>·</i><span>Latest Trendy Reels</span></div>
  </div>
</section>

<section class="sec albums2">
  <div class="wrap al2-wrap">
    <div class="al2-imgs" data-rv="left">
      <img loading="lazy" src="/images/al1.jpg" alt="Sage leather wedding album, open spread">
      <img loading="lazy" class="al2-b" data-px="-0.04" src="/images/al2.jpg" alt="Black leather album with gold foil">
    </div>
    <div class="al2-copy">
      <p class="kicker" data-rv="up">Premium Albums</p>
      <h2 class="h2 xl" data-rv="mask"><span>Memories</span></h2>
      <h2 class="h2 xl it" data-rv="mask" data-d="120"><span>You Can Hold.</span></h2>
      <ul class="al2-list" data-rv="up">
        <li>Premium Album Designs</li><li>Custom Layouts</li><li>Premium Materials</li><li>Personalisation in Foil</li>
      </ul>
      <a class="btn btn-line" href="/albums" data-rv="up" data-d="120">Explore Albums</a>
    </div>
  </div>
</section>

<section class="sec delivery">
  <div class="wrap">
    <p class="kicker" data-rv="up">AI Client Delivery</p>
    <h2 class="h2 xl" data-rv="mask"><span>Your Photos. Found Instantly.</span></h2>
    <div class="flow" data-rv="up">
      ${flow.map((f, i) => `<div class="flow-step"><span class="flow-n">${String(i + 1).padStart(2, '0')}</span><h3>${f[0]}</h3><p>${f[1]}</p></div>`).join('')}
    </div>
    <p class="delivery-note" data-rv="up">Private event galleries · secure access · album selection · downloads you control. Google Drive stays behind the scenes — you only ever see Markipie.</p>
  </div>
</section>

<section class="sec pkg2">
  <div class="wrap">
    <div class="st-head"><div><p class="kicker" data-rv="up">Packages</p>
    <h2 class="h2 xl" data-rv="mask"><span>Made Around You.</span></h2></div></div>
    <div class="pkg2-row">
      ${pkgs.map((p, i) => `<a class="pkg2" href="/packages" data-rv="up" data-d="${i * 80}"><span class="pkg2-tag">${esc(p.tag)}</span><h3>${esc(p.title)}</h3><strong>${ui.fmtINR(p.price)}</strong><p>${esc((p.desc || '').split('.')[0])}.</p><span class="link-arrow">View →</span></a>`).join('')}
    </div>
    <div class="st-more" data-rv="up"><a class="link-arrow big" href="/packages">View All Packages <span>→</span></a></div>
  </div>
</section>

<section class="sec rev2">
  <div class="wrap">
    <p class="kicker" data-rv="up">Google Reviews</p>
    <h2 class="h2 xl" data-rv="mask"><span>Loved By The People We Photograph.</span></h2>
    <div class="rev2-sum" data-rv="up"><strong>${(rm.rating || 5).toFixed(1)}</strong><span class="rev-stars">★★★★★</span><em>${rm.count || 25} ratings · public listing</em></div>
    <div class="rev2-grid">
      ${reviews.map((r, i) => `<blockquote data-rv="up" data-d="${i * 100}"><p>“${esc(r.text)}”</p><cite>${esc(r.name)} — ${esc(r.source)}</cite></blockquote>`).join('')}
      <a class="rev2-more" href="${esc(rm.sourceUrl || '#')}" target="_blank" rel="noopener" data-rv="up">Read the public listing →</a>
    </div>
  </div>
</section>

<section class="sec insta2">
  <div class="wrap st-head"><div><p class="kicker" data-rv="up">${esc(s.instagramHandle)}</p>
  <h2 class="h2 xl" data-rv="mask"><span>Moments Beyond The Frame.</span></h2></div>
  <a class="btn btn-line" href="${esc(s.instagram)}" target="_blank" rel="noopener" data-rv="up">Follow Markipie</a></div>
  <div class="insta-strip">
    ${ig.map((m, i) => `<a href="${esc(s.instagram)}" target="_blank" rel="noopener" data-rv="up" data-d="${(i % 8) * 60}"><img loading="lazy" src="${m.src}" alt="${esc(m.alt)}"></a>`).join('')}
  </div>
</section>

<section class="sec final2">
  <div class="final-bg" data-px="0.1"><img loading="lazy" src="/images/w1.jpg" alt="Indian wedding ceremony"></div>
  <div class="final-scrim"></div>
  <div class="wrap final-in">
    <h2 data-rv="mask"><span>Let’s Create Something</span></h2>
    <h2 class="it" data-rv="mask" data-d="120"><span>You’ll Keep Forever.</span></h2>
    <div class="cta-btns" data-rv="up" data-d="220">
      <a class="btn btn-light" href="/book">Book Your Date</a>
      <a class="btn btn-ghost" href="https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent('Hi Markipie! I’d like to book my date.')}" target="_blank" rel="noopener">WhatsApp Us</a>
    </div>
  </div>
</section>`
  });
}

/* ============ ABOUT ============ */
function about(db) {
  const s = db.read('settings');
  const team = db.list('team').filter(t => t.visible !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  return ui.shell({
    settings: s, active: '/about',
    meta: { path: '/about', title: 'About Us | MARKIPIE — Photography, Cinema & Technology', desc: 'Meet Markipie — a Delhi-based photography studio combining cinematic films, premium albums and AI-powered private delivery. Established ' + s.established + '.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">About Us</p>
<h1 class="h1" data-rv="mask"><span>A photography studio.</span></h1>
<p class="h1 it" data-rv="mask" data-d="140"><span>A technology company. A memory keeper.</span></p></div></section>

<section class="sec">
  <div class="wrap about-grid">
    <div class="about-copy">
      <p class="lead" data-rv="up">Markipie began in ${s.established} with a simple belief — the people in a photograph should never have to search for it, fight for it, or lose it.</p>
      <p data-rv="up">So we built more than a studio. We built a complete experience: candid and traditional photography that feels honest, cinematic films that feel like cinema, heirloom albums that feel like treasure — and a private, intelligent delivery platform that finds <em>you</em> in two thousand photographs with a single face scan.</p>
      <p data-rv="up">From Tagore Garden, Delhi, we travel wherever your story happens. Every package is made around you. Every delivery is private. Every frame is intentional.</p>
      <div class="about-nums" data-rv="up">
        <div><strong>${new Date().getFullYear() - s.established}+</strong><span>years in business</span></div>
        <div><strong>${db.list('portfolio').filter(p => p.published !== false).length}</strong><span>occasions covered</span></div>
        <div><strong>5.0★</strong><span>public rating</span></div>
      </div>
    </div>
    <div class="about-imgs" data-rv="right">
      <img loading="lazy" src="/images/hd1.jpg" alt="Markipie team photographing a haldi ceremony">
      <img loading="lazy" src="/images/cp1.jpg" alt="Markipie cinematographer at work" class="ab-2">
    </div>
  </div>
</section>

<section class="sec soft">
  <div class="wrap">
    <p class="kicker dark" data-rv="up">How we work</p>
    <h2 class="h2" data-rv="mask"><span>Four promises, every event.</span></h2>
    <div class="steps">
      <div class="step" data-rv="up"><span>01</span><h3>Listen</h3><p>Your vision, your people, your rituals — we plan coverage around them.</p></div>
      <div class="step" data-rv="up" data-d="100"><span>02</span><h3>Capture</h3><p>Candid emotion and classic composition, photographed and filmed in parallel.</p></div>
      <div class="step" data-rv="up" data-d="200"><span>03</span><h3>Craft</h3><p>Films scored and graded, albums designed page by page, reels cut to trend.</p></div>
      <div class="step" data-rv="up" data-d="300"><span>04</span><h3>Deliver</h3><p>A private gallery with AI face-match, selections and downloads you control.</p></div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <p class="kicker dark" data-rv="up">The Team</p>
    <h2 class="h2" data-rv="mask"><span>Artists behind the lens.</span></h2>
    <div class="team-grid">
      ${team.filter(t => String(t.name || '').trim()).map((t, i) => `<div class="team-card" data-rv="up" data-d="${i * 90}"><img loading="lazy" src="${esc(t.image)}" alt="${esc(t.name)}, ${esc(t.role)} at Markipie"><h3>${esc(t.name)}</h3><span>${esc(t.role)}</span><p>${esc(t.bio)}</p>${(t.instagram || t.linkedin) ? `<div class="team-soc">${t.instagram ? `<a href="${esc(t.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}${t.linkedin ? `<a href="${esc(t.linkedin)}" target="_blank" rel="noopener">Profile</a>` : ''}</div>` : ''}</div>`).join('')}
    </div>
  </div>
</section>

<section class="sec cta-band"><div class="wrap cta-in">
  <h2 data-rv="mask"><span>Come, say hello.</span></h2>
  <p data-rv="up">Tell us about your date and your dream — we’ll build the rest around you.</p>
  <div class="cta-btns" data-rv="up"><a class="btn btn-light" href="/book">Book Your Appointment</a><a class="btn btn-ghost" href="/portfolio">See Our Work</a></div>
</div></section>`
  });
}

/* ============ PORTFOLIO ============ */
function portfolio(db) {
  const s = db.read('settings');
  const cats = db.list('portfolio').filter(x => x.published !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const rows = cats.map((c, i) => `
  <article class="pf-row ${i % 2 ? 'rev' : ''}" data-rv="up">
    <a class="pf-img" href="/portfolio/${esc(c.slug)}"><span class="pf-num">${String(i + 1).padStart(2, '0')}</span><img loading="lazy" src="${esc(c.image)}" alt="${esc(c.title)} photography by Markipie"></a>
    <div class="pf-copy"><h2>${esc(c.title)}${c.featured ? ' <em class="cms-star">Featured</em>' : ''}</h2>${(c.location || c.date) ? `<p class="pf-meta">${esc([c.location, c.date].filter(Boolean).join(' · '))}</p>` : ''}<p>${esc(c.blurb || c.desc)}</p><a class="link-arrow" href="/portfolio/${esc(c.slug)}">View project <span>→</span></a></div>
  </article>`).join('');
  return ui.shell({
    settings: s, active: '/portfolio',
    meta: { path: '/portfolio', title: 'Portfolio — Our Work | MARKIPIE', desc: 'Weddings, pre-weddings, engagements, birthdays, bridal, groom, baby events, parties, corporate, fashion and traditional events — editorial portfolio by Markipie.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Portfolio · Our Work</p>
<h1 class="h1" data-rv="mask"><span>${cats.length} occasion${cats.length === 1 ? "" : "s"}.</span></h1><p class="h1 it" data-rv="mask" data-d="140"><span>One standard — unforgettable.</span></p></div></section>
<section class="sec pf-sec"><div class="wrap pf-wrap">${rows}</div></section>
<section class="sec cta-band"><div class="wrap cta-in"><h2 data-rv="mask"><span>Your occasion next?</span></h2><div class="cta-btns" data-rv="up"><a class="btn btn-light" href="/book">Book Your Appointment</a></div></div></section>`
  });
}

/* ============ GALLERY ============ */
function gallery(db) {
  const s = db.read('settings');
  const items = db.list('gallery').filter(x => x.published !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const cats = ['All', ...new Set(items.map(i => i.cat))];
  return ui.shell({
    settings: s, active: '/gallery',
    meta: { path: '/gallery', title: 'Gallery | MARKIPIE — Photography & Film Gallery', desc: 'Browse Markipie’s visual gallery — weddings, pre-weddings, bridal, groom, traditional ceremonies, parties, corporate, fashion and cinematic films.' },
    body: `
<section class="phead"><div class="wrap"><p class="kicker" data-rv="up">Gallery</p>
<h1 class="h1" data-rv="mask"><span>Frames that feel again.</span></h1></div></section>
<section class="sec gal-sec"><div class="wrap">
  <div class="filters" id="filters" data-rv="up">${cats.map((c, i) => `<button class="chip${i === 0 ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <div class="masonry" id="masonry">
    ${items.map((m, i) => m.type === 'video'
      ? `<figure class="m-item is-video" data-cat="${esc(m.cat)}" data-type="video" data-src="${m.video}" data-poster="${m.poster}" data-rv="up" data-d="${(i % 6) * 50}" tabindex="0" role="button" aria-label="Play ${esc(m.alt)}"><img loading="lazy" src="${m.poster}" alt="${esc(m.alt)}"><span class="m-play">▶</span><figcaption>${esc(m.alt)}</figcaption></figure>`
      : `<figure class="m-item" data-cat="${esc(m.cat)}" data-type="image" data-src="${m.src}" data-rv="up" data-d="${(i % 6) * 50}" tabindex="0" role="button" aria-label="${esc(m.alt)}"><img loading="lazy" src="${m.src}" alt="${esc(m.alt)}"><figcaption>${esc(m.alt)}</figcaption></figure>`).join('')}
  </div>
</div></section>
<div class="lightbox" id="lightbox" aria-hidden="true"><button class="lb-x" aria-label="Close">✕</button><button class="lb-prev" aria-label="Previous">‹</button><button class="lb-next" aria-label="Next">›</button><div class="lb-stage" id="lbstage"></div><div class="lb-bar"><span id="lbcount"></span><button id="lbzoom" aria-label="Zoom">⊕ Zoom</button></div></div>`,
    scripts: '<script src="/js/gallery.js"></script>'
  });
}


/* ============ PORTFOLIO PROJECT (CMS detail page) ============ */
function portfolioItem(db, slug) {
  const s = db.read('settings');
  const all = db.list('portfolio').filter(x => x.published !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));
  const p = all.find(x => x.slug === slug);
  if (!p) return null;                              // -> 404, hidden items included

  const gallery = (p.images || []).filter(Boolean);
  const more = all.filter(x => x.id !== p.id).slice(0, 3);
  const meta = [p.category, p.location, p.date].filter(Boolean).join(' · ');

  return ui.shell({
    settings: s, active: '/portfolio',
    meta: {
      path: '/portfolio/' + p.slug,
      title: `${p.title} — Portfolio | MARKIPIE`,
      desc: (p.desc || p.blurb || `${p.title} photography by Markipie.`).slice(0, 180),
      image: p.image
    },
    body: `
<section class="phead"><div class="wrap">
  <p class="kicker" data-rv="up"><a href="/portfolio" class="crumb">Portfolio</a> · ${esc(p.category || 'Project')}</p>
  <h1 class="h1" data-rv="mask"><span>${esc(p.title)}</span></h1>
  ${meta ? `<p class="pf-meta big" data-rv="up">${esc(meta)}</p>` : ''}
</div></section>

<section class="sec"><div class="wrap pfd-hero" data-rv="up">
  <img loading="eager" src="${esc(p.image)}" alt="${esc(p.title)} by Markipie">
</div></section>

${(p.desc || p.blurb) ? `<section class="sec"><div class="wrap pfd-copy" data-rv="up"><p class="lead">${esc(p.desc || p.blurb)}</p></div></section>` : ''}

${gallery.length ? `<section class="sec"><div class="wrap"><div class="pfd-grid">
  ${gallery.map((g, i) => `<figure class="pfd-item" data-i="${i}"><img loading="lazy" src="${esc(g)}" alt="${esc(p.title)} photograph ${i + 1}"></figure>`).join('')}
</div></div></section>` : ''}

${more.length ? `<section class="sec soft"><div class="wrap">
  <h2 class="sec-h" data-rv="up">More work</h2>
  <div class="pfd-more">${more.map(m => `<a class="pfd-card" href="/portfolio/${esc(m.slug)}" data-rv="up"><img loading="lazy" src="${esc(m.image)}" alt="${esc(m.title)}"><span>${esc(m.title)}</span></a>`).join('')}</div>
</div></section>` : ''}

<section class="sec cta-band"><div class="wrap cta-in"><h2 data-rv="mask"><span>Your occasion next?</span></h2>
<div class="cta-btns" data-rv="up"><a class="btn btn-light" href="/book">${esc(s.bookingCta || 'Book Appointment')}</a></div></div></section>

<div class="sg-lb" id="pfdlb" aria-hidden="true"><button class="sg-x" id="pfdx" aria-label="Close">&times;</button><img id="pfdimg" alt=""></div>`,
    scripts: `<script>
(function(){
  var lb=document.getElementById('pfdlb'),im=document.getElementById('pfdimg');
  var srcs=${JSON.stringify(gallery)};
  document.querySelectorAll('.pfd-item').forEach(function(el){
    el.addEventListener('click',function(){ im.src=srcs[+el.dataset.i]; lb.classList.add('on'); });
  });
  function close(){ lb.classList.remove('on'); im.src=''; }
  document.getElementById('pfdx').addEventListener('click',close);
  lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
  addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
})();
</script>`
  });
}

module.exports = { home, about, portfolio, portfolioItem, gallery };
