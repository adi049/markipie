-- ============================================================
-- MARKIPIE — FACE EMBEDDINGS (Phase 9, applied AFTER schema.sql)
-- ============================================================
-- !! SET THE DIMENSION TO MATCH THE CHOSEN FACE MODEL !!
-- The embedding dimension is NOT guessed: the production face
-- recognition model decides it. The current project plan is
-- face-api.js (TensorFlow.js), whose descriptor is 128-d — so the
-- default below is 128. If a different model is chosen before
-- production indexing, change the single DIMENSION constant below
-- and re-apply this file BEFORE any embeddings are written.
--
-- Do NOT generate fake embeddings. This table stays empty until
-- Phase 12 implements real face indexing.
-- ============================================================

-- DIMENSION (single source of truth for this migration)
do $$
declare
  dimension constant int := 128;  -- face-api.js = 128 · update ONLY here, consistently
begin
  execute format($f$
    create table if not exists public.face_embeddings (
      id                 uuid primary key default gen_random_uuid(),
      media_id           uuid not null references public.media(id) on delete cascade,
      client_id          uuid not null references public.clients(id) on delete cascade,
      client_function_id uuid not null references public.client_functions(id) on delete cascade,
      embedding          vector(%s) not null,
      face_index         integer not null default 0,
      created_at         timestamptz not null default now()
    );
  $f$, dimension);
end $$;

create index if not exists idx_embeddings_media   on public.face_embeddings (media_id);
create index if not exists idx_embeddings_client  on public.face_embeddings (client_id);
create index if not exists idx_embeddings_function on public.face_embeddings (client_function_id);

-- ONLY PHOTO media may have face embeddings. Videos are NEVER
-- embedded — enforced at the database level, not just the app.
create or replace function public.guard_face_embedding_media()
returns trigger language plpgsql as $$
declare
  mt text;
begin
  select m.media_type into mt from public.media m where m.id = new.media_id;
  if mt is distinct from 'photo' then
    raise exception 'face_embeddings: only photo media can be embedded (got "%")', coalesce(mt, 'unknown');
  end if;
  return new;
end $$;

drop trigger if exists trg_face_embedding_media on public.face_embeddings;
create trigger trg_face_embedding_media
  before insert or update on public.face_embeddings
  for each row execute function public.guard_face_embedding_media();

-- ------------------------------------------------------------
-- Vector similarity index — create AFTER the dimension is final
-- and rows exist (ivfflat needs rows to build lists). Template:
--
-- set maintenance_work_mem = '500MB';
-- create index on public.face_embeddings
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);
--
-- (Always search with the SAME opclass, e.g.
--   order by embedding <=> $1  — cosine distance.)
-- ------------------------------------------------------------
