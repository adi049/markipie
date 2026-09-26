-- ============================================================
-- MARKIPIE — SEED (Phase 9)
-- ------------------------------------------------------------
-- Seeds ONLY the real, already-provided rate card and marketing
-- services. NO fake clients, NO fake blog posts, NO fake media.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING, so it can be
-- re-run safely and will never duplicate existing entries.
-- ============================================================

-- ---------- service categories ----------
insert into public.service_categories (id, name, slug, sort_order, is_active) values
  ('a1000000-0000-4000-8000-000000000001', 'Wedding Packages',    'wedding',    1, true),
  ('a1000000-0000-4000-8000-000000000002', 'Engagement & Events', 'engagement', 2, true),
  ('a1000000-0000-4000-8000-000000000003', 'Pre-Wedding',         'prewedding', 3, true)
on conflict (id) do nothing;

-- ---------- packages ----------
insert into public.service_packages
  (id, category_id, title, subtitle, description, price, currency, price_label, sort_order, is_active) values
  -- wedding
  ('b0000000-0000-4000-8000-000000000065', 'a1000000-0000-4000-8000-000000000001', 'Single-Side Wedding Package', 'Single-Side Photography', null, 65000,  'INR', null, 1, true),
  ('b0000000-0000-4000-8000-000000000090', 'a1000000-0000-4000-8000-000000000001', 'Single-Side Wedding Package — Extended', 'Single-Side Photography', null, 90000,  'INR', null, 2, true),
  ('b0000000-0000-4000-8000-000000000120', 'a1000000-0000-4000-8000-000000000001', 'Both-Side Wedding Package', 'Both-Side Photography', null, 120000, 'INR', null, 3, true),
  ('b0000000-0000-4000-8000-000000000185', 'a1000000-0000-4000-8000-000000000001', 'Premium Both-Side Wedding Package', 'Premium Wedding Package', null, 185000, 'INR', null, 4, true),
  -- engagement
  ('b0000000-0000-4000-8000-000000000015', 'a1000000-0000-4000-8000-000000000002', 'Engagement Photography — Up to 100 Gathering', 'Engagement Photography', null, 15000, 'INR', 'With Album — ₹18,000/- only', 1, true),
  ('b0000000-0000-4000-8000-000000000035', 'a1000000-0000-4000-8000-000000000002', 'Engagement / Birthday Package', 'Engagement / Birthday', 'Up to 125–200 Gathering', 35000, 'INR', null, 2, true),
  -- pre-wedding
  ('b0000000-0000-4000-8000-000000000045', 'a1000000-0000-4000-8000-000000000003', 'Pre-Wedding — Package A', 'Pre-Wedding', 'Paid Location — Delhi NCR', 45000, 'INR', null, 1, true),
  ('b0000000-0000-4000-8000-000000000025', 'a1000000-0000-4000-8000-000000000003', 'Pre-Wedding — Package B', 'Pre-Wedding', 'Paid Location — Delhi NCR', 25000, 'INR', null, 2, true)
on conflict (id) do nothing;

-- ---------- sections + items (deterministic uuids need uuid-ossp) ----------
create extension if not exists "uuid-ossp";

-- helper writes one section with its items, idempotently
create or replace function private_seed_section(p_package uuid, p_type text, p_title text, p_sort int, p_items text[])
returns void language sql as $$
  with s as (
    insert into public.service_package_sections (id, package_id, section_type, title, sort_order)
    values (uuid_generate_v5(p_package, p_type || ':' || p_title), p_package, p_type, p_title, p_sort)
    on conflict (id) do nothing
    returning id
  )
  insert into public.service_package_items (id, section_id, item_text, sort_order)
  select uuid_generate_v5(s.id, it), s.id, it, ord
  from s, unnest(p_items) with ordinality as u(it, ord)
  where not exists (
    select 1 from public.service_package_items x where x.section_id = s.id
  );
$$;

