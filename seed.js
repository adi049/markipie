'use strict';
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

const has = (c) => { try { return fs.existsSync(path.join(db.DATA, c + '.json')); } catch (e) { return false; } };
const seed = (c, v) => { if (!has(c)) db.write(c, v); };

/* ---------------- settings ---------------- */
seed('settings', {
  brand: 'MARKIPIE',
  tagline: 'Beautifully Captured. Intelligently Delivered.',
  phone: '+91 85860 00345',
  phoneRaw: '+918586000345',
  whatsapp: '918586000345',
  email: 'info@markipie.com',
  instagram: 'https://www.instagram.com/markipieofficial/',
  instagramHandle: '@markipieofficial',
  address: 'D-106, Near Janta Book Depot, Shop No. 1, Tagore Garden, Delhi 110027',
  // §12: no admin password is ever seeded into data. The credential lives in
  // ADMIN_PASSWORD (env) or the scrypt hash at data/.adminpass — run `node migrate.js`.
  driveApiKey: '',
  faceRecognition: true,
  faceThreshold: 0.55,
  introEnabled: true,
  established: 2020
});

/* ---------------- packages ---------------- */
seed('packages', [
  { id: 'pkg-essential', title: 'Essential', price: 25000, order: 1, popular: false, enabled: true, tag: 'Intimate Events', image: '/images/bd1.jpg',
    desc: 'For intimate shoots and simple celebrations.',
    features: ['1 Photographer (up to 6 hours)', '60+ edited photographs', 'Private online gallery', 'Album selection tool'] },
  { id: 'pkg-signature', title: 'Signature', price: 45000, order: 2, popular: false, enabled: true, tag: 'Full Day', image: '/images/w1.jpg',
    desc: 'For couples wanting a richer gallery experience.',
    features: ['2 Photographers (full day)', '150+ edited photographs', 'Private gallery with AI face scan', '1 highlight reel', 'Album selection tool'] },
  { id: 'pkg-premium', title: 'Premium', price: 60000, order: 3, popular: true, enabled: true, tag: 'Most Popular', image: '/images/pw1.jpg',
    desc: 'For complete wedding/event coverage and enhanced deliverables.',
    features: ['2 Photographers + 1 Cinematographer', 'Full event coverage', 'Cinematic highlight film', '2 trendy reels', 'Premium 30-page album', 'AI face-recognition gallery'] },
  { id: 'pkg-legacy', title: 'Legacy', price: 125000, order: 4, popular: false, enabled: true, tag: 'Flagship', image: '/images/br1.jpg',
    desc: 'For luxury weddings, large events and complete premium coverage.',
    features: ['2 Senior Photographers + 2 Cinematographers', 'All events, multi-day coverage', 'Full cinematic film + teaser', '4 trendy social reels', 'Heirloom 40-page album + 2 parent albums', 'AI face-recognition private gallery', 'Priority delivery'] }
]);

/* ---------------- services ---------------- */
seed('services', [
  { id: 's1', title: 'Wedding Photography', benefit: 'Every ritual, glance and celebration — documented seamlessly so you relive the day forever.', image: '/images/w2.jpg' },
  { id: 's2', title: 'Candid Photography', benefit: 'Unposed, honest emotion. The laughter and tears you didn’t know were captured.', image: '/images/w3.jpg' },
  { id: 's3', title: 'Traditional Photography', benefit: 'Classic family portraits and rituals, composed with timeless elegance.', image: '/images/hd1.jpg' },
  { id: 's4', title: 'Pre-Wedding Photography', benefit: 'A cinematic chapter of just the two of you, before the big day begins.', image: '/images/pw1.jpg' },
  { id: 's5', title: 'Birthday Photography', benefit: 'Cake-smash giggles to candlelit wishes — every age, beautifully remembered.', image: '/images/bd1.jpg' },
  { id: 's6', title: 'Event Photography', benefit: 'Corporate days, parties and special occasions covered with a discreet, editorial eye.', image: '/images/cp1.jpg' },
  { id: 's7', title: 'Cinematic Films', benefit: 'Your event edited like a feature film — scored, graded and unforgettable.', image: '/images/w5.jpg' },
  { id: 's8', title: 'Cinematic Teaser Videos', benefit: 'A catchy 60-second teaser, delivered fast, made to be shared everywhere.', image: '/images/pw2.jpg' },
  { id: 's9', title: 'Latest Trendy Reels', benefit: 'Vertical, trend-aware reels that make your moments travel on Instagram.', image: '/images/pt1.jpg' },
  { id: 's10', title: 'Premium Album Design', benefit: 'Editorial layouts designed page-by-page around your story, not templates.', image: '/images/al1.jpg' },
  { id: 's11', title: 'Premium Albums', benefit: 'Heirloom-grade prints, leather and acrylic finishes that last generations.', image: '/images/al2.jpg' },
  { id: 's12', title: 'AI Photo Delivery', benefit: 'Private galleries with AI face recognition — find yourself in 2,000 photos in seconds.', image: '/images/br2.jpg' },
  { id: 's13', title: 'Album Selection', benefit: 'Choose your album photographs from a beautiful selection tool, from any device.', image: '/images/gr1.jpg' }
]);

