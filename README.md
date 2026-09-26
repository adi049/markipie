# Markipie — Studio Platform

Premium website + admin panel for the Markipie photography studio.
Mobile-first · white/off-white breathing space with a strategic category colour system · page-wise architecture · Google-Drive-backed client galleries · AI face-scan foundation · integration-ready data layer.

## Category colour system (accents only — white stays dominant)

| Context | Gradient |
|---|---|
| Wedding packages | blue `#00A4FF` → purple `#7C5CFF` |
| Engagement & Events | pink `#FF5C8A` → coral `#FF8A5C` |
| Pre-Wedding | green `#00C389` → cyan `#00D8D4` |
| Premium package | gold `#D9A430` → purple `#8B5CF6` |
| Social Media Management | pink `#FF4FA3` → purple `#8B5CF6` |
| Video Editing | blue `#00A4FF` → cyan `#00D8D4` |
| Graphic Design | green `#10B981` → gold `#EAC33F` |
| AI Face Scan (tech highlight) | purple → pink → blue → cyan |

Accents appear only as top hairlines, chips, icon tints, price-block washes and CTAs —
never as full backgrounds — so the site keeps its premium white space.
AI elements use the animated `btn--tech` gradient and a rotating conic scan ring
(purple/pink/blue/cyan) as the website's tech moment.

## Admin functionality + premium packages + interactive experience (Phase 8)

**Admin auth (dev only):** Admin ID `markipie` · password `website` — stored as a SHA-256
hash of `user|pass` (plain fallback for non-secure contexts), never rendered anywhere
public, isolated in `M.auth.login()` so it swaps to Supabase Auth by replacing one method.

- **Shell:** sidebar = Dashboard · Clients · Blogs · Services · Marketing · Gallery ·
  Settings · Log out (drawer on mobile). Dashboard cards: Total Clients, Active Clients,
  Total Blogs, Connected Drives, Indexed Photos — computed from saved records, 0 when
  empty, nothing invented.
- **Client management:** Add Client generates a unique code on demand
  ([GENERATE CODE] + [COPY]); permission toggles (Watermark/Download/AI Face Search) on
  the form; client page has Payment (confirm / revert to pending, ✓ PAYMENT CONFIRMED),
  Client Access, Events, Google Drive (per-function CONNECT DRIVE with
  NOT CONNECTED/CONNECTED/SYNCING/SYNCED/ERROR), Photo AI Indexing with
  PAUSE / RESUME / RETRY FAILED and "N / M Photos · X%" live progress, and a
  CLIENT PERMISSIONS panel — Client Access · Watermark · Download · AI Face Search ·
  Video Access, each saving independently. Client Access OFF (or pending payment) stops
  the code instantly; public pages gate on the computed `accessOpen` flag.
- **Packages (one source of truth):** store-backed CRUD via Admin → Services
  (add / edit / delete / publish / unpublish / price / coverage / deliverables /
  complimentary). Rate-card values render verbatim; comparison attributes are derived
  from each package's own content, so the table can never claim anything unconfigured.
- **Public Services:** premium editorial cards — per-category gradient borders
  (wedding blue→purple→deep-pink · engagement pink→coral→orange · pre-wedding
  green→cyan→blue · premium purple→pink→gold), glow, layered price section, animated
  icon, sheen CTA, neutral badges (WEDDING / ENGAGEMENT / PRE-WEDDING / PREMIUM
  COLLECTION — never BEST/#1/MOST POPULAR). VIEW PACKAGE opens a modal (bottom-sheet on
  mobile) with full inclusions + ENQUIRE NOW. Filter tabs ALL/WEDDING/ENGAGEMENT/
  PRE-WEDDING/PREMIUM (scrollable on mobile, animated filtering). COMPARE PACKAGES:
  pick up to 3 → neutral 12-row comparison (Coverage · Photographer · Videographer ·
  Candid · Cinematographer · Drone · Album · Edited Photos · Frame · AI Face
  Recognition · Album Selection · Price), table scrolls only inside itself.
- **Home:** QUICK EXPLORE (About/Services/Gallery/Client Access), WEDDING STORIES
  (Haldi/Mehendi/Wedding/Reception cinematic category cards — not testimonials),
  FIND YOUR PHOTOS purple/pink/blue/cyan gradient environment with animated face-scan
  ring + scanline → /find-your-photos, creative-services chips. Stats stay
  1000+ Weddings · 7+ Years · 12 Machines; no fake reviews.
