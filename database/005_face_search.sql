-- ============================================================
-- MARKIPIE — FACE SEARCH RPC + FUNCTION-LEVEL AI (Phase 12 spec)
-- Applied AFTER schema.sql, 002_face_embeddings.sql, rls.sql,
-- 003_drive_sync.sql, 004_rate_limits.sql. Minimum additions only:
--   1. pgvector extension (for in-database similarity search)
--   2. client_functions.ai_face_search  (function-level AI toggle;
--      effective permission = client ON  AND  function ON — a
--      client-level OFF always overrides a function-level ON)
--   3. match_face_embeddings() — the ONE secure matching path.
-- No tables are redesigned; the canonical face_embeddings table is
-- used as-is (128-d — the face-api.js recognition model's actual
-- output size, verified in Phase 12).
-- ============================================================

create extension if not exists vector;

-- ------------------------------------------------------------
-- Function-level AI control (minimum required addition)
-- ------------------------------------------------------------
alter table public.client_functions
  add column if not exists ai_face_search boolean not null default true;

comment on column public.client_functions.ai_face_search is
  'Phase 12: function-level AI face search toggle. Effective permission = client_permissions.allow_ai_face_search AND client_functions.ai_face_search.';

-- ------------------------------------------------------------
-- SECURE VECTOR MATCH RPC
-- ------------------------------------------------------------
-- The ONLY database path for face matching. Callable by the
-- service role (the gated face-embeddings edge function) — never
-- by browsers:
--   revoke from anon/authenticated; RLS on face_embeddings also
--   denies non-admin reads, so the browser cannot reach raw rows
--   or embeddings through any path.
--
-- SECURITY DEFINER is required to compute similarity without the
-- caller reading the table; it is safe ONLY because the scope is
-- a hard parameter: rows are filtered to ONE authorized client
-- (and, when supplied, one function), photos only, active +
-- AI-enabled functions only. Returns media_id, client_function_id
-- and similarity — never an embedding.
--
-- Similarity = 1 - L2 distance (face-api.js descriptors are matched
-- with euclidean distance; 1 - distance keeps the same ranking and
-- the same FACE_MATCH_THRESHOLD semantics, expressed as 0..1).
-- ------------------------------------------------------------

create or replace function public.match_face_embeddings(
  query_embedding     vector(128),
  authorized_client_id uuid,
  optional_function_id uuid default null,
  match_threshold      float8 default 0.5,
  match_count          integer default 60
)
returns table (
  media_id            uuid,
  client_function_id  uuid,
  similarity          float8
)
language sql
security definer
set search_path = public
stable
as $$
  select
    fe.media_id,
    fe.client_function_id,
    round((1 - (fe.embedding <-> query_embedding))::numeric, 4)::float8 as similarity
  from public.face_embeddings fe
  join public.media m
    on m.id = fe.media_id
   and m.media_type = 'photo'          -- videos are never searchable
   and m.available = true
  join public.client_functions cf
    on cf.id = fe.client_function_id
   and cf.status = 'active'
   and cf.ai_face_search = true        -- function-level AI gate
  where fe.client_id = authorized_client_id
    and (optional_function_id is null or fe.client_function_id = optional_function_id)
    and (fe.embedding <-> query_embedding) <= match_threshold
  order by fe.embedding <-> query_embedding
  limit least(greatest(match_count, 1), 500);
$$;

revoke all on function public.match_face_embeddings(vector(128), uuid, uuid, float8, integer)
  from public, anon, authenticated;
grant execute on function public.match_face_embeddings(vector(128), uuid, uuid, float8, integer)
  to service_role;

comment on function public.match_face_embeddings is
  'Phase 12: secure face matching. Scope is a hard parameter (single authorized client, optional function, photos only, AI-enabled + active functions). Returns media_id/client_function_id/similarity only — never embeddings. Executed by the gated face-embeddings edge function via the service role; browsers have no execute grant.';
