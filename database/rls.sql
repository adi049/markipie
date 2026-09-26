-- ============================================================
-- MARKIPIE — ROW LEVEL SECURITY (Phase 9)
-- Apply AFTER schema.sql and 002_face_embeddings.sql.
--
-- Rules:
--   · RLS is ENABLED on every application table.
--   · anon (public) may read ONLY: published blogs + active
--     service categories/packages/sections/items + active
--     marketing services.
--   · admin (authenticated + active admin_profiles row) manages
--     content through the service layer.
--   · clients / permissions / functions / drive / media /
--     embeddings / jobs have NO anon or authenticated-user read:
--     client data leaves the database only through secure
--     server-side flows (Supabase Edge Functions, service role).
--   · Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
-- ============================================================

-- ---------- admin helper (security definer avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
      and p.is_active
  );
$$;

revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- enable RLS everywhere ----------
do $$
declare t text;
begin
  foreach t in array array[
    'admin_profiles','clients','client_permissions','client_functions',
    'drive_connections','media','face_embeddings','indexing_jobs',
    'blogs','service_categories','service_packages','service_package_sections',
    'service_package_items','marketing_services','admin_activity_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ============================================================
-- ADMIN PROFILES
-- ============================================================
drop policy if exists admin_profiles_select on public.admin_profiles;
create policy admin_profiles_select on public.admin_profiles
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists admin_profiles_insert_self on public.admin_profiles;
create policy admin_profiles_insert_self on public.admin_profiles
  for insert with check (user_id = auth.uid());
drop policy if exists admin_profiles_update_admin on public.admin_profiles;
create policy admin_profiles_update_admin on public.admin_profiles
  for update using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- CLIENT DOMAIN — admin manages via service layer; public: none.
-- (Client galleries are served by the secure backend flow.)
-- ============================================================
drop policy if exists clients_admin_all on public.clients;
create policy clients_admin_all on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists permissions_admin_all on public.client_permissions;
create policy permissions_admin_all on public.client_permissions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists functions_admin_all on public.client_functions;
create policy functions_admin_all on public.client_functions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists drive_admin_all on public.drive_connections;
create policy drive_admin_all on public.drive_connections
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists media_admin_all on public.media;
create policy media_admin_all on public.media
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists embeddings_admin_all on public.face_embeddings;
create policy embeddings_admin_all on public.face_embeddings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists jobs_admin_all on public.indexing_jobs;
create policy jobs_admin_all on public.indexing_jobs
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- BLOGS — public reads published only; admin full control
-- ============================================================
drop policy if exists blogs_public_read on public.blogs;
create policy blogs_public_read on public.blogs
  for select using (status = 'published');
drop policy if exists blogs_admin_all on public.blogs;
create policy blogs_admin_all on public.blogs
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- SERVICES / PACKAGES — public reads active only
-- ============================================================
drop policy if exists service_categories_public_read on public.service_categories;
create policy service_categories_public_read on public.service_categories
  for select using (is_active);
drop policy if exists service_categories_admin_all on public.service_categories;
create policy service_categories_admin_all on public.service_categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists service_packages_public_read on public.service_packages;
create policy service_packages_public_read on public.service_packages
  for select using (is_active);
drop policy if exists service_packages_admin_all on public.service_packages;
create policy service_packages_admin_all on public.service_packages
  for all using (public.is_admin()) with check (public.is_admin());

-- sections/items readable only when their package (and its category) is active
drop policy if exists sections_public_read on public.service_package_sections;
create policy sections_public_read on public.service_package_sections
  for select using (
    exists (
      select 1
      from public.service_packages p
      join public.service_categories c on c.id = p.category_id
      where p.id = service_package_sections.package_id
        and p.is_active and c.is_active
    )
  );
drop policy if exists sections_admin_all on public.service_package_sections;
create policy sections_admin_all on public.service_package_sections
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists items_public_read on public.service_package_items;
create policy items_public_read on public.service_package_items
  for select using (
    exists (
      select 1
      from public.service_package_sections s
      join public.service_packages p on p.id = s.package_id
      join public.service_categories c on c.id = p.category_id
      where s.id = service_package_items.section_id
        and p.is_active and c.is_active
    )
  );
drop policy if exists items_admin_all on public.service_package_items;
create policy items_admin_all on public.service_package_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- MARKETING — public reads active only
-- ============================================================
drop policy if exists marketing_public_read on public.marketing_services;
create policy marketing_public_read on public.marketing_services
  for select using (is_active);
drop policy if exists marketing_admin_all on public.marketing_services;
create policy marketing_admin_all on public.marketing_services
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- ACTIVITY LOGS — admin only, never public
-- ============================================================
drop policy if exists activity_admin_insert on public.admin_activity_logs;
create policy activity_admin_insert on public.admin_activity_logs
  for insert with check (public.is_admin());
drop policy if exists activity_admin_select on public.admin_activity_logs;
create policy activity_admin_select on public.admin_activity_logs
  for select using (public.is_admin());

-- ============================================================
-- GRANTS — keep the surface minimal
--   anon/authenticated never get direct access to the service-role
--   tables beyond what the policies above allow.
-- ============================================================
revoke all on public.clients, public.client_permissions, public.client_functions,
  public.drive_connections, public.media, public.face_embeddings,
  public.indexing_jobs, public.admin_activity_logs
  from anon;