- **Micro-interactions:** magnetic buttons (fine-pointer only), animated nav underlines,
  card lifts, scroll reveal, count-ups — all transform/opacity, disabled under
  prefers-reduced-motion.

Suites: `verify_phase8.py` (113 static) · `verify_phase8_e2e.py` (55 browser checks,
360px mobile included) — all eight suites green (44/30/15/28 + 106/39 + 113/55).

## Supabase backend foundation (Phase 9 — CANONICAL)

Supabase is now the **single source of truth** the product builds on. The
database layer, security model, auth flow and a reusable service layer are
in place; the site keeps working against the local data layer until real
project keys are added, then the same UI reads/writes the database.
**Full details: `database/README.md`.**

### What exists

| Piece | Where | Notes |
|---|---|---|
| Canonical schema — 14 tables | `database/schema.sql` | admin_profiles, clients, client_permissions, client_functions, drive_connections, media, indexing_jobs, blogs, service_categories/packages/sections/items, marketing_services, admin_activity_logs |
| Face-embedding table | `database/002_face_embeddings.sql` | pgvector; **dimension declared once** (128 = face-api.js) — set by the chosen model, never guessed; DB trigger rejects videos; photos only |
| RLS + policies | `database/rls.sql` | RLS on **every** table; public anon read = published blogs + active services/marketing only; client domain + logs admin-only; `is_admin()` helper |
| Idempotent seed | `database/seed.sql` | the real rate card (8 packages → categories/sections/items) + 3 real marketing services; **no fake clients/blogs/media** |
| Single Supabase client | `assets/js/lib/supabase.js` | the only `createClient`; env-driven; "not configured" mode degrades gracefully |
| Env contract | `.env.example` + `.env.local` + `assets/js/env.local.js` | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` only; **service-role key never in frontend env** |
| Service layer | `assets/js/services/` | auth, clients, permissions, functions (+drive), blogs, packages, marketing, media/indexing interfaces, dashboard counters, activity logs — UI never writes Supabase queries |
| Secure client access | `supabase/functions/validate-client-access/` | edge function (service role): code → payment received → active → allow_client_access → **minimal** dashboard payload; never a client list |

### How it behaves

- **Auth:** Supabase Auth owns admin identities (`admin_profiles`, no
  password columns anywhere). `/admin` → dashboard; unauthenticated hits to
  `/admin/{dashboard,clients,blogs,services,settings}` redirect to `/admin`.
  The `markipie`/`website` pair remains only a local-development fallback
  while Supabase is unconfigured.
- **Remote-first services with local fallback:** with no keys, everything
  works exactly as before (this workspace's mode); with keys, the same UI
  is database-driven. Frontend design untouched.
- **Dashboard counters (6):** Total Clients · Active Clients · Total Blogs ·
  **Published Blogs** · Connected Drives · Indexed Photos — always real
  stored values, 0 when empty.
- **Validation before every DB call; human-readable errors** ("This record
  already exists." for duplicate codes/slugs) — raw SQL never reaches users.
- **Forward flexibility:** `clients.access_code_hash` + `access_code_active`
  allow hashed-token codes later without schema change.

### Apply order

`schema.sql` → set the model dimension in `002_face_embeddings.sql` →
`rls.sql` → `seed.sql` → deploy the edge function. Details and the security
model summary live in `database/README.md`.

## Premium client gallery + watermark + download control (Phase 11)

The complete client-facing media experience — still zero schema changes,
Drive stays invisible, everything builds on the canonical tables.

### Session & security (Parts 16, 25–27, 37)

- **Client session**: entering a valid code creates a session-token
  (`sessionStorage`, never localStorage) — `MKGallery.validateSession()`
  gates every gallery render, and the `client-gallery` / `media-download`
  edge functions re-verify the code + full permission set server-side on
  every request.
- **Direct-URL protection**: opening `/client/gallery/?fid=…` without a
  session shows **ACCESS REQUIRED** and returns to `/client-access` — no
  media is ever rendered from a bare link; sign-out (Exit session) clears
  the state immediately.
- **Server-mediated downloads**: `media-download` authorizes before
  returning the resource — client valid + active + paid + access on +
  download on (+ video access for videos), media owned by that client.
  No credentials or internal ids are exposed; UI shows
  "Preparing download…" → "Download started".

### Experience (Parts 1–9, 12, 17–23, 32–36, 38–39)

- Header: Markipie brand · event title + function name · optional date ·
  **animated stat counters** (N Photos · N Videos).
- Compact event navigation (HALDI · MEHENDI · WEDDING …) with the active
  event highlighted, plus ← **ALL EVENTS** back to the dashboard and an
  Exit-session control.
- ALL / PHOTOS / VIDEOS filters with real counts, smooth no-reload swaps,
  horizontally scrollable on mobile.
- Editorial masonry (4/3/2 columns, natural aspect ratios), lazy +
  thumbnail-first loading, fade·rise·blur-to-sharp reveal (staggered,
  `prefers-reduced-motion` respected), desktop hover veil with VIEW.
- Fullscreen viewer: next/prev/close/keyboard/**counter**/**zoom** (button,
  double-tap, pinch, pan, +/− keys; swipe disabled while zoomed), native
  in-Markipie video playback, safe-area-aware mobile controls.
- Markipie-logo watermark (tiled on tiles, corner mark in the viewer,
  contrast drop-shadow) strictly per `show_watermark`; originals in Drive
  are never touched.
- Elegant skeletons, per-item retry, premium empty state
  ("Your memories are being prepared.") — clients never see technical
  details.
- Windowed rendering (`MAX_TILES` + top-refill) keeps the DOM small for
  10k+ photo galleries; caching is plain browser caching — nothing
  private persists after sign-out.

### Admin controls (Parts 29–31)

Watermark / Download / Video Access switches in ADMIN → CLIENT →
PERMISSIONS take effect on the client's next request — no hardcoded
frontend state.

## AI face indexing + face search (Phase 12)

The deferred-list face AI, now real — **free and open-source only**:
face-api.js on TensorFlow.js runs entirely in the visitor's browser.
No paid AI service, no external AI calls, models vendored locally
(`assets/vendor/face-api/` 1.7.13 classic bundle — injected with a
`<script>` tag, it cannot be `import()`ed — and `assets/models/`:
TinyFaceDetector + 68-point landmarks + 128-d recognition, 6.8 MB).

### Privacy contract (enforced in code, not just policy)

- **Live camera only.** `getUserMedia` is the only input on
  `/find-your-photos/` — no upload, file-picker or drag-drop exists.
- **Camera frames never leave the device.** The only thing produced is
  an in-memory 128-number descriptor, for the lifetime of the scan.
  Nothing about a face is ever uploaded or stored as an image.
- **Photos only.** Videos are never face-indexed (UI filter, engine
  contract, media ownership checks, and the canonical DB trigger all
  enforce it independently).
- **Scoped by construction.** Every search matches against one
  client's own embeddings only; without a validated session nothing
  private is searched, and results render inside Markipie with the
  official watermark — never Drive UI, never a redirect.
- **Permission-gated.** Indexing and search only run when the studio
  enables AI Face Search for that client (`allow_ai_face_search` →
  `aiSearch`); the dashboard banner and scan page degrade gracefully
  when it is off.

### Pipeline

- **Indexing** (client gallery, background): PHOTOS ONLY, starts after
  the gallery settles (3.5 s), batched photo-by-photo, **resumable**
  (progress + descriptors persist per function; failures retry on the
  next run), backs off while the tab is hidden or a gallery video is
  loading/playing — the viewing experience always wins.
- **Local/demo mode:** descriptors live in the on-device store with
  the canonical embedding shape (`faceidx_v1`); matched media is
  resolved through the local data layer.
- **Configured mode (Supabase):** descriptors stream in ≤200-item
  batches to the canonical `face_embeddings` table through the new
  secure `face-embeddings` edge function — the FULL gate (code active
  + payment + status + client access + AI search) is re-checked on
  every call, rows are strictly scoped to the code's own client, and
  re-indexing a photo replaces its rows. No schema changes: the
  canonical 128-d migration from Phase 9 is used as-is; in-function
  cosine/L2 matching now, pgvector `ivfflat` documented as the
  scale-up path.

### Scan experience (`/find-your-photos/`)

Enable Camera → live preview with a **real** FACE DETECTED indicator
(throttled on-device detection, honest: it stays hidden without a
face) → Scan → descriptor → scoped match → results: event-grouped
match cards + a watermarked results grid linking into the client
gallery. Honest states throughout: no clear face · no matches yet
(scoped: "as the studio's photo matching finishes") · unscoped
(client-code CTA — private galleries are never searched) · camera
denied / missing / unsupported · engine failure. Client-safe wording
everywhere — no Drive, Supabase, API or database terms.

### Demo fixtures

9 generated portraits (`f-01…f-09`) fold into the `demo_test_wedding`
folder slots (folder counts unchanged): 6 shots of one guest +
3 different people, so a face scan returns exactly the same-person
matches (verified distances: same 0.08–0.23, distractors 0.75–0.90,
threshold 0.5). Verified by `work/test/verify_phase12.py` (69 checks:
engine privacy contract, page/bridge/edge-function security, demo
set, live-scan e2e with a real in-browser face, anon-leak checks).

## Hardening (Phase 13)

Security consolidation across every public surface — no visual
changes, no schema changes to existing tables, canonical additions
only.

### Rate limiting (brute-force protection)

New canonical migration `database/004_rate_limits.sql` — the
`access_rate_limits` table (fixed-window counters per route+IP,
service-role only: RLS enabled with **no policies**, revoked from
anon/authenticated). Every public endpoint now funnels through
`rateLimit()` in `supabase/functions/_shared/drive.ts`:

| endpoint | limit |
|---|---|
| `validate-client-access` | 8 attempts/min per IP |
| `client-gallery` | 60/min |
| `media-download` | 20/min |
| `face-embeddings` search / upload | 30/min · 10/min |
| `drive-oauth-start` | 10/min |

429 responses are neutral and the code-validation UI keeps its exact
"Invalid or inactive client code." message — throttling never
reveals which codes exist. The limiter **fails open** so it can
never take an endpoint down.

### Connection writes moved behind an admin edge function

Browsers no longer write `drive_connections` at all — the previous
configured-mode paths (save folder / disconnect in `driveService`,
get/set in `functionService`) silently depended on client session
state and were blocked by RLS whenever it lapsed. They now go
through the new `drive-conn-admin` edge function
(`requireAdmin` re-checked on every call): ops `save` /
`disconnect` / `get` / `set`, status whitelist, disconnect keeps the
mark-not-delete rule, admin actions are logged, and tokens are never
selected or returned.

### OAuth consent flow

`drive-oauth-callback` no longer dead-ends in a redirect: the
state nonce is **validated server-side** (recent — 15 min — bound
to the right function, single-use with replay denied), and the
popup finishes with a minimal page that posts the
`mk-drive-auth-done` handshake the admin picker already awaited and
closes itself (graceful fallback if the opener is gone).

### Page-level protections

All 12 private pages (admin, client dashboard/gallery, face scan)
carry `robots noindex` + `referrer no-referrer`; `robots.txt`
disallows the private areas; the callback page adds
`Cache-Control: no-store`. Verified by
`work/test/verify_phase13.py` (43 checks: migration + helper + 5
endpoint wirings, connection-write invariants, OAuth handshake and
state validation, meta/robots serving, and a local-mode e2e
confirming Drive, client-access and face flows are unaffected).

## Google Drive integration · media sync · gallery foundation (Phase 10)

Real Drive connection, metadata-only media sync and the Markipie client
gallery — built **directly on the canonical Phase 9 tables** (additive
columns only, `database/003_drive_sync.sql`). No new schema, no renames.

### Architecture

```
GOOGLE DRIVE = original media source (never copied, never shown to clients)
SUPABASE     = metadata + permissions (canonical tables)
MARKIPIE     = the gallery experience — clients never see Drive
```

| Piece | Where | Notes |
|---|---|---|
| OAuth start / callback | `supabase/functions/drive-oauth-*` | Server-side code exchange; `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` are edge secrets; refresh tokens stored **AES-GCM encrypted** in `drive_connections`; read-only Drive scope; browser never sees a token |
| Folder picker | `supabase/functions/drive-folder-picker` + admin modal | Admin browses My Drive › … and **explicitly** picks each function's folder (no name guessing) |
| Sync engine | `supabase/functions/drive-sync` (+ local simulated Drive) | Metadata-only upserts into `media` on `UNIQUE(client_function_id, drive_file_id)` — repeat syncs **update**, never duplicate; files gone from Drive are **marked removed, not deleted**; page-by-page resumable progress ("N / M files · %", photos / videos / skipped / errors) |
| Drive panel (per function) | `assets/js/services/driveService.js` → Admin → Client → Function → Drive & Sync | NOT CONNECTED / CONNECTED / SYNCING / SYNCED / ERROR · folder, id, account, last synced, total files · Connect / Sync Now / Disconnect (confirm; media retained) · sync history (Added / Updated / Removed / Skipped / Errors) · media counters · AI button shows exactly: "AI photo indexing will be available after media synchronization is complete." |
| Client gallery | `assets/js/page-client-gallery.js` | Editorial masonry (4/3/2 columns), lazy thumbnails, infinite pages, ALL/PHOTOS/VIDEOS chips with real counts, fullscreen viewer (next/prev/swipe/keyboard), **native in-Markipie video player** — clients are never sent to Drive |
| Secure gallery data | `supabase/functions/client-gallery` | Re-verifies code → payment received → active → allow_client_access → function ownership + active status on **every** request; returns only that function's available media, minimal fields, no Drive file ids |

### Behaviour & safety

- Classification is MIME-based: jpeg/png/webp/heic → photo, mp4/webm/quicktime →
  video; anything else is **skipped safely** and never enters the gallery.
- `show_watermark` / `allow_download` / `allow_video_access` are honoured
  everywhere (viewer download is app-level and the UI states a website
  cannot prevent screenshots).
- Friendly errors: expired authorization, inaccessible/missing folder,
  network — with Retry via Sync Now.
- Demo Drive (used while Supabase is unconfigured): My Drive › Wedding ›
  **Test Wedding** (client code `TW2026`) — Mehendi folder syncs exactly the
  Part-32 fixture: **10 photos + 3 videos, 2 unsupported files skipped**;
  real demo clips play locally from `assets/demo-media/`.
- No AI indexing, no payment gateway, no Supabase Storage uploads — tables
  stay metadata-only.

## Real client management · payment · Drive · photo-AI indexing (Phase 7)

Architecture + frontend for the real client flow. No real Drive connection, no production
scan — the next phase connects a small test gallery.

**Core flow:** Add Client → details + secure code → Confirm Payment Received → activate →
connect Drive folder → sub-folders map to functions → photos AI-indexed (batched, resumable)
→ client gallery live. Videos are never AI-processed; they stream gallery-only.

- **Codes:** `MP-<INITIALS>-<YEAR>-<4 chars>` (ambiguous chars excluded), generated live,
  regenerable, never hardcoded, never shipped in frontend source. Validation is generic —
  the site never reveals which codes exist ("Invalid or inactive client code.").
- **Payment gate:** galleries open only when status = Active AND payment = Received.
  Suspended/archived/inactive cut access instantly.
- **Drive (metadata only):** folder ID/URL, connection status, last synced, sync status.
  Media stays in Google Drive and is served inside Markipie — never Drive UI, never
  copied into Supabase.
- **Photo indexing:** MIME split (image/* → PHOTO, video/* → VIDEO). Batched jobs
  (process · faces · embeddings · mark indexed) live in the store, so the admin can leave
  and return; dashboard shows Total/Processed/Faces/Pending/Failed, status pill, gradient
  progress, "Indexing your photos… N / M photos processed", Retry Failed.
- **Face index:** per-photo records (client_id, function_id, drive_file_id, face_count,
  processing_status) — pgvector-shaped; search stub until the real vector store connects.
  Live-camera scan stays upload-free; face search is permission-gated and client-scoped.
- **Permissions per client:** Watermark (default ON, presentation-only), Download
  (app-level; cannot prevent screenshots), AI Face Search, Videos — honoured across the
  dashboard, galleries and the scan page.
- **Admin:** client overview (payment/client/drive/photos + WM·DL·AI badges), full client
  page (Access, Permissions, Details, Drive, Photo Indexing, Functions CRUD, Activity,
  Danger zone), dashboard "Payments Pending" stat. Mobile-first throughout.
- **Supabase prep:** `database/schema.sql` — admins, clients, client_functions,
  client_permissions, drive_connections, media, indexing_jobs, face_embeddings
  (vector(128) + ivfflat), client_events; RLS summary. Metadata only, never binaries.

Suites: `work/test/verify_phase7_admin.py` (106) · `verify_phase7_e2e.py` (39) — plus all
prior suites green (44/30/15/28).

## Visual upgrade (motion system)

- **Palette**: blue (primary) · green (secondary) · pink (creative) · purple (premium) ·
  coral (highlight) · gold (accent) over white/off-white, with deep-navy dark surfaces.
- **Background field**: four ultra-slow blurred gradient blobs (64–86s loops) fixed behind
  every page; hero adds floating gradient shapes. Mobile keeps only the lightest layers.
- **Reveal system**: `.reveal` variants — fade-up, `rv-left`, `rv-right`, `rv-scale`,
  `rv-blur` (blur-to-sharp), `rv-img` (image-reveal mask) — with intelligent grouping and
  staggered delays (services/dashboard cards animate in sequence).
- **Counters**: 1000+ / 7+ / 12 count up when scrolled into view (About + Home).
- **Page transitions**: internal links get a 210ms fade-slide exit; pages enter with a
  420ms fade+rise+scale. `pageshow` restores back/forward cache visits.
- **Micro-interactions**: nav glow + multicolour active underline, button shine sweep,
  gradient card borders on hover, gallery shimmer sweep, icon movements, input focus glow.
- **Scroll progress**: 3px blue→purple→pink bar tracking page position.
- **AI stage**: rotating conic ring, colour-cycling scan line, rising particles, glowing
  corners, FACE DETECTED indicator chip.
- All motion is transform/opacity-based (GPU-friendly), reduced on mobile, and fully
  disabled under `prefers-reduced-motion` (blobs, particles, shapes, counters snap to final).

---

## View the site

```bash
cd markipie-intro
python3 -m http.server 8080 --bind 0.0.0.0
# open http://localhost:8080
```

The animated intro plays on the Home page (once per browser session — reload with the session cleared, or run
`MarkipieIntro.play({oncePerSession:false})` in the console to see it again). `demo.html` is the original
self-contained Phase 1 intro demo, regenerated by `tools/build.py`.

---

## Production readiness pass (Phase 14)

Final polish sweep — no features, no schema, verified by
`work/test/verify_phase14.py` (40 checks):

- **Accessibility**: heading order fixed on every page (marketing and
  dashboard card titles, contact/client-access/veil section headings are
  now real `h2`s with dual CSS selectors so visuals are byte-identical);
  the admin Drive link input has an accessible name. Automated sweep
  across 12 pages: lang · viewport · image alts · accessible names ·
  input labels · heading order — all green.
- **Social meta**: `og:title` / `og:description` / `og:type` on all 8
  public pages, reusing the existing meta copy verbatim (nothing new is
  claimed); domain-dependent tags (`og:url`, `og:image`) are documented
  as deploy-time additions.
- **robots.txt honesty**: no `Sitemap:` line until a production domain
  exists (a sitemap's `<loc>` entries must be absolute — shipping a fake
  one would 404).
- **Weight budget documented**: home HTML 14 KB · CSS 103 KB · 292 KB JS
  across lazy modules · 40 KB demo clips · ~70 KB average posters ·
  face engine + models load only on the pages that use them.
- **Deploy checklist** (see the next section): security headers with a
  ready CSP, compression/caching, edge-function secrets, post-deploy
  smoke list.

## Production deployment checklist (Phase 14)

The static dev server is for development only. When deploying behind a real
host (nginx / Cloudflare / Netlify / Vercel), set:

- **Security headers**
  - `Content-Security-Policy`: `default-src 'self'; img-src 'self' https://lh3.googleusercontent.com data:; media-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'`
    (the one `'unsafe-inline'` is the intro/preview inline styles; the only
    third-party connect targets are the Supabase project and, in the admin
    Drive picker, Google — widen `img-src` only if Drive thumbnails are served
    through the app).
  - `X-Content-Type-Options: nosniff` · `Referrer-Policy: no-referrer`
    (also set per-page via meta) · `Permissions-Policy: camera=(self),
    geolocation=(), microphone=()` — camera is required by the face scan.
  - `Strict-Transport-Security` once HTTPS is on.
