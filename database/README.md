# Markipie — Supabase Backend Foundation (Phase 9, CANONICAL)

This is the **canonical backend architecture**. Future phases (10 Drive,
11 Gallery + permissions, 12 AI face indexing, 13 hardening) build **on
these tables, names and services — no alternative schema will be created**.

## Layout

| Path | Purpose |
|---|---|
| `schema.sql` | All canonical tables, constraints, indexes, `updated_at` triggers |
| `002_face_embeddings.sql` | Vector table — **set the model dimension here** (default 128 = face-api.js) |
| `rls.sql` | RLS enablement + policies for every table (`is_admin()` helper) |
| `seed.sql` | Idempotent seed of the **real** rate card + marketing services only |
| `003_drive_sync.sql` | Drive sync columns + retention semantics |
| `004_rate_limits.sql` | Phase 13 hardening — public-endpoint throttle counters (service-role only) |
| `005_face_search.sql` | Phase 12 — pgvector extension, `client_functions.ai_face_search`, `match_face_embeddings` RPC |
| `../supabase/functions/validate-client-access/` | Edge function — the only public path to client data |
| `../assets/js/lib/supabase.js` | **The** single Supabase client (env-driven) |
| `../assets/js/services/` | Service layer — UI never writes Supabase queries |

## Environment

- `.env.local` (gitignored) and `.env.example` hold
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — nothing else goes here.
- **`SUPABASE_SERVICE_ROLE_KEY` must never exist in frontend env.** It is
  used only inside Edge Functions (`SUPABASE_SERVICE_ROLE_KEY` secret).
- For the current static site, values flow through `assets/js/env.js` →
  copy `assets/js/env.local.js.example` → `assets/js/env.local.js` (gitignored).
  When the project gains a Vite build, `import.meta.env.VITE_*` plugs into
  the same names — no other change.

## Apply order (Supabase SQL editor or CLI)

1. `schema.sql`
2. Edit the **DIMENSION** constant in `002_face_embeddings.sql` to match the
   chosen face model (do not guess — the model decides), then run it.
3. `003_drive_sync.sql`
4. `rls.sql`
5. `seed.sql` (safe to re-run; never duplicates)
6. `005_face_search.sql` (Phase 12 — safe to re-run; requires the pgvector
   extension, which the file creates)
7. `004_rate_limits.sql` (Phase 13 — safe to re-run)
8. Deploy the edge functions (`validate-client-access`, `client-gallery`,
   `media-download`, `face-embeddings`, `drive-*`)
   (set the `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` secrets — provided
   automatically by the CLI; optionally set `ALLOWED_ORIGIN`)

### Phase 13 hardening notes

- **Rate limiting** — every public endpoint funnels through
  `rateLimit()` in `_shared/drive.ts`, counted in `access_rate_limits`
  (fixed window per route+IP). Responses stay neutral on 429 so
  limits never reveal which codes exist. The limiter fails open.
- **Connection writes** — browsers never write `drive_connections`
  directly; `drive-conn-admin` (admin-gated) is the only write path.
  This keeps the Drive picker immune to stale/absent admin sessions.
- **OAuth state** — the consent nonce is validated server-side
  (recent + function-bound + single use) and the popup closes itself
  via a postMessage handshake (`mk-drive-auth-done`).

## Security model (summary — full policies in `rls.sql`)

- RLS **enabled on every table**; no table is publicly writable.
- Public anon reads: `blogs(status='published')`, active service
  categories/packages/sections/items, active `marketing_services`.
- `clients`, `client_permissions`, `client_functions`, `drive_connections`,
  `media`, `face_embeddings`, `indexing_jobs`, `admin_activity_logs`:
  **no anon/authenticated reads** — served only by service-role server flows
  or the admin (authenticated + active `admin_profiles` row).
- Client access = single-code validation via the edge function:
  exists → payment received → status active → `allow_client_access`.
  The browser never receives a client list, another client's code,
  raw Drive ids or embeddings.
- Access codes: unique; model carries `access_code_hash` +
  `access_code_active` so hashed/verified tokens can replace plaintext
  without schema change. Support: generate · validate · regenerate · deactivate.

