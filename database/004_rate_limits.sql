-- ============================================================
-- MARKIPIE — ACCESS RATE LIMITS (Phase 13, applied AFTER rls.sql)
-- ============================================================
-- Canonical brute-force throttling store for the public edge
-- functions (validate-client-access · client-gallery ·
-- media-download · face-embeddings · drive-oauth-start).
--
-- Fixed-window counter per bucket ('route:ip'). The helper in
-- supabase/functions/_shared/drive.ts (rateLimit) is the only
-- writer; it degrades gracefully (fails open) if this table is
-- unavailable, so the limiter can never take an endpoint down.
--
-- SECURITY: service-role ONLY. RLS is enabled with no policies —
-- anon/authenticated can neither read nor write. Limits never
-- reveal which access codes exist.
-- ============================================================

create table if not exists public.access_rate_limits (
  bucket            text primary key,
  hits              integer    not null default 0,
  window_started_at timestamptz not null default now()
);

alter table public.access_rate_limits enable row level security;

-- no policies: only the service role (edge functions) touches this
-- table. Explicitly revoke from SQL roles too (defence in depth).
revoke all on public.access_rate_limits from anon, authenticated;

comment on table public.access_rate_limits is
  'Phase 13 hardening: fixed-window rate-limit counters for public edge functions. Service-role only (no RLS policies, revoked from anon/authenticated). Written exclusively by supabase/functions/_shared/drive.ts rateLimit().';