- **Compression + caching**: brotli/gzip for HTML/CSS/JS/JSON/SVG
  (site.css ≈ 103 KB raw), long-lived immutable caching for
  `/assets/` — except `/assets/models/` and `/assets/vendor/face-api/`
  which should stay cacheable-but-versioned (6.8 MB + 1.3 MB, loaded
  lazily only on pages that use the face engine).
- **Sitemap**: add `Sitemap: https://<your-domain>/sitemap.xml` to
  `robots.txt` and generate the file with absolute `<loc>` URLs once the
  domain exists (public pages only — private areas stay noindex).
- **Edge function secrets**: `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID/SECRET/
  REDIRECT_URI`, `ALLOWED_ORIGIN` (never frontend env), and deploy all
  functions listed in `database/README.md`.
- **Smoke after deploy**: client code login, gallery render + watermark,
  face scan on HTTPS (camera requires a secure context), admin Drive
  picker round-trip.

Weight budget as shipped: home HTML 14 KB · CSS 103 KB · JS 292 KB total
across lazily-loaded modules · demo clips 40 KB each · posters ~70 KB avg.

---

## Routes

### Public website (`assets/css/site.css`, `assets/js/site.js` shared shell)

| Route | Page |
|---|---|
| `/` | Home — hero + previews of every section |
| `/about/` | Studio story, 1000+ weddings, 7+ years, 12 machines, colour lab, team |
| `/services/` | Wedding / Engagement & Events / Pre-Wedding rate card (8 packages) |
| `/gallery/` | Masonry grid + fullscreen lightbox (placeholder frames until real photos) |
| `/client-access/` | AI Scan entry + client code entry |
| `/client-access/ai-scan/` | **Live-camera-only** AI Scan interface |
| `/client/?id=…` | Private client gallery (validated, never indexed) |
| `/blogs/` · `/blogs/article/?slug=…` | Blog listing + article (IMAGE → TITLE → DATE → TEXT → GALLERY → TEXT) |
| `/marketing/` | Social Media Management · Video Editing · Graphic Design rate card |
| `/contact/` | Info placeholders + validated form (supports `?package=` / `?service=` prefill) |