/* ---------------- portfolio categories ---------------- */
seed('portfolio', [
  { id: 'weddings', title: 'Weddings', blurb: 'Full wedding stories, from haldi mornings to midnight farewells.', image: '/images/w1.jpg' },
  { id: 'pre-weddings', title: 'Pre-Weddings', blurb: 'Cinematic chapters written before the vows.', image: '/images/pw1.jpg' },
  { id: 'engagements', title: 'Engagements', blurb: 'The yes, the ring, the first forever glance.', image: '/images/en1.jpg' },
  { id: 'birthdays', title: 'Birthdays', blurb: 'Candles, confetti and cake-smash joy.', image: '/images/bd1.jpg' },
  { id: 'anniversaries', title: 'Anniversaries', blurb: 'Love, celebrated all over again.', image: '/images/an1.jpg' },
  { id: 'bridal', title: 'Bridal', blurb: 'Portraits of the bride, in every light.', image: '/images/br1.jpg' },
  { id: 'groom', title: 'Groom', blurb: 'Quiet confidence, sharply framed.', image: '/images/gr1.jpg' },
  { id: 'baby-events', title: 'Baby Events', blurb: 'Tiny beginnings, tenderly captured.', image: '/images/bb1.jpg' },
  { id: 'parties', title: 'Parties', blurb: 'Energy, music and midnight laughter.', image: '/images/pt1.jpg' },
  { id: 'corporate', title: 'Corporate Events', blurb: 'Brands and milestones, professionally told.', image: '/images/cp1.jpg' },
  { id: 'fashion', title: 'Fashion', blurb: 'Editorial frames with attitude.', image: '/images/fs1.jpg' },
  { id: 'traditional', title: 'Traditional Events', blurb: 'Ritual and colour, honoured frame by frame.', image: '/images/hd1.jpg' },
  { id: 'special', title: 'Other Special Occasions', blurb: 'If it matters to you, it matters to us.', image: '/images/w3.jpg' }
]);