select private_seed_section('b0000000-0000-4000-8000-000000000065', 'coverage', 'Haldi-Mehndi', 1,
  array['1 Photographer', '1 Videographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000065', 'coverage', 'Wedding', 2,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000065', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '1 Album — 50 Sheet — 12x36 Glossy', '250 Album Edited Photos']);
select private_seed_section('b0000000-0000-4000-8000-000000000065', 'complimentary', 'Complimentary', 1,
  array['16x24 Big Size Frame', 'AI Face Recognition', 'Album Selection Tool']);

select private_seed_section('b0000000-0000-4000-8000-000000000090', 'coverage', 'Engagement', 1,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000090', 'coverage', 'Haldi-Mehndi', 2,
  array['1 Photographer', '1 Videographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000090', 'coverage', 'Wedding', 3,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000090', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '1 Album — 60 Sheet — 12x36 Glossy', '350 Album Edited Photos']);
select private_seed_section('b0000000-0000-4000-8000-000000000090', 'complimentary', 'Complimentary', 1,
  array['16x24 Big Size Frame — 2 Nos', 'AI Face Recognition', 'Album Selection Tool']);

select private_seed_section('b0000000-0000-4000-8000-000000000120', 'coverage', 'Engagement', 1,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000120', 'coverage', 'Haldi-Mehndi', 2,
  array['1 Photographer', '1 Videographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000120', 'coverage', 'Wedding', 3,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000120', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '1 Album — 50 Sheet — 12x36 Glossy — Each Side', '300 Album Edited Photos — Each Side']);
select private_seed_section('b0000000-0000-4000-8000-000000000120', 'complimentary', 'Complimentary', 1,
  array['16x24 Big Size Frame — 2 Nos', 'AI Face Recognition', 'Album Selection Tool']);

select private_seed_section('b0000000-0000-4000-8000-000000000185', 'coverage', 'Engagement', 1,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000185', 'coverage', 'Haldi-Mehndi', 2,
  array['1 Photographer', '1 Videographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000185', 'coverage', 'Wedding', 3,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer', '1 Drone']);
select private_seed_section('b0000000-0000-4000-8000-000000000185', 'coverage', 'Reception', 4,
  array['1 Photographer', '1 Videographer', '1 Cinematographer', '1 Candid', '1 Drone']);
select private_seed_section('b0000000-0000-4000-8000-000000000185', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reels', 'Long Edited Videos',
        '2 Albums — 40 Sheet — 12x36 Glossy — Each Side', 'Total 400 Album Edited Photos — Each Side']);
select private_seed_section('b0000000-0000-4000-8000-000000000185', 'complimentary', 'Complimentary', 1,
  array['16x24 Big Size Frame — 2 Nos', 'AI Face Recognition', 'Album Selection Tool']);

select private_seed_section('b0000000-0000-4000-8000-000000000015', 'coverage', 'Include', 1,
  array['1 Cinematographer', '1 Candid']);
select private_seed_section('b0000000-0000-4000-8000-000000000015', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel', 'Long Edited Video']);
select private_seed_section('b0000000-0000-4000-8000-000000000015', 'complimentary', 'Complimentary', 1,
  array['16x24 Frame']);

select private_seed_section('b0000000-0000-4000-8000-000000000035', 'coverage', 'Include', 1,
  array['1 Photographer', '1 Videographer', '1 Candid', '1 Cinematographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000035', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel', 'Long Edited Video',
        '1 Album — 30 Sheet — 12x36 Glossy', '150 Album Edited Photos']);
select private_seed_section('b0000000-0000-4000-8000-000000000035', 'complimentary', 'Complimentary', 1,
  array['16x24 Big Size Frame', 'AI Face Recognition', 'Album Selection Tool']);

select private_seed_section('b0000000-0000-4000-8000-000000000045', 'coverage', 'Include', 1,
  array['1 Cinematographer', '1 Candid Photographer', '1 Drone']);
select private_seed_section('b0000000-0000-4000-8000-000000000045', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel',
        '1 Album — 20 Sheet — 12x36 Glossy', '100 Album Edited Photos']);
select private_seed_section('b0000000-0000-4000-8000-000000000045', 'complimentary', 'Complimentary', 1,
  array['16x24 Frame', '1 Magazine Style Album — 15 Pages']);

select private_seed_section('b0000000-0000-4000-8000-000000000025', 'coverage', 'Include', 1,
  array['1 Cinematographer', '1 Candid Photographer']);
select private_seed_section('b0000000-0000-4000-8000-000000000025', 'deliverables', 'Deliverables', 1,
  array['Unlimited Raw Photos', 'Teaser Cinematic Video', 'Short Video or Reel',
        '1 Album — 15 Sheet — 12x36 Glossy', '75 Album Edited Photos']);
select private_seed_section('b0000000-0000-4000-8000-000000000025', 'complimentary', 'Complimentary', 1,
  array['16x24 Frame', '1 Magazine Style Album — 10 Pages']);

drop function private_seed_section(uuid, text, text, int, text[]);

-- ---------- marketing services (real, already-provided info) ----------
insert into public.marketing_services
  (id, title, slug, description, starting_price, currency, icon_name, is_active, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'Social Media Management', 'social-media-management',
   'End-to-end handling of your social presence — planning, shoots, edits and posting. Starting at ₹15,000/month.',
   15000, 'INR', 'share', true, 1),
  ('c0000000-0000-4000-8000-000000000002', 'Video Editing', 'video-editing',
   'Sharp, cinematic edits for every screen — from quick reels to full wedding films. Starting at ₹1,500.',
   1500, 'INR', 'video', true, 2),
  ('c0000000-0000-4000-8000-000000000003', 'Graphic Design', 'graphic-design',
   'Clean, on-brand creatives that make your posts, print and campaigns stand out. Starting at ₹700.',
   700, 'INR', 'pen', true, 3)
on conflict (id) do nothing;