Navigation (single source of truth: `NAV` in `assets/js/site.js`):
HOME · ABOUT · SERVICES · GALLERY · CLIENT ACCESS · BLOGS · MARKETING · CONTACT

**Hidden admin entry:** small lock icon in the footer's bottom corner → `/admin/`.

### Admin panel (separate layout: `admin/assets/admin.css`, `admin/assets/admin.js`)

| Route | Page |
|---|---|
| `/admin/` | Login (show/hide password, validation, loading + invalid-credentials states) |
| `/admin/dashboard/` | Live counts + quick actions |
| `/admin/blogs/` · `/admin/blogs/editor/` | Blog management + rich-text editor (headings, bold, italic, links, images; cover; additional images; Publish / Draft / Delete / Edit) |
| `/admin/clients/` · `/admin/clients/add/` · `/admin/clients/client/?id=…` | Client access management (add, edit, enable/disable, delete, copy code, code generator) |
| `/admin/settings/` | Studio contact details (used once the backend connects) |

**Demo credentials (local phase only):** username `admin` · password `markipie2026`.
The login check uses a SHA-256 hash of `admin|markipie2026` in `admin/assets/admin-data.js` —
the plain password never appears in code. Replace `MarkipieData.auth.login` with a real
server call in the backend phase.

**Demo client codes (admin data store only — never in public code):**
- `ADI2026` → ADI WEDS SHIVANGI · Haldi / Mehendi (245 photos · 18 videos) / Wedding / Reception
- `RP2026` → RAHUL WEDS PRIYA · same four functions