/* ---------------- gallery ---------------- */
const g = (id, src, cat, alt, type, video, poster) => ({ id, src, cat, alt, type: type || 'image', video: video || '', poster: poster || '' });
seed('gallery', [
  g('g01', '/images/w1.jpg', 'Weddings', 'Indian wedding couple in traditional ceremony attire'),
  g('g02', '/images/w2.jpg', 'Weddings', 'Bride and groom holding hands at wedding'),
  g('g03', '/images/w3.jpg', 'Weddings', 'Candid wedding couple against brick wall'),
  g('g04', '/images/hd1.jpg', 'Traditional', 'Mehendi and haldi ceremony colours'),
  g('g05', '/images/hd2.jpg', 'Traditional', 'Haldi ceremony candid moment'),
  g('g06', '/images/hd3.jpg', 'Traditional', 'Couple during haldi ceremony with marigolds'),
  g('g07', '/images/hd4.jpg', 'Traditional', 'Haldi turmeric paste preparation detail'),
  g('g08', '/images/pw1.jpg', 'Pre-Wedding', 'Pre-wedding couple by the pool'),
  g('g09', '/images/pw2.jpg', 'Pre-Wedding', 'Couple sharing food in pre-wedding shoot'),
  g('g10', '/images/pw3.jpg', 'Pre-Wedding', 'Couple dancing under the night sky'),
  g('g11', '/images/pw4.jpg', 'Pre-Wedding', 'Couple shoot at hillside stay'),
  g('g12', '/images/en1.jpg', 'Engagements', 'Surprise proposal moment'),
  g('g13', '/images/en2.jpg', 'Engagements', 'Engagement ring proposal candid'),
  g('g14', '/images/en3.jpg', 'Engagements', 'Couple celebrating the proposal'),
  g('g15', '/images/br1.jpg', 'Bridal', 'Bride smiling through her red veil'),
  g('g16', '/images/br2.jpg', 'Bridal', 'Indian bride in lehenga portrait'),
  g('g17', '/images/br3.jpg', 'Bridal', 'Bride getting ready for the ceremony'),
  g('g18', '/images/br4.jpg', 'Bridal', 'Smiling bride with heavy jewellery'),
  g('g19', '/images/gr1.jpg', 'Groom', 'Groom in sherwani regal portrait'),
  g('g20', '/images/gr2.jpg', 'Groom', 'Groom traditional attire detail'),
  g('g21', '/images/gr3.jpg', 'Groom', 'Groom wedding-day portrait'),
  g('g22', '/images/bd1.jpg', 'Birthdays', 'Sparklers and candles celebration'),
  g('g23', '/images/bb1.jpg', 'Baby Events', 'Baby portrait on bed, family session'),
  g('g24', '/images/pt1.jpg', 'Parties', 'Friends with confetti at night party'),
  g('g25', '/images/pt2.jpg', 'Parties', 'Friends dancing at illuminated party'),
  g('g26', '/images/bd2.jpg', 'Parties', 'Celebratory toast with string lights'),
  g('g27', '/images/cp1.jpg', 'Corporate', 'Corporate conference stage moment'),
  g('g28', '/images/cp2.jpg', 'Corporate', 'Conference audience at branded presentation'),
  g('g29', '/images/fs1.jpg', 'Fashion', 'Fashion editorial studio portrait'),
  g('g30', '/images/fs2.jpg', 'Fashion', 'Model practising pose in studio'),
  g('g31', '/images/fs3.jpg', 'Fashion', 'Editorial fashion portrait in studio light'),
  g('g32', '/images/an1.jpg', 'Anniversaries', 'Anniversary jewellery gift moment'),
  g('g33', '/images/w4.jpg', 'Weddings', 'Romantic couple pose, candid frame'),
  g('g34', '/images/w5.jpg', 'Weddings', 'Wedding couple romantic candid'),
  g('g35', '/images/w6.jpg', 'Weddings', 'Couple laughter between ceremonies'),
  g('g36', '/images/w7.jpg', 'Weddings', 'Wedding day candid storytelling'),
  g('g37', '/images/al1.jpg', 'Albums', 'Open sage-green leather wedding album'),
  g('g38', '/images/al2.jpg', 'Albums', 'Black leather album with gold foil stamping'),
  g('v01', '', 'Films', 'Cinematic wedding film — the ring exchange', 'video', '/videos/film-ring.mp4', '/images/en1.jpg'),
  g('v02', '', 'Films', 'Wedding ceremony cinematic film', 'video', '/videos/film-ceremony.mp4', '/images/w2.jpg'),
  g('v03', '', 'Reels', 'Trendy vertical wedding reel', 'video', '/videos/reel-dance.mp4', '/images/pt2.jpg')
]);