## Authentication

- Supabase Auth owns admin identities (no password columns anywhere).
- `admin_profiles (user_id → auth.users)` carries `role='admin'`, `is_active`.
- Login: `/admin` → `MKServices.auth.login()` → dashboard. Gated routes:
  `/admin/dashboard`, `/admin/clients`, `/admin/blogs`, `/admin/services`,
  `/admin/settings` → redirect to `/admin` when unauthenticated.
- The old `markipie`/`website` pair is a **local-development fallback used
  only while Supabase is unconfigured**; it is not the production mechanism.

## Frontend compatibility

- `MKServices.*` is remote-first with graceful local fallback: with no
  configured Supabase the site and admin keep working exactly as before
  (local data layer); with Supabase configured the same UI reads/writes
  the database. Visual design untouched.
- Dashboard counters (Total Clients, Active Clients, Total Blogs,
  Published Blogs, Connected Drives, Indexed Photos) always reflect real
  stored values — 0 when empty. Nothing invented.
- Seeded content = the already-provided rate card (8 packages with
  coverage/deliverables/complimentary as sections+items) and the 3 real
  marketing services. **No fake clients, blogs or media are seeded.**

## Phase 12 — AI face search (real, live)

- **Engine**: face-api.js / TensorFlow.js, models vendored locally, loaded
  lazily; descriptors are 128-d numbers (never images). Photos only — the
  database trigger rejects video embeddings outright.
- **Matching**: `match_face_embeddings(query_embedding vector(128), ...)` —
  SECURITY DEFINER, service-role only (revoked from public/anon/
  authenticated). The browser never queries `face_embeddings` and never
  receives raw embeddings — only `media_id / client_function_id / similarity`.
- **Authorization**: the RPC takes `authorized_client_id` (resolved from the
  validated access code server-side); the edge function additionally
  re-filters by client status, `allow_client_access`, `allow_ai_face_search`
  (client) and `ai_face_search` (function). Client A can never surface
  Client B's photos.
- **Architecture (unchanged)**: Drive holds the originals; the database
  holds metadata only. Indexing reads the synced media metadata and never
  touches the original files.
- **Indexing**: Drive → sync → `media` → `indexing_jobs` (`queued →
  processing → completed | failed`, `paused | cancelled`) → detect →
  embeddings → media `processing_status` `indexed | skipped | failed`.
  Batches of 10–50 with per-batch progress saves; resumable; duplicate-safe
  (existing rows for a media are replaced, not duplicated).
- **Results copy** never claims accuracy — "Photos we found that may match
  you" / "Photos matching your face". Camera frames are processed in memory
  only and are never uploaded, stored or persisted anywhere (no Storage, no
  Drive, no database, no browser DB).

### Tunable environment (set as Edge Function secrets)

- `FACE_MATCH_THRESHOLD` — minimum similarity to surface a match (default
  **0.5**; each request may pass its own `body.threshold` within 0 < t < 1.2).
- `FACE_MATCH_COUNT` — maximum matches returned (default **60**; each
  request may pass its own `body.count` clamped to 1–500).

### §30 Security checklist (verify after deploy)

1. `face_embeddings` RLS denies anon/authenticated reads/writes (§rls.sql).
2. `match_face_embeddings` revocations: public, anon, authenticated have
   NO EXECUTE; only `service_role`.
3. `face-embeddings` search op: unscoped or invalid access code → neutral
   401/403, never revealing which codes exist.
4. RPC results joined against `media.available = true` + active functions
   only; videos unreachable by construction.
5. Client A's search with Client B's function id returns zero rows
   (authorized_client_id scoping).
6. No embedding bytes ever appear in any API response (similarity only).
7. Camera permission denial / unsupported device degrade gracefully —
   no photo of the person is retained in any store.
8. Function-level `ai_face_search = false` excludes that function from
   results even when the client-level switch is ON.

## Deliberately NOT in this phase (still deferred)

- No payment gateway — `payment_status` is admin-controlled
  (`pending` / `received`).
- OTP / WhatsApp delivery of codes.
- Live Google Drive keys (the sync pipeline is real; keys come at deploy).