Disable a client in `/admin/clients/` and their code stops working instantly.

---

## Client Access flow (Phase 5)

```
/client-access → enter code → validate (data store; generic errors)
   → /client/?id=…  EVENT DASHBOARD  (title e.g. ADI WEDS SHIVANGI · Wedding · 2026)
        → function cards (admin-created: Haldi, Mehendi, Wedding, Reception…)
             name · date · cover · photo/video counts · VIEW GALLERY
        → [Find Your Photos]  (face scan scoped to this client's events)
   → /client/gallery/?fid=…  photos + videos rendered inside Markipie
```

- Functions come **only** from the Admin Panel — nothing is hardcoded.
- The gallery never redirects to Google Drive and shows no Drive UI/branding;
  Drive is abstracted behind `MarkipieData.media` (thumbnail/src fields).
- **Markipie watermark**: subtle white-wordmark corner overlay on gallery tiles
  (repeated diagonal pattern) and in the fullscreen viewer — presentation layer only,
  originals in Drive are never modified. Assets: `assets/markipie-wordmark-white.svg`,
  `assets/markipie-wm-tile.svg`.
- **Downloads**: per-function permission stored (`none | photos | all`); the viewer
  shows a download action only when permitted and explains it is a placeholder until
  storage connects. Enforced server-side in the final phase.

