-- ============================================================
-- Markipie — Phase 10: Drive sync support columns (ADDITIVE ONLY)
-- ------------------------------------------------------------
-- The canonical Phase 9 architecture is unchanged: no tables are
-- renamed, dropped or replaced. These columns are the minimum
-- additions the Drive integration spec requires that the canonical
-- tables have nowhere to store:
--
--   · drive_connections.folder_name        — friendly picker name
--   · drive_connections.total_files        — files in last completed sync
--   · drive_connections.last_sync_summary  — sync history (Part 22):
--       { added, updated, removed, skipped, errors, photos, videos, total }
--   · drive_connections.oauth_email        — which Google account
--   · drive_connections.oauth_refresh_*    — ENCRYPTED refresh token
--       (AES-GCM at rest, key = ENCRYPTION_KEY edge secret; the
--       token NEVER leaves the server)
--   · media.available / removed_at / last_seen_at / sync_batch_id /
--     last_error — removal marking without destroying records
--       (Part 8: preserve sync history, nothing is deleted
--       immediately; Part 20: disconnect keeps media)
--
-- RLS continues to apply unchanged: media and drive_connections
-- remain admin/server-only.
-- ============================================================

alter table public.drive_connections
  add column if not exists folder_name text;
alter table public.drive_connections
  add column if not exists total_files integer not null default 0;
alter table public.drive_connections
  add column if not exists last_sync_summary jsonb;
alter table public.drive_connections
  add column if not exists oauth_email text;
alter table public.drive_connections
  add column if not exists oauth_refresh_token_enc text;
alter table public.drive_connections
  add column if not exists oauth_scope text;

alter table public.media
  add column if not exists available boolean not null default true;
alter table public.media
  add column if not exists removed_at timestamptz;
alter table public.media
  add column if not exists last_seen_at timestamptz;
alter table public.media
  add column if not exists sync_batch_id uuid;
alter table public.media
  add column if not exists last_error text;

-- Gallery queries always filter by function + availability.
create index if not exists idx_media_function_available
  on public.media (client_function_id, available);

-- last_synced_at participates in admin sorting; keep it indexed.
create index if not exists idx_drive_connections_last_sync
  on public.drive_connections (last_synced_at desc);