/* ---------------- albums showcase ---------------- */
seed('albums', [
  { id: 'al1', title: 'Sage Heirloom', finish: 'Sage green leather · linen pages', desc: 'A soft-touch leather cover with foil personalisation and museum-grade lay-flat spreads.', image: '/images/al1.jpg' },
  { id: 'al2', title: 'Raven Gold', finish: 'Black leather · gold foil stamping', desc: 'Deep black leather stamped with your names in gold — a classic, dramatic keepsake.', image: '/images/al2.jpg' },
  { id: 'al3', title: 'Acrylic Luxe', finish: 'Crystal acrylic cover · edge-to-edge print', desc: 'A glass-like acrylic cover with vivid edge-to-edge prints inside.', image: '/images/br2.jpg' },
  { id: 'al4', title: 'Editorial Ivory', finish: 'Ivory silk · minimalist typography', desc: 'Quiet luxury: silk-wrapped boards and generous, editorial white space.', image: '/images/br4.jpg' },
  { id: 'al5', title: 'Cinematic Story', finish: 'Photo-book + embedded QR film', desc: 'Print spreads paired with a scannable link to your cinematic film.', image: '/images/w5.jpg' },
  { id: 'al6', title: 'Family Treasury', finish: 'Parent albums · matching slipcase', desc: 'Matching parent copies in a handcrafted slipcase — one story, three homes.', image: '/images/w1.jpg' }
]);

/* ---------------- blogs ---------------- */
seed('blogs', [
  { id: 'b1', slug: 'choose-your-wedding-photographer', title: 'How to Choose the Right Wedding Photographer (Without Regret)', category: 'Weddings', author: 'Markipie Studio', date: '2026-07-18', status: 'published', cover: '/images/w1.jpg',
    seoTitle: 'How to Choose a Wedding Photographer | Markipie', seoDesc: 'A practical, honest guide to choosing a wedding photographer — portfolios, contracts, delivery and the questions that matter.',
    content: `<p>Your photographer is the one vendor whose work you keep forever. Cakes are eaten, flowers fade — but the frames remain. Here is how to choose well.</p><h2>Look at full weddings, not highlights</h2><p>Any studio can show ten beautiful frames. Ask to see two or three complete wedding stories. You are hiring someone for eight to twelve hours of unpredictable light, emotion and chaos — consistency matters more than a single viral shot.</p><h2>Ask how you receive your photos</h2><p>Modern delivery should be private, fast and intelligent. At Markipie every event gets a private gallery with AI face recognition, so a guest can scan their face and instantly find themselves among two thousand photographs — no USB sticks lost in drawers, no public Drive links.</p><h2>Understand the film, not just the photos</h2><p>A cinematic film and a catchy teaser are now part of the memory. Watch the studio’s films: do they make you feel something, or just show something?</p><h2>Albums are heirlooms</h2><p>Check album quality — paper, leather, lay-flat binding. An album you can hold beats a folder on a phone. And make sure the studio offers an album selection tool so you choose the photographs that matter to you.</p><p>Choose the team whose work, process and people you trust. Then stay present on your day — that is what you are really paying for.</p>` },
  { id: 'b2', slug: 'cinematic-wedding-films-guide', title: 'What Makes a Wedding Film Truly Cinematic?', category: 'Films', author: 'Markipie Films', date: '2026-06-30', status: 'published', cover: '/images/pw1.jpg',
    seoTitle: 'Cinematic Wedding Films Explained | Markipie', seoDesc: 'Sound design, colour grading, story structure — what separates a cinematic wedding film from a simple video.',
    content: `<p>“Cinematic” is the most overused word in wedding videography. Here is what it should actually mean.</p><h2>Story before spectacle</h2><p>A cinematic film has a beginning, a middle and an end. It opens with anticipation — the quiet before the day — and builds through emotion to celebration. Drone shots are seasoning, not the meal.</p><h2>Sound is half the film</h2><p>The vows, the laughter, the shaky toast speech. Real audio, cleanly recorded, is what makes you cry five years later. Music carries the film; your voices anchor it.</p><h2>Colour grading sets the mood</h2><p>Grading is the film’s temperature — warm skin, deep shadows, honest tones. A good grade is invisible; you simply feel the day again.</p><h2>The teaser earns the share</h2><p>A 60–90 second teaser, cut to music and delivered within days, is how your story meets the world. Trendy vertical reels extend it to Instagram, where memories now live.</p><p>Ask any studio — including us — to show a full film, not just a montage. Cinema reveals itself in the long form.</p>` },
  { id: 'b3', slug: 'ai-face-recognition-photo-delivery', title: 'AI Face Recognition: Find Yourself in 2,000 Wedding Photos', category: 'Technology', author: 'Markipie Studio', date: '2026-06-02', status: 'published', cover: '/images/br2.jpg',
    seoTitle: 'AI Face Recognition Photo Delivery | Markipie', seoDesc: 'How Markipie’s private client galleries use live face scanning to match your photos from thousands — privately and instantly.',
    content: `<p>After a big wedding, the photographer delivers thousands of photographs. Wonderful — and overwhelming. Every guest wants the same thing: “my” photos.</p><h2>The old way is broken</h2><p>Public gallery links, shared Drive folders, endless scrolling at midnight. It works, but it is neither private nor personal.</p><h2>The Markipie way</h2><p>Each event gets a private gallery with a unique access link and QR code. Inside, guests can tap “Scan Your Face” — using their live camera, never an upload — and our face-recognition engine matches them across the entire event. “487 photos found” — and there you are, every frame of you.</p><h2>Private by design</h2><p>Face scans happen on your device; your gallery is protected by an access code and your phone number; downloads respect the permissions your photographer sets. Google Drive stays behind the scenes as storage — you only ever see the Markipie gallery.</p><p>Technology should feel like magic in service of memory. That is the standard we build to.</p>` },
  { id: 'b4', slug: 'premium-wedding-album-guide', title: 'The Premium Album Guide: Leather, Lay-Flat and Lasting', category: 'Albums', author: 'Markipie Design', date: '2026-05-12', status: 'published', cover: '/images/al1.jpg',
    seoTitle: 'Premium Wedding Album Guide | Markipie', seoDesc: 'Paper, finishes, layouts and personalisation — how to design a wedding album worth keeping for generations.',
    content: `<p>Phones upgrade every year. Albums outlive us. Here is how to build one properly.</p><h2>Start with the story</h2><p>A great album is edited, not dumped. Forty to sixty spreads that breathe — one hero image per spread, details as rhythm. Our album selection tool puts the choosing in your hands.</p><h2>Paper and binding</h2><p>Look for lay-flat binding and thick, lustre or silk paper. It keeps spreads flat through decades of thumbs and lies beautifully open on a table.</p><h2>Covers that age well</h2><p>Leather deepens; acrylic dazzles; silk whispers. Choose the material that sounds like your wedding felt. Personalise with foil-stamped names and the date.</p><h2>Order the parent copies</h2><p>The people who cried the most deserve more than a WhatsApp forward. Matching parent albums in a slipcase are the kindest upgrade in wedding photography.</p><p>An album is the only deliverable your grandchildren will hold. Build it like one.</p>` }
]);