---

## Data layer — `assets/js/data.js`

Every method returns a Promise, so swapping the localStorage adapter for `fetch('/api/…')` later
requires no page changes:

```js
MarkipieData.blogs.list({ includeDrafts }) / .get(slug) / .create(data) / .update(id, patch) / .remove(id)
MarkipieData.clients.list() / .get(id) / .getPublic(id) / .create(data) / .update(id, patch) / .remove(id)
MarkipieData.clients.validate(code)          // → { ok:true, clientId } | { ok:false } — never reveals codes
MarkipieData.clients.generateCode(name)
MarkipieData.functions.forClient(clientId, {admin}) / .get(fid) / .create / .update / .remove
                                             // public views carry NO Drive folder data
MarkipieData.media.listByFunction(fid, {page}) // paged media metadata; media.setSource(driveAdapter) plugs in later
MarkipieData.faceIndex.search(descriptor, {clientId}) // pgvector-backed later; scoped to allowed galleries
MarkipieData.settings.get() / .save(patch)
MarkipieData.packages.list() / .categories() // static config now, admin-managed later
MarkipieData.marketing.list()
```

- Blogs published in the admin appear on `/blogs` **immediately** — no code edits.
- Functions added in the admin appear in the client's dashboard **immediately**.
- `getPublic()` (clients) and `publicFn()` (functions) strip codes, Drive folders/ids
  and storage locations; `publicMedia()` strips `drive_file_id`.
