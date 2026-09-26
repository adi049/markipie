-- ============================================================
-- MARKIPIE — CANONICAL SUPABASE SCHEMA (Phase 9)
-- ============================================================
-- This is the single canonical backend model. Do NOT create
-- alternative tables/edges later — future phases build on this.
--
-- Apply order:  1) schema.sql  (this file)
--               2) 002_face_embeddings.sql   (set model dim first)
--               3) rls.sql                   (policies)
--               4) seed.sql                  (real packages/marketing only)
--
-- PRINCIPLES
--   · Metadata only — photo/video binaries stay in Google Drive.
--   · Supabase Auth owns admin identities (no password columns).
--   · Public reads are limited to published blogs + active
--     services/marketing (see rls.sql). Everything else is admin-
--     or service-role only.
--   · Timestamps are database-generated.
-- ============================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- ADMIN (Supabase Auth is the identity source)
-- ============================================================
create table if not exists public.admin_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique,          -- references auth.users(id)
  display_name text not null default 'Admin',
  role         text not null default 'admin'  check (role in ('admin')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_admin_profiles_updated before update on public.admin_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  client_name        text not null,
  event_title        text not null,
  contact_number     text,
  event_date         date,
  access_code        text not null unique,
  -- Forward security (Part 19): model already supports moving from
  -- plaintext codes to hashed/verified tokens without schema change.
  access_code_hash   text,
  access_code_active boolean not null default true,
  payment_status     text not null default 'pending'
                     check (payment_status in ('pending','received')),
  client_status      text not null default 'inactive'
                     check (client_status in ('inactive','active','suspended','archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists uq_clients_access_code on public.clients (access_code);
create index if not exists idx_clients_status  on public.clients (client_status);
create index if not exists idx_clients_payment on public.clients (payment_status);
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

-- ============================================================
-- CLIENT PERMISSIONS  (exactly one row per client)
-- ============================================================
create table if not exists public.client_permissions (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null unique references public.clients(id) on delete cascade,
  allow_client_access  boolean not null default false,
  allow_ai_face_search boolean not null default false,
  allow_download       boolean not null default false,
  show_watermark       boolean not null default true,
  allow_video_access   boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_permissions_updated before update on public.client_permissions
  for each row execute function public.set_updated_at();

-- ============================================================
-- CLIENT FUNCTIONS / EVENTS
-- ============================================================
create table if not exists public.client_functions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  function_name   text not null,
  function_date   date,
  cover_image_url text,
  status          text not null default 'active' check (status in ('active','inactive')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_functions_client on public.client_functions (client_id, sort_order);
create trigger trg_functions_updated before update on public.client_functions
  for each row execute function public.set_updated_at();

-- ============================================================
-- GOOGLE DRIVE CONNECTION METADATA  (per function — metadata only)
-- ============================================================
create table if not exists public.drive_connections (
  id                 uuid primary key default gen_random_uuid(),
  client_function_id uuid not null unique references public.client_functions(id) on delete cascade,
  drive_folder_id    text,
  drive_folder_url   text,
  connection_status  text not null default 'not_connected'
                     check (connection_status in ('not_connected','connected','syncing','synced','error')),
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_drive_updated before update on public.drive_connections
  for each row execute function public.set_updated_at();

-- ============================================================
-- MEDIA METADATA  (binaries stay in Google Drive)
-- ============================================================
create table if not exists public.media (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  client_function_id  uuid not null references public.client_functions(id) on delete cascade,
  drive_file_id       text not null,
  file_name           text,
  mime_type           text,
  media_type          text not null check (media_type in ('photo','video')),
  thumbnail_url       text,
  preview_url         text,
  file_size           bigint,
  processing_status   text not null default 'pending'
                      check (processing_status in ('pending','processing','indexed','failed','skipped')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- no duplicate Drive files within the same function context
create unique index if not exists uq_media_function_drive_file
  on public.media (client_function_id, drive_file_id);
create index if not exists idx_media_client   on public.media (client_id);
create index if not exists idx_media_function on public.media (client_function_id);
create index if not exists idx_media_drive    on public.media (drive_file_id);
create trigger trg_media_updated before update on public.media
  for each row execute function public.set_updated_at();

-- ============================================================
-- INDEXING JOBS  (background photo indexing — later phases)
-- ============================================================
create table if not exists public.indexing_jobs (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  client_function_id uuid references public.client_functions(id) on delete set null,
  status             text not null default 'queued'
                     check (status in ('queued','processing','completed','failed','paused','cancelled')),
  total_files        integer not null default 0,
  processed_files    integer not null default 0,
  faces_found        integer not null default 0,
  failed_files       integer not null default 0,
  started_at         timestamptz,
  completed_at       timestamptz,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_jobs_client on public.indexing_jobs (client_id, created_at desc);
create trigger trg_jobs_updated before update on public.indexing_jobs
  for each row execute function public.set_updated_at();

-- (face_embeddings is created in 002_face_embeddings.sql — the vector
--  dimension must be set there to match the chosen model exactly.)

-- ============================================================
-- BLOGS
-- ============================================================
create table if not exists public.blogs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  cover_image_url text,
  excerpt         text,
  content         jsonb,                      -- blocks: intro/paragraphs/gallery/outro
  status          text not null default 'draft' check (status in ('draft','published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists uq_blogs_slug on public.blogs (slug);
create index if not exists idx_blogs_status on public.blogs (status, published_at desc);
create trigger trg_blogs_updated before update on public.blogs
  for each row execute function public.set_updated_at();

-- ============================================================
-- SERVICES / PACKAGES  (one source of truth for the Services page)
-- ============================================================
create table if not exists public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_service_categories_slug on public.service_categories (slug);
create trigger trg_service_categories_updated before update on public.service_categories
  for each row execute function public.set_updated_at();

create table if not exists public.service_packages (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  title       text not null,
  subtitle    text,
  description text,
  price       numeric(12,2) not null default 0 check (price >= 0),
  currency    text not null default 'INR',
  price_label text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_packages_category on public.service_packages (category_id, sort_order);
create trigger trg_packages_updated before update on public.service_packages
  for each row execute function public.set_updated_at();

create table if not exists public.service_package_sections (
  id           uuid primary key default gen_random_uuid(),
  package_id   uuid not null references public.service_packages(id) on delete cascade,
  section_type text not null check (section_type in ('coverage','deliverables','complimentary')),
  title        text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sections_package on public.service_package_sections (package_id, sort_order);

create table if not exists public.service_package_items (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.service_package_sections(id) on delete cascade,
  item_text  text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_items_section on public.service_package_items (section_id, sort_order);

-- ============================================================
-- MARKETING SERVICES
-- ============================================================
create table if not exists public.marketing_services (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  description    text,
  starting_price numeric(12,2),
  currency       text not null default 'INR',
  icon_name      text,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists uq_marketing_slug on public.marketing_services (slug);
create trigger trg_marketing_updated before update on public.marketing_services
  for each row execute function public.set_updated_at();

-- ============================================================
-- ADMIN ACTIVITY LOG  (no secrets logged)
-- ============================================================
create table if not exists public.admin_activity_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid,                         -- auth user id (nullable for system rows)
  action        text not null,                -- e.g. 'client.created', 'payment.confirmed'
  entity_type   text not null,                -- e.g. 'client' | 'blog' | 'package'
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_activity_admin  on public.admin_activity_logs (admin_user_id, created_at desc);
create index if not exists idx_activity_entity on public.admin_activity_logs (entity_type, entity_id);

-- ============================================================
-- CANONICAL RELATIONSHIPS
--   clients ─┬─ client_permissions (1:1)
--            ├─ client_functions ── drive_connections (1:1)
--            ├─ media ── face_embeddings
--            └─ indexing_jobs
--   service_categories ─ service_packages ─ sections ─ items
-- ============================================================