/* ---------------- reviews (REAL only — sourced from Markipie's public listings) ---------------- */
seed('reviews', [
  { id: 'r1', name: 'Aman Khan', rating: 5, date: '2024-09-18', source: 'Google · via JustDial', text: 'Best service in the area.' },
  { id: 'r2', name: 'JustDial Community', rating: 5, date: '2025-01-01', source: 'JustDial listing', text: 'Rated 5.0 across 25 ratings for service, punctuality and quality.' }
]);
seed('reviewMeta', { rating: 5.0, count: 25, sourceUrl: 'https://www.justdial.com/Delhi/Markipie-Photo-Studio-Near-Janta-Book-Depot-Tagore-Garden/011PXX11-XX11-240827132629-M5W2_BZDET' });

/* ---------------- team ---------------- */
seed('team', [
  { id: 't1', name: 'Simer Preet', role: 'Founder & Creative Director', bio: 'Founded Markipie to unite photography, cinema and technology in one client experience.', image: '/images/gr2.jpg' },
  { id: 't2', name: '', role: 'Lead Cinematographer', bio: 'Scores, grades and cuts every film like a story, not a slideshow.', image: '/images/cp2.jpg' },
  { id: 't3', name: '', role: 'Senior Album Designer', bio: 'Designs editorial spreads page by page, around your story.', image: '/images/al1.jpg' },
  { id: 't4', name: '', role: 'Client Experience Manager', bio: 'Your single point of contact from booking to album delivery.', image: '/images/fs3.jpg' }
]);