- Blog content is stored as blocks (`h2 | h3 | p | img`) — clean for a future database/CMS.
- Client codes and Drive folder URLs are only ever written by the **admin** bundle
  (`admin/assets/admin-data.js` — includes `MarkipieData.drive.parseFolderId`).

---

## AI Face Scan — architecture

Engine target: **face-api.js on TensorFlow.js** (free, open-source, fully in-browser —
live video → detection → landmarks → 128-D descriptors → recognition). No paid AI API.

`assets/js/face-engine.js` is the adapter (`MarkipieFace.loadModels / detect / describe / search`);
it currently ships as a documented stub, so the scan UI, all 8 states (permission → ready →
detected → scanning → searching → matches / no-match / camera error) and the results UI are
complete. Wiring the model weights into `loadModels()` activates the real engine without
touching page code.

Pipeline (matching `database/schema.sql`):
- **Indexing (future, admin):** Drive photo → temporary in-memory processing → face
  detection → embedding → store `face_embeddings (client_id, function_id, drive_file_id,
  face_embedding vector(128), face_count, processing_status)` → temp image deleted.
  Originals remain untouched in Google Drive.
- **Search (user):** live camera → query embedding → pgvector cosine search scoped to the
  galleries the user may access → matched Drive file ids → rendered with the Markipie
  watermark. **The camera image is never uploaded or stored.**
