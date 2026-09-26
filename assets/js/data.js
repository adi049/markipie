/* ============================================================
   MARKIPIE — Data layer (public-safe bundle)
   ------------------------------------------------------------
   • Every API method returns a Promise, so a real backend can
     replace the storage adapter later WITHOUT touching page code.
   • Client access codes are NEVER stored in this file — client
     records live in the managed data store and are seeded from
     the admin bundle only (see /admin/assets/admin-data.js).
   • Blog / client records created in the Admin Panel are saved to
     the same store and appear on the public pages instantly.
   ============================================================ */
(function (global) {
  'use strict';

  var PREFIX = 'mk_';
  var memory = {}; // fallback when localStorage is unavailable (sandboxed iframes)

  var store = {
    read: function (key, fallback) {
      try {
        var raw = localStorage.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback; }
    },
    write: function (key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { memory[key] = value; return false; } // quota exceeded → keep in memory
    },
    ensure: function (key, producer) {
      if (store.read(key, null) == null) store.write(key, producer());
    }
  };

  /* ---------------- utilities ---------------- */
  var util = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    uid: function (p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    slugify: function (s) {
      var out = String(s || '').toLowerCase().replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
      return out || util.uid('post');
    },
    fmtDate: function (iso) {
      try {
        var d = new Date(iso + (String(iso).length === 10 ? 'T00:00:00' : ''));
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) { return iso; }
    },
    money: function (n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  };

  var P = function (v) { return Promise.resolve(v); };

  /* ============================================================
     SITE CONFIG — packages, marketing services, site copy.
     Static config for this phase; the Admin Panel will manage
     these records through the same API shape in a later phase.
     ============================================================ */
  var CATEGORIES = [
    { id: 'wedding',    label: 'Wedding Packages',      blurb: 'Complete single-side and both-side wedding coverage.' },
    { id: 'engagement', label: 'Engagement & Events',   blurb: 'Engagement ceremonies, birthdays and intimate gatherings.' },
    { id: 'prewedding', label: 'Pre-Wedding',           blurb: 'Cinematic pre-wedding stories at paid locations across Delhi NCR.' }
  ];

  var PACKAGES = [
    {
      id: 'wed-65', category: 'wedding', categoryLabel: 'Single-Side Photography',
      title: 'Single-Side Wedding Package', note: '', appliesTo: [],
      price: 65000, priceDisplay: '₹65,000/-', priceLine: 'All this for ₹65,000/- only', albumOption: '',
      sections: [
        { name: 'Haldi-Mehndi', items: ['1 Photographer', '1 Videographer'] },
        { name: 'Wedding', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] }
      ],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '1 Album — 50 Sheet — 12x36 Glossy', '250 Album Edited Photos'],
      complimentary: ['16x24 Big Size Frame', 'AI Face Recognition', 'Album Selection Tool']
    },
    {
      id: 'wed-90', category: 'wedding', categoryLabel: 'Single-Side Photography',
      title: 'Single-Side Wedding Package — Extended', note: '', appliesTo: [],
      price: 90000, priceDisplay: '₹90,000/-', priceLine: 'All this for ₹90,000/- only', albumOption: '',
      sections: [
        { name: 'Engagement', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] },
        { name: 'Haldi-Mehndi', items: ['1 Photographer', '1 Videographer'] },
        { name: 'Wedding', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] }
      ],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '1 Album — 60 Sheet — 12x36 Glossy', '350 Album Edited Photos'],
      complimentary: ['16x24 Big Size Frame — 2 Nos', 'AI Face Recognition', 'Album Selection Tool']
    },
    {
      id: 'wed-120', category: 'wedding', categoryLabel: 'Both-Side Photography',
      title: 'Both-Side Wedding Package', note: '', appliesTo: [],
      price: 120000, priceDisplay: '₹1,20,000/-', priceLine: 'All this for ₹1,20,000/- only', albumOption: '',
      sections: [
        { name: 'Engagement', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] },
        { name: 'Haldi-Mehndi', items: ['1 Photographer', '1 Videographer'] },
        { name: 'Wedding', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] }
      ],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '1 Album — 50 Sheet — 12x36 Glossy — Each Side', '300 Album Edited Photos — Each Side'],
      complimentary: ['16x24 Big Size Frame — 2 Nos', 'AI Face Recognition', 'Album Selection Tool']
    },
    {
      id: 'wed-185', category: 'wedding', categoryLabel: 'Premium Wedding Package',
      title: 'Premium Both-Side Wedding Package', note: '', appliesTo: [], featured: true,
      price: 185000, priceDisplay: '₹1,85,000/-', priceLine: 'All this for ₹1,85,000/- only', albumOption: '',
      sections: [
        { name: 'Engagement', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] },
        { name: 'Haldi-Mehndi', items: ['1 Photographer', '1 Videographer'] },
        { name: 'Wedding', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer', '1 Drone'] },
        { name: 'Reception', items: ['1 Photographer', '1 Videographer', '1 Cinematographer', '1 Candid', '1 Drone'] }
      ],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '2 Albums — 40 Sheet — 12x36 Glossy — Each Side', 'Total 400 Album Edited Photos — Each Side'],
      complimentary: ['16x24 Big Size Frame — 2 Nos', 'AI Face Recognition', 'Album Selection Tool']
    },
    {
      id: 'eng-15', category: 'engagement', categoryLabel: 'Engagement Photography',
      title: 'Engagement Photography — Up to 100 Gathering', note: '', appliesTo: [],
      price: 15000, priceDisplay: '₹15,000/-', priceLine: 'All this for ₹15,000/- only',
      albumOption: 'With Album — ₹18,000/- only',
      sections: [{ name: 'Include', items: ['1 Cinematographer', '1 Candid'] }],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel', 'Long Edited Video'],
      complimentary: ['16x24 Frame']
    },
    {
      id: 'eng-35', category: 'engagement', categoryLabel: 'Engagement / Birthday',
      title: 'Engagement / Birthday Package', note: 'Up to 125–200 Gathering',
      appliesTo: ['Engagement', 'Birthday'],
      price: 35000, priceDisplay: '₹35,000/-', priceLine: 'All this for ₹35,000/- only', albumOption: '',
      sections: [{ name: 'Include', items: ['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer'] }],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel', 'Long Edited Video',
        '1 Album — 30 Sheet — 12x36 Glossy', '150 Album Edited Photos'],
      complimentary: ['16x24 Big Size Frame', 'AI Face Recognition', 'Album Selection Tool']
    },
    {
      id: 'pre-45', category: 'prewedding', categoryLabel: 'Pre-Wedding',
      title: 'Pre-Wedding — Package A', note: 'Paid Location — Delhi NCR', appliesTo: [],
      price: 45000, priceDisplay: '₹45,000/-', priceLine: 'All this for ₹45,000/- only', albumOption: '',
      sections: [{ name: 'Include', items: ['1 Cinematographer', '1 Candid Photographer', '1 Drone'] }],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel',
        '1 Album — 20 Sheet — 12x36 Glossy', '100 Album Edited Photos'],
      complimentary: ['16x24 Frame', '1 Magazine Style Album — 15 Pages']
    },
    {
      id: 'pre-25', category: 'prewedding', categoryLabel: 'Pre-Wedding',
      title: 'Pre-Wedding — Package B', note: 'Paid Location — Delhi NCR', appliesTo: [],
      price: 25000, priceDisplay: '₹25,000/-', priceLine: 'All this for ₹25,000/- only', albumOption: '',
      sections: [{ name: 'Include', items: ['1 Cinematographer', '1 Candid Photographer'] }],
      deliverables: ['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel',
        '1 Album — 15 Sheet — 12x36 Glossy', '75 Album Edited Photos'],
      complimentary: ['16x24 Frame', '1 Magazine Style Album — 10 Pages']
    }
  ];

  var MARKETING = [
    {
      id: 'smm', icon: 'share', title: 'Social Media Management',
      priceLine: 'Starting at ₹15,000/month',
      intro: 'End-to-end handling of your social presence — planning, shoots, edits and posting.',
      includes: ['Social Media Management', 'Content Planning', 'Content Creation', 'Video Shoot', 'Video Editing',
        'Reels', 'Posts', 'Stories', 'Basic Content Strategy'],
      tiers: [
        { name: 'Basic', desc: 'A simple starting plan for one platform.' },
        { name: 'Standard', desc: 'For growing brands that need regular content.' },
        { name: 'Premium', desc: 'Full-scale coverage across platforms.' }
      ],
      tierNote: 'Custom Package — contact us for a tailored plan.',
      cta: 'Get a Quote'
    },
    {
      id: 'video', icon: 'video', title: 'Video Editing',
      priceLine: 'Starting at ₹1,500',
      intro: 'Sharp, cinematic edits for every screen — from quick reels to full wedding films.',
      types: ['Reels', 'Short-form Videos', 'Wedding Videos', 'Cinematic Edits', 'Social Media Videos'],
      cta: 'Get a Quote'
    },
    {
      id: 'design', icon: 'pen', title: 'Graphic Design',
      priceLine: 'Starting at ₹700',
      intro: 'Clean, on-brand creatives that make your posts, print and campaigns stand out.',
      types: ['Social Media Posts', 'Promotional Creatives', 'Posters', 'Banners', 'Marketing Creatives', 'Branding Graphics'],
      cta: 'Get a Quote'
    }
  ];

  /* ============================================================
     SEED BLOGS — sample posts so the blog system has structure
     out of the box. Replace / delete them from the Admin Panel.
     Block types: h2 | p | img   (gallery = additional images)
     ============================================================ */
  var SEED_BLOGS = [
    {
      id: 'blog_seed_001', slug: 'planning-your-wedding-photography-timeline',
      title: 'Planning Your Wedding Photography Timeline',
      excerpt: 'A calm, well-planned timeline is the quiet secret behind every beautiful wedding album.',
      cover: null, date: '2026-08-14', status: 'published',
      createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z',
      intro: [
        { type: 'p', html: 'Great wedding photographs are rarely an accident — they are the result of a day that flows without panic. When your events have breathing room, your photographer can anticipate moments instead of chasing them.' },
        { type: 'h2', html: 'Start from the events, not the clock' },
        { type: 'p', html: 'List every event — haldi, mehndi, sangeet, wedding, reception — and note where the light will be at that hour. Morning functions flatter outdoor spaces; evening receptions come alive with cinematic lighting.' },
        { type: 'p', html: 'Share the final timeline with your photography team a few days in advance, and nominate one family member who knows the schedule. Small coordination like this is what makes candid photography feel effortless.' }
      ],
      gallery: [null, null],
      outro: [
        { type: 'p', html: 'If you are unsure how much time your events need, ask your studio early — a short conversation while planning saves hours of rushing on the day itself.' }
      ]
    },
    {
      id: 'blog_seed_002', slug: 'candid-vs-traditional-photography',
      title: 'Candid vs Traditional: Understanding the Difference',
      excerpt: 'Both styles belong at an Indian wedding — they simply tell different parts of the story.',
      cover: null, date: '2026-07-02', status: 'published',
      createdAt: '2026-07-02T09:00:00.000Z', updatedAt: '2026-07-02T09:00:00.000Z',
      intro: [
        { type: 'p', html: 'Traditional photography documents the essentials: group shots, rituals and every relative who matters. Candid photography waits for the unposed seconds in between — the tear, the laugh, the glance.' },
        { type: 'h2', html: 'Why you usually want both' },
        { type: 'p', html: 'A complete album needs the structure of traditional coverage and the emotion of candid work. That is exactly why most packages pair a traditional photographer with a dedicated candid specialist.' },
        { type: 'p', html: 'When you review a studio\'s work, look for both: crisp, complete ritual coverage and candid frames that feel like they were never staged — because they weren\'t.' }
      ],
      gallery: [null],
      outro: [
        { type: 'p', html: 'The right balance depends on your events and family size — a studio that offers both under one roof keeps the day coordinated and the album complete.' }
      ]
    },
    {
      id: 'blog_seed_003', slug: 'pre-wedding-shoot-simple-checklist',
      title: 'A Simple Pre-Wedding Shoot Checklist',
      excerpt: 'Outfits, location, timing — a few early decisions make a pre-wedding shoot feel effortless.',
      cover: null, date: '2026-05-21', status: 'published',
      createdAt: '2026-05-21T09:00:00.000Z', updatedAt: '2026-05-21T09:00:00.000Z',
      intro: [
        { type: 'p', html: 'A pre-wedding shoot is a relaxed rehearsal for the wedding day — and often the photographs couples end up framing the largest. A little planning goes a long way.' },
        { type: 'h2', html: 'The five things to lock first' },
        { type: 'p', html: 'Choose your location and check if it needs permission. Pick outfits that complement each other rather than match exactly. Plan around golden hour. Rest well the night before. And discuss the mood you want — cinematic, playful or classic.' },
        { type: 'p', html: 'If a paid location is involved, confirm entry timings for your crew in advance so the shoot starts on schedule.' }
      ],
      gallery: [null, null],
      outro: [
        { type: 'p', html: 'Bring water, comfortable shoes and your favourite song list — small comforts keep the energy natural on camera.' }
      ]
    }
  ];

  /* ============================================================
     BLOGS API
     ============================================================ */
  function allBlogs() {
    var items = store.read('blogs_v1', null);
    if (items == null) { items = SEED_BLOGS.slice(); store.write('blogs_v1', items); }
    return items;
  }
  function saveBlogs(items) { return store.write('blogs_v1', items); }

  var blogs = {
    list: function (opts) {
      opts = opts || {};
      var items = allBlogs().slice()
        .filter(function (b) { return opts.includeDrafts ? true : b.status === 'published'; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      return P(items);
    },
    get: function (slug) {
      var post = null;
      allBlogs().forEach(function (b) { if (b.slug === slug && b.status === 'published') post = b; });
      return P(post);
    },
    getById: function (id) {
      var post = null;
      allBlogs().forEach(function (b) { if (b.id === id) post = b; });
      return P(post);
    },
    slugExists: function (slug, exceptId) {
      return allBlogs().some(function (b) { return b.slug === slug && b.id !== exceptId; });
    },
    create: function (data) {
      var items = allBlogs();
      var post = {
        id: util.uid('blog'),
        slug: data.slug || util.slugify(data.title),
        title: data.title, excerpt: data.excerpt || '', cover: data.cover || null,
        date: data.date || new Date().toISOString().slice(0, 10),
        status: data.status === 'published' ? 'published' : 'draft',
        intro: data.intro || [], gallery: data.gallery || [], outro: data.outro || [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      var n = 2, base = post.slug;
      while (blogs.slugExists(post.slug)) { post.slug = base + '-' + (n++); }
      items.unshift(post); saveBlogs(items);
      return P(post);
    },
    update: function (id, patch) {
      var items = allBlogs(), post = null;
      items.forEach(function (b) {
        if (b.id === id) {
          Object.keys(patch).forEach(function (k) { b[k] = patch[k]; });
          b.updatedAt = new Date().toISOString();
          post = b;
        }
      });
      if (post) saveBlogs(items);
      return P(post);
    },
    remove: function (id) {
      saveBlogs(allBlogs().filter(function (b) { return b.id !== id; }));
      return P(true);
    }
  };

  /* ============================================================
     CLIENTS API — records live in the managed data store only.
     The public bundle never contains access codes.
     ============================================================ */
  function allClients() { return store.read('clients_v2', null) || []; }

  /* Public view — exposes ONLY presentation fields.
     Never: access codes, Drive folders/ids, storage locations. */
  function defaultPermissions() {
    return { clientAccess: true, watermark: true, download: false, aiSearch: true, videos: true };
  }
  function publicView(c) {
    if (!c) return null;
    return {
      id: c.id, name: c.name, eventTitle: c.eventTitle || c.name,
      eventType: c.eventType, eventDate: c.eventDate, status: c.status,
      permissions: Object.assign(defaultPermissions(), c.permissions || {}),
      accessOpen: c.status === 'active' && c.paymentStatus === 'received' &&
                  (!c.permissions || c.permissions.clientAccess !== false)
    };
  }

  /* ============================================================
     MARKETING SERVICES — admin-managed (Phase 13). Seeded once
     from the provided real content; edits persist in the store.
     ============================================================ */
  function allMarketing() {
    var st = store.read('marketing_v1', null);
    if (!st) { store.write('marketing_v1', MARKETING); return MARKETING.slice(); }
    return st;
  }
  var marketing = {
    /* public default: active only; admins pass {all:true} */
    list: function (opts) {
      var items = allMarketing().slice();
      if (!(opts && opts.all)) {
        items = items.filter(function (m) { return m.status !== 'inactive'; });
      }
      items.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      return P(items);
    },
    get: function (id) { return P(allMarketing().filter(function (m) { return m.id === id; })[0] || null); },
    update: function (id, patch) {
      var items = allMarketing(), hit = null;
      items.forEach(function (m) { if (m.id === id) { Object.keys(patch).forEach(function (k) { m[k] = patch[k]; }); hit = m; } });
      if (hit) store.write('marketing_v1', items);
      return P(hit);
    },
    create: function (data) {
      var items = allMarketing();
      var m = {
        id: util.uid('mk'), icon: data.icon || 'megaphone', title: data.title || 'Untitled Service',
        priceLine: data.priceLine || '', intro: data.intro || '', includes: data.includes || [],
        tiers: data.tiers || [], tierNote: data.tierNote || 'Custom Package — contact us for a tailored plan.',
        cta: data.cta || 'Get a Quote', status: data.status === 'inactive' ? 'inactive' : 'active',
        sortOrder: Number(data.sortOrder) || items.length + 1
      };
      items.push(m); store.write('marketing_v1', items);
      return P(m);
    },
    remove: function (id) {
      store.write('marketing_v1', allMarketing().filter(function (m) { return m.id !== id; }));
      return P(true);
    }
  };

  var clients = {
    list: function () { return P(allClients().slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); })); },
    get: function (id) { var f = allClients().filter(function (c) { return c.id === id; })[0]; return P(f || null); },
    getPublic: function (id) { return P(publicView(allClients().filter(function (c) { return c.id === id; })[0])); },
    create: function (data) {
      var items = allClients();
      var st = ['active', 'inactive', 'suspended', 'archived'];
      var c = {
        id: util.uid('client'), code: String(data.code || '').trim().toUpperCase(),
        name: data.name, eventTitle: data.eventTitle || '', eventType: data.eventType || '',
        eventDate: data.eventDate || '',
        contact: data.contact || '',
        paymentStatus: data.paymentStatus === 'received' ? 'received' : 'pending',
        status: st.indexOf(data.status) !== -1 ? data.status : 'inactive',
        permissions: Object.assign(defaultPermissions(), data.permissions || {}),
        drive: Object.assign(
          { connected: false, folderId: '', folderUrl: '', status: 'not_connected', lastSynced: null, syncStatus: 'idle' },
          data.drive || {}),
        createdAt: new Date().toISOString()
      };
      items.unshift(c); store.write('clients_v2', items);
      return P(c);
    },
    update: function (id, patch) {
      var items = allClients(), c = null;
      items.forEach(function (x) { if (x.id === id) { Object.keys(patch).forEach(function (k) { x[k] = patch[k]; }); x.updatedAt = new Date().toISOString(); c = x; } });
      if (c) store.write('clients_v2', items);
      return P(c);
    },
    remove: function (id) {
      store.write('clients_v2', allClients().filter(function (c) { return c.id !== id; }));
      // remove the client's functions + media metadata with them
      store.write('functions_v1', allFunctions().filter(function (f) { return f.clientId !== id; }));
      var fids = {}; store.read('functions_v1', []).forEach(function (f) { fids[f.id] = 1; });
      store.write('media_v1', allMedia().filter(function (m) { return fids[m.function_id]; }));
      return P(true);
    },
    /* Generic validation — the response never reveals which codes exist. */
    validate: function (code) {
      var norm = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
      var hit = null;
      /* Gate: client exists AND status active AND payment received.
         The response never reveals which condition failed. */
      allClients().forEach(function (c) {
        var accessOn = !c.permissions || c.permissions.clientAccess !== false;
        if (c.code === norm && c.status === 'active' && c.paymentStatus === 'received' && accessOn) hit = c;
      });
      return P(hit ? { ok: true, clientId: hit.id, name: hit.name } : { ok: false });
    },
    generateCode: function (name) {
      /* Secure-format code: MP-<NAME>-<YEAR>-<4 chars>. In production the
         random part must come from the server; it is never hardcoded. */
      var base = String(name || 'Markipie').split(/\s+/)[0] || 'MKP';
      var initials = base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      while (initials.length < 3) initials += 'X';
      var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      var code = 'MP-' + initials + '-' + new Date().getFullYear() + '-';
      for (var i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      while (allClients().some(function (c) { return c.code === code; })) {
        var suffix = '';
        for (var j = 0; j < 4; j++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        code = 'MP-' + initials + '-' + new Date().getFullYear() + '-' + suffix;
      }
      return code;
    },
    regenerateCode: function (id) {
      var c = allClients().filter(function (x) { return x.id === id; })[0];
      if (!c) return P(null);
      c.code = clients.generateCode(c.eventTitle || c.name);
      store.write('clients_v2', allClients());
      clients.logEvent(id, 'code', 'Access code regenerated (' + c.code + '). Old code is no longer valid.');
      return P(c);
    },
    logEvent: function (id, type, text) {
      var evs = store.read('events_v1', null) || [];
      evs.unshift({ clientId: id, type: type, text: text, at: new Date().toISOString() });
      store.write('events_v1', evs.slice(0, 120));
    },
    events: function (id) {
      return P((store.read('events_v1', null) || []).filter(function (e) { return e.clientId === id; }));
    }
  };

  /* ============================================================
     PHOTO INDEXING JOBS — asynchronous batch architecture.
     The job lives in the data store, NOT in page memory: the admin
     can leave the page and return; progress persists and resumes.
     (Server-side stand-in: a Supabase worker/edge function will run
     the same job shape against real Drive media in the next phase.)
     PHOTOS ONLY — videos are never face-indexed.
     ============================================================ */
  function allJobs() { return store.read('jobs_v1', null) || []; }

  var jobs = {
    latest: function (clientId) {
      var hit = null;
      allJobs().forEach(function (j) { if (j.clientId === clientId) { if (!hit || j.startedAt > hit.startedAt) hit = j; } });
      return P(hit);
    },
    start: function (clientId) {
      return functions.forClient(clientId, { admin: true }).then(function (fns) {
        var photos = 0, videos = 0;
        fns.forEach(function (f) { photos += f.photoCount || 0; videos += f.videoCount || 0; });
        var job = {
          id: util.uid('job'), clientId: clientId,
          status: photos > 0 ? 'processing' : 'failed',
          totals: { photos: photos, videos: videos },   // videos excluded from processing
          processed: 0, faces: 0, pending: photos,
          failed: [], statusMessage: photos > 0 ? 'Indexing your photos…' : 'No photos to index — add Drive folders first.',
          startedAt: new Date().toISOString(), heartbeat: new Date().toISOString(), completedAt: null
        };
        var list = allJobs().filter(function (j) { return j.clientId !== clientId; });
        list.unshift(job);
        store.write('jobs_v1', list);
        store.write('face_v1', (store.read('face_v1', null) || []).filter(function (r) { return r.client_id !== clientId; }));
        clients.logEvent(clientId, 'indexing', 'Photo scan started — ' + photos.toLocaleString('en-IN') + ' photos (videos excluded).');
        return job;
      });
    },
    pause: function (jobId) {
      var list = allJobs();
      list.forEach(function (j) {
        if (j.id === jobId && j.status === 'processing') {
          j.status = 'paused';
          j.statusMessage = 'Indexing paused — resume anytime.';
          j.heartbeat = new Date().toISOString();
          clients.logEvent(j.clientId, 'indexing', 'Photo scan paused at ' + j.processed.toLocaleString('en-IN') + ' / ' + j.totals.photos.toLocaleString('en-IN') + '.');
        }
      });
      store.write('jobs_v1', list);
      return P(list.filter(function (j) { return j.id === jobId; })[0]);
    },
    resume: function (jobId) {
      var list = allJobs();
      list.forEach(function (j) {
        if (j.id === jobId && j.status === 'paused') {
          j.status = 'processing';
          j.statusMessage = 'Indexing your photos…';
          j.heartbeat = new Date().toISOString();
          clients.logEvent(j.clientId, 'indexing', 'Photo scan resumed.');
        }
      });
      store.write('jobs_v1', list);
      return P(list.filter(function (j) { return j.id === jobId; })[0]);
    },
    /* processes ONE batch; called repeatedly by the admin UI (or a worker) */
    tick: function (jobId, batchSize) {
      var list = allJobs(), job = null;
      list.forEach(function (j) { if (j.id === jobId) job = j; });
      if (!job || (job.status !== 'processing')) return P(job);
      var size = Math.min(batchSize || 80, job.pending);
      var faces = 0, fails = [];
      /* one face-index record per processed photo (pgvector target shape) —
         the embedding itself lives only in the vector index, never here */
      var fns = allFunctions().filter(function (f) { return f.clientId === job.clientId; });
      var fRecs = store.read('face_v1', null) || [];
      for (var i = 0; i < size; i++) {
        var n = job.processed + i;
        var fn = fns.length ? fns[n % fns.length] : null;
        var fid = fn ? fn.id : 'fn';
        var dfid = 'drive_' + fid + '_' + n;
        var r = Math.random();
        if (r < 0.015) {
          fails.push({ file: dfid, reason: 'Face detection failed — low quality image' });
          fRecs.push({ client_id: job.clientId, function_id: fid, drive_file_id: dfid, face_count: 0, processing_status: 'failed' });
        } else {
          var fr = Math.random();
          var fc = fr < 0.55 ? 1 : fr < 0.8 ? 2 : fr < 0.93 ? 3 : 0;
          faces += fc;
          fRecs.push({ client_id: job.clientId, function_id: fid, drive_file_id: dfid, face_count: fc, processing_status: 'done' });
        }
      }
      if (fRecs.length > 8000) fRecs = fRecs.slice(-8000);
      store.write('face_v1', fRecs);
      job.processed += size; job.pending -= size; job.faces += faces;
      job.failed = job.failed.concat(fails);
      job.heartbeat = new Date().toISOString();
      job.statusMessage = 'Indexing your photos…';
      if (job.pending <= 0) {
        job.pending = 0;
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.statusMessage = 'Indexing completed.';
        clients.logEvent(job.clientId, 'indexing', 'Photo scan completed — ' + job.processed.toLocaleString('en-IN') +
          ' photos, ' + job.faces.toLocaleString('en-IN') + ' faces found' +
          (job.failed.length ? ', ' + job.failed.length + ' failed.' : '.'));
      }
      list.forEach(function (j, idx) { if (j.id === job.id) list[idx] = job; });
      store.write('jobs_v1', list);
      return P(job);
    },
    retryFailed: function (jobId) {
      var list = allJobs();
      list.forEach(function (j) {
        if (j.id === jobId && j.status !== 'processing') {
          j.pending += j.failed.length;
          j.failed = [];
          j.status = 'processing';
          j.statusMessage = 'Retrying failed photos…';
          j.heartbeat = new Date().toISOString();
        }
      });
      store.write('jobs_v1', list);
      return P(list.filter(function (j) { return j.id === jobId; })[0]);
    }
  };

  /* ============================================================
     FACE INDEX — vector-store foundation (Supabase pgvector target).
     Per processed photo: client_id, function_id, drive_file_id,
     face_count, processing_status. Embeddings themselves live only
     in the vector index; camera images are never stored.
     ============================================================ */
  var faceIndex = {
    status: 'architecture-ready',
    recordsFor: function (clientId) {
      return P((store.read('face_v1', null) || []).filter(function (r) { return r.client_id === clientId; }));
    },
    summary: function (clientId) {
      return jobs.latest(clientId).then(function (job) {
        return {
          photos: job ? job.totals.photos : 0,
          processed: job ? job.processed : 0,
          faces: job ? job.faces : 0,
          pending: job ? job.pending : 0,
          failed: job ? job.failed.length : 0,
          status: job ? job.status : 'not_started',
          statusMessage: job ? job.statusMessage : 'Not started.'
        };
      });
    },
    /* Real implementation: pgvector cosine search scoped to the
       functions the user may access — never the whole database. */
    search: function (descriptor, opts) {
      return P({ ok: false, reason: 'face-index-not-connected' });
    }
  };

  /* ============================================================
     SETTINGS API — studio details managed from the Admin Panel.
     ============================================================ */
  var DEFAULT_SETTINGS = {
    studioName: 'Markipie', phone: '', whatsapp: '', email: '',
    instagram: '', address: ''
  };
  var settings = {
    get: function () { return P(Object.assign({}, DEFAULT_SETTINGS, store.read('settings_v1', {}))); },
    save: function (patch) {
      var cur = Object.assign({}, DEFAULT_SETTINGS, store.read('settings_v1', {}), patch);
      store.write('settings_v1', cur);
      return P(cur);
    }
  };

  function allFunctions() { return store.read('functions_v1', null) || []; }
  function publicFn(f) {
    if (!f) return null;
    return {
      id: f.id, clientId: f.clientId, name: f.name, eventDate: f.eventDate || '',
      cover: f.cover || null, photoCount: f.photoCount || 0, videoCount: f.videoCount || 0,
      downloadPermission: f.downloadPermission || 'none', sortOrder: f.sortOrder || 0,
      /* feature gate (not sensitive): whether this function participates
         in face search — the scanner filters AI-off functions client-side */
      aiFaceSearch: f.aiFaceSearch !== false
    };
  }
  var functions = {
    forClient: function (clientId, opts) {
      var admin = !!(opts && opts.admin);
      var list = allFunctions()
        .filter(function (f) { return f.clientId === clientId && (admin || f.status === 'active'); })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)); });
      return P(list.map(admin ? function (f) { return Object.assign({}, f); } : publicFn));
    },
    get: function (fid, opts) {
      var admin = !!(opts && opts.admin);
      var f = allFunctions().filter(function (x) { return x.id === fid; })[0];
      return P(f ? (admin ? Object.assign({}, f) : publicFn(f)) : null);
    },
    create: function (data) {
      var items = allFunctions();
      var f = {
        id: util.uid('fn'), clientId: data.clientId,
        name: data.name, eventDate: data.eventDate || '',
        driveFolderId: data.driveFolderId || '', driveFolderUrl: data.driveFolderUrl || '',
        driveStatus: data.driveStatus || (data.driveFolderId || data.driveFolderUrl ? 'connected' : 'not_connected'),
        cover: data.cover || null, photoCount: Number(data.photoCount) || 0,
        videoCount: Number(data.videoCount) || 0,
        downloadPermission: data.downloadPermission || 'none',
        aiFaceSearch: data.aiFaceSearch !== false,
        sortOrder: Number(data.sortOrder) || 0,
        status: data.status === 'disabled' ? 'disabled' : 'active',
        createdAt: new Date().toISOString()
      };
      items.unshift(f); store.write('functions_v1', items);
      return P(f);
    },
    update: function (id, patch) {
      var items = allFunctions(), f = null;
      items.forEach(function (x) { if (x.id === id) { Object.keys(patch).forEach(function (k) { x[k] = patch[k]; }); f = x; } });
      if (f) store.write('functions_v1', items);
      return P(f);
    },
    remove: function (id) {
      store.write('functions_v1', allFunctions().filter(function (f) { return f.id !== id; }));
      store.write('media_v1', allMedia().filter(function (m) { return m.function_id !== id; }));
      return P(true);
    }
  };

  /* ============================================================
     MEDIA METADATA API — the media layer.
     Actual photos/videos stay in Google Drive; only metadata lives
     here (Supabase-shaped). A real Drive-backed source adapter can
     be plugged in via media.setSource() without UI changes.
     Record: { media_id, function_id, drive_file_id, filename,
               mime_type, media_type, thumbnail_reference, status }
     ============================================================ */
  function allMedia() { return store.read('media_v1', null) || []; }
  function publicMedia(m) {
    // drive_file_id intentionally omitted from public payloads —
    // only display references (thumbnails/previews) are exposed
    return {
      id: m.media_id, function_id: m.function_id, filename: m.filename,
      media_type: m.media_type, thumb: m.thumbnail_reference || null,
      src: m.preview_reference || null, size: m.file_size || null
    };
  }
  var media = {
    perPage: 12,
    source: null, // future: Google Drive media source adapter
    setSource: function (adapter) { media.source = adapter; },
    listByFunction: function (fid, opts) {
      var opts2 = opts || {};
      var page = Math.max(1, opts2.page || 1);
      if (media.source) return media.source.list(fid, page, media.perPage, opts2.type || null);
      var all = availableMedia(fid);
      if (opts2.type === 'photo' || opts2.type === 'video') {
        all = all.filter(function (m) { return m.media_type === opts2.type; });
      }
      var start = (page - 1) * media.perPage;
      return P({
        items: all.slice(start, start + media.perPage).map(publicMedia),
        page: page, hasMore: start + media.perPage < all.length, total: all.length
      });
    },
    /* real counters for the gallery filter chips (Part 14) */
    counts: function (fid) {
      if (media.source && media.source.counts) return media.source.counts(fid);
      var all = availableMedia(fid);
      return P({
        photos: all.filter(function (m) { return m.media_type === 'photo'; }).length,
        videos: all.filter(function (m) { return m.media_type === 'video'; }).length,
        total: all.length
      });
    }
  };
  /* files removed from Drive are marked, never destroyed (Phase 10) */
  function availableMedia(fid) {
    return allMedia().filter(function (m) {
      return m.function_id === fid && m.status !== 'deleted' && m.status !== 'removed';
    });
  }

  /* ============================================================
     DRIVE — URL helpers (metadata only). Markipie stores folder
     references; media stays in Google Drive and is always served
     inside Markipie — users are never sent to the Drive UI.
     ============================================================ */
  var drive = {
    parseFolderId: function (input) {
      var v = String(input || '').trim();
      if (!v) return '';
      if (/^[A-Za-z0-9_-]{15,}$/.test(v)) return v;                 // raw folder id
      var m = v.match(/\/folders\/([A-Za-z0-9_-]+)/);
      if (m) return m[1];                                           // …/folders/ID
      m = v.match(/[?&]id=([A-Za-z0-9_-]+)/);
      if (m) return m[1];                                           // …?id=FILE_ID
      return '';
    }
  };

  /* ============================================================
     PACKAGES — one source of truth for the public Services page,
     the home preview and Admin → Services CRUD. Rate-card values
     render verbatim from these records; comparison attributes are
     derived from each package's own coverage/deliverables, so the
     comparison table can never claim anything the package doesn't
     include.
     ============================================================ */
  function allPackages() {
    var items = store.read('packages_v1', null);
    if (items == null) {
      items = PACKAGES.map(function (p) {
        var q = Object.assign({}, p);
        q.published = q.published !== false;
        q.compare = buildCompare(q);
        return q;
      });
      store.write('packages_v1', items);
    }
    return items;
  }
  function findItem(list, name) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].toLowerCase().indexOf(name.toLowerCase()) !== -1) return list[i];
    }
    return null;
  }
  function buildCompare(p) {
    var sectionItems = [];
    (p.sections || []).forEach(function (sx) { sectionItems = sectionItems.concat(sx.items || []); });
    var cov = (p.sections || []).map(function (sx) { return sx.name; }).join(' · ');
    var album = findItem(p.deliverables || [], 'Album —') || findItem(p.deliverables || [], 'Album');
    return {
      coverage: cov,
      photographer: !!findItem(sectionItems, 'Photographer'),
      videographer: !!findItem(sectionItems, 'Videographer'),
      candid: !!findItem(sectionItems, 'Candid'),
      cinematographer: !!findItem(sectionItems, 'Cinematographer'),
      drone: !!(findItem(sectionItems, 'Drone') || findItem(p.deliverables || [], 'Drone')),
      album: album || '',
      editedPhotos: findItem(p.deliverables || [], 'Album Edited Photos') || '',
      frame: findItem(p.complimentary || [], 'Frame') || '',
      aiFace: !!findItem(p.complimentary || [], 'AI Face Recognition'),
      albumSelection: !!findItem(p.complimentary || [], 'Album Selection')
    };
  }
  function priceDisplayFor(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') + '/-'; }

  var packages = {
    buildCompare: buildCompare,   /* reused by the Supabase service layer */
    list: function (opts) {
      var admin = !!(opts && opts.includeUnpublished);
      var cat = (opts && opts.category) || '';
      var items = allPackages().filter(function (p) { return admin || p.published !== false; })
        .filter(function (p) { return !cat || p.category === cat; });
      return P(items.map(function (p) { return Object.assign({}, p); }));
    },
    get: function (id) {
      return P((allPackages().filter(function (p) { return p.id === id; })[0] || null));
    },
    categories: function () { return P(CATEGORIES.slice()); },
    create: function (data) {
      var items = allPackages();
      var n = 1, id = 'pkg-' + Date.now().toString(36);
      while (items.some(function (p) { return p.id === id; })) id = 'pkg-' + Date.now().toString(36) + '-' + (n++);
      var np = {
        id: id, category: data.category || 'wedding',
        categoryLabel: data.categoryLabel || '', title: data.title || 'Untitled Package',
        note: data.note || '', appliesTo: data.appliesTo || [], featured: !!data.featured,
        price: Number(data.price) || 0, priceDisplay: priceDisplayFor(data.price),
        priceLine: 'All this for ' + priceDisplayFor(data.price) + ' only', albumOption: data.albumOption || '',
        sections: (data.sections || []).map(function (sx) { return { name: sx.name, items: sx.items || [] }; }),
        deliverables: data.deliverables || [], complimentary: data.complimentary || [],
        published: data.published !== false, createdAt: new Date().toISOString()
      };
      np.compare = buildCompare(np);
      items.unshift(np); store.write('packages_v1', items);
      return P(Object.assign({}, np));
    },
    update: function (id, patch) {
      var items = allPackages(), hit = null;
      items.forEach(function (p, i) {
        if (p.id === id) {
          hit = Object.assign({}, p, patch, { id: p.id, createdAt: p.createdAt });
          if (patch.price !== undefined && patch.price !== null) {
            hit.price = Number(patch.price) || 0;
            hit.priceDisplay = priceDisplayFor(hit.price);
            hit.priceLine = 'All this for ' + hit.priceDisplay + ' only';
          }
          hit.compare = buildCompare(hit);
          items[i] = hit;
        }
      });
      store.write('packages_v1', items);
      return P(hit ? Object.assign({}, hit) : null);
    },
    setPublished: function (id, val) { return packages.update(id, { published: val !== false }); },
    remove: function (id) {
      store.write('packages_v1', allPackages().filter(function (p) { return p.id !== id; }));
      return P(true);
    }
  };

  /* ---------------- public surface ---------------- */
  global.MarkipieData = {
    store: store,
    util: util,
    blogs: blogs,
    clients: clients,
    settings: settings,
    functions: functions,
    media: media,
    drive: drive,
    jobs: jobs,
    faceIndex: faceIndex,
    packages: packages,
    marketing: marketing,
    /* Phase 13 admin control center — aggregated activity across clients */
    activity: {
      list: function (opts) {
        var o = opts || {};
        var TYPE_CATEGORY = {
          code: 'clients', payment: 'clients', permission: 'permissions',
          indexing: 'ai', drive: 'drive', blog: 'blogs', service: 'services',
          auth: 'authentication', client: 'clients', function: 'functions'
        };
        var evs = (store.read('events_v1', null) || []).slice();
        evs.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
        return P(evs.filter(function (e) {
          if (o.category && o.category !== 'all' && TYPE_CATEGORY[e.type] !== o.category) return false;
          if (o.from && String(e.at).slice(0, 10) < o.from) return false;
          if (o.to && String(e.at).slice(0, 10) > o.to) return false;
          if (o.q) {
            var hay = String(e.text || '').toLowerCase() + ' ' + String(e.type || '').toLowerCase() + ' ' + String(e.clientId || '').toLowerCase();
            if (hay.indexOf(String(o.q).toLowerCase()) === -1) return false;
          }
          return true;
        }));
      }
    }
  };
})(window);