/* ---------------- collage templates ---------------- */
seed('collageTemplates', [
  { id: 'ct1', name: 'Solo Frame', cells: [[0, 0, 1, 1]] },
  { id: 'ct2', name: 'Duo Split', cells: [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] },
  { id: 'ct3', name: 'Side by Side', cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  { id: 'ct4', name: 'Hero Trio', cells: [[0, 0, 1, 0.6], [0, 0.6, 0.5, 0.4], [0.5, 0.6, 0.5, 0.4]] },
  { id: 'ct5', name: 'Classic Four', cells: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  { id: 'ct6', name: 'Mosaic Five', cells: [[0, 0, 0.66, 0.66], [0.66, 0, 0.34, 0.33], [0.66, 0.33, 0.34, 0.33], [0, 0.66, 0.5, 0.34], [0.5, 0.66, 0.5, 0.34]] }
]);

/* ---------------- clients ---------------- */
seed('clients', [
  { id: 'cl1', name: 'Rahul', phone: '+91 98xxxxxx21', email: 'rahul@example.com', notes: 'Wedding — Dec 2025. Loves cinematic teasers.' },
  { id: 'cl2', name: 'Meera', phone: '+91 99xxxxxx87', email: 'meera@example.com', notes: 'Pre-wedding at hills. Album pending selection.' }
]);

/* ---------------- events ---------------- */
const evMedia = (arr) => arr.map((s, i) => ({ id: 'm' + i, src: '/images/' + s + '.jpg', type: 'image', alt: 'Rahul wedding photograph ' + (i + 1) }));
seed('events', [
  { id: 'ev1', clientName: 'Rahul', phone: '+91 98xxxxxx21', email: 'rahul@example.com', eventType: 'Wedding', date: '2025-12-14', location: 'Delhi',
    code: 'RAHUL2026', driveFolder: '', paymentStatus: 'paid', allowDownload: true, allowShare: true, faceRecognition: true, instagramRequired: true, galleryLive: true,
    media: evMedia(['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'hd1', 'hd2', 'hd3', 'hd4', 'br1', 'br2', 'br3', 'gr1', 'gr2', 'en1', 'pt1', 'bd2', 'an1', 'pw1', 'w2']),
    videos: [{ id: 'mv1', type: 'video', src: '/videos/film-ring.mp4', poster: '/images/en1.jpg', alt: 'Rahul wedding cinematic film' }],
    selections: [], favourites: [], accessLog: [] },
  { id: 'ev2', clientName: 'Meera', phone: '+91 99xxxxxx87', email: 'meera@example.com', eventType: 'Pre-Wedding', date: '2026-02-20', location: 'Himachal',
    code: 'MEERA2026', driveFolder: '', paymentStatus: 'partial', allowDownload: false, allowShare: false, faceRecognition: true, instagramRequired: true, galleryLive: true,
    media: [{ id: 'mm1', src: '/images/pw1.jpg', type: 'image', alt: 'Meera pre-wedding 1' }, { id: 'mm2', src: '/images/pw2.jpg', type: 'image', alt: 'Meera pre-wedding 2' }, { id: 'mm3', src: '/images/pw3.jpg', type: 'image', alt: 'Meera pre-wedding 3' }, { id: 'mm4', src: '/images/pw4.jpg', type: 'image', alt: 'Meera pre-wedding 4' }, { id: 'mm5', src: '/images/en2.jpg', type: 'image', alt: 'Meera pre-wedding 5' }],
    videos: [], selections: [], favourites: [], accessLog: [] }
]);

/* ---------------- bookings / messages ---------------- */
seed('bookings', [
  { id: 'bk1', name: 'Priya Sharma', phone: '+91 98123 45678', email: 'priya@example.com', eventDate: '2026-11-22', eventType: 'Wedding', location: 'Gurugram', budget: '₹1.5L – ₹2.5L', requirements: 'Candid + cinematic film + premium album', message: 'Please check availability for 22 Nov 2026.', status: 'new', createdAt: '2026-08-28' }
]);
seed('messages', [
  { id: 'msg1', name: 'Kavita', phone: '+91 90000 11111', email: 'kavita@example.com', subject: 'Album enquiry', message: 'Do you make parent albums for anniversaries too?', createdAt: '2026-08-30' }
]);

seed('sessions', {});
seed('clientSessions', {});

console.log('Seeded:', fs.readdirSync(db.DATA).join(', '));