- Global scans (no client context) can never open private galleries — no unrestricted access.

## Supabase target schema

`database/schema.sql` — clients · client_functions · media_metadata · face_embeddings
(pgvector + ivfflat index) + RLS summary. **Metadata only:** photos, videos and camera
images are never stored in Supabase. The localStorage records in `assets/js/data.js`
use identical shapes, so migration is a straight copy.

## AI Scan (foundation only)

`/client-access/ai-scan/` uses `navigator.mediaDevices.getUserMedia()` — **live camera only**.
There is deliberately no upload / file-picker / gallery path. Permission-denied, no-camera and
unsupported-browser states are handled; the stream is stopped on page leave and nothing is recorded.
The actual face-matching engine arrives in a later phase (the Scan button currently simulates analysis).

## Security architecture (ready for the backend)

- Hiding the admin lock is **not** the security model — `Admin.requireAuth()` gates every admin page
  and is designed to be replaced by server-side session enforcement.
- No admin password in plain text (hash only), codes not in the public bundle, storage URLs never
  exposed via `getPublic()`.
- Toasts/modals instead of `alert()`; all forms validated front-end with backend delivery as the
  next step.

## Structure

```
markipie-intro/
├── index.html                  Home (intro overlay + site + Find Your Photos section)
├── demo.html                   Phase-1 self-contained intro demo (tools/build.py)
├── about/ services/ gallery/ marketing/ contact/
├── client-access/              two entry methods (+ ai-scan/ → redirects to find-your-photos)
├── find-your-photos/           AI face scan — live camera only
├── client/                     private event dashboard (+ gallery/ per function; noindex)
├── blogs/  (+ article/)
├── admin/  (+ dashboard/ blogs/ blogs/editor/ clients/ clients/add/ clients/client/ settings/)
├── assets/  css/site.css · js/{data,site,face-engine,page-*}.js · wordmark + watermark SVGs
├── admin/assets/  admin.css · admin.js · admin-data.js   (admin-only bundle: codes, Drive refs)
├── database/schema.sql         Supabase target schema (pgvector)
├── intro/                      Phase-1 animated intro (unchanged)
└── tools/                      build.py + generators (intro assets + demo.html)
```

## Not built yet (by design)

Google Drive integration & the Drive media source adapter · server authentication ·
enforced download permissions · message/OTP delivery · payments · package management
in the admin · final studio content.

The Phase 1 intro (`intro/`, `MarkipieIntro.play({root:'#mk-intro', siteSelector:'#site'})`) is untouched.


## Visual Upgrade
- Replaced placeholder photography blocks with editorial photography imagery.
- Added richer hero imagery, story imagery, service imagery and marketing imagery.
- Added hover zoom, parallax-style card motion, section reveal motion and animated gradients.
- Preserved Supabase integration, Edge Functions, admin/client routes and `.env.local`.
- Run locally with `npm start`.
"# mark-pie" 
