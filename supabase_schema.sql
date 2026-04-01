-- ============================================================
-- TractorXchange — Supabase SQL Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. TRACTORS
create table if not exists tractors (
  id            uuid primary key default gen_random_uuid(),
  make          text not null,
  model         text not null,
  year          int,
  hours_used    text,
  engine_hp     int,
  condition     text check (condition in ('Excellent','Good','Fair','Poor')) default 'Good',
  status        text check (status in ('Available','Pending','Sold')) default 'Available',
  expected_price bigint,
  location_text text,
  latitude      numeric,
  longitude     numeric,
  description   text,
  cover_photo   text,
  share_token   text unique default substring(replace(gen_random_uuid()::text,'-',''),1,10),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. TRACTOR DOCUMENTS
create table if not exists tractor_documents (
  id          uuid primary key default gen_random_uuid(),
  tractor_id  uuid references tractors(id) on delete cascade,
  name        text not null,
  file_url    text not null,
  file_type   text,
  file_size   bigint,
  created_at  timestamptz default now()
);

-- 3. TRACTOR PHOTOS (multiple)
create table if not exists tractor_photos (
  id          uuid primary key default gen_random_uuid(),
  tractor_id  uuid references tractors(id) on delete cascade,
  photo_url   text not null,
  is_cover    boolean default false,
  created_at  timestamptz default now()
);

-- 4. BROKERS
create table if not exists brokers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  whatsapp    text,
  email       text,
  location    text,
  speciality  text,
  is_active   boolean default true,
  notes       text,
  created_at  timestamptz default now()
);

-- 5. TRACTOR ↔ BROKER (many-to-many: who can buy this tractor)
create table if not exists tractor_brokers (
  tractor_id  uuid references tractors(id) on delete cascade,
  broker_id   uuid references brokers(id) on delete cascade,
  primary key (tractor_id, broker_id)
);

-- 6. DEALERS
create table if not exists dealers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_person text,
  phone         text,
  whatsapp      text,
  email         text,
  city          text,
  state         text,
  brands        text,
  is_active     boolean default true,
  notes         text,
  created_at    timestamptz default now()
);

-- ── Indexes ────────────────────────────────────────────────
create index if not exists idx_tractors_status on tractors(status);
create index if not exists idx_tractors_share_token on tractors(share_token);
create index if not exists idx_tractor_docs_tractor on tractor_documents(tractor_id);
create index if not exists idx_tractor_photos_tractor on tractor_photos(tractor_id);
create index if not exists idx_tractor_brokers_tractor on tractor_brokers(tractor_id);

-- ── Updated_at trigger ─────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tractors_updated_at before update on tractors
  for each row execute function update_updated_at();

-- ── Row Level Security ─────────────────────────────────────
alter table tractors         enable row level security;
alter table tractor_documents enable row level security;
alter table tractor_photos   enable row level security;
alter table brokers          enable row level security;
alter table tractor_brokers  enable row level security;
alter table dealers          enable row level security;

-- Public can read tractors (for marketplace)
create policy "Public can read available tractors"
  on tractors for select using (status != 'Sold');

-- Public can read photos and docs of available tractors
create policy "Public can read tractor photos"
  on tractor_photos for select using (true);

-- Authenticated users (internal team) can do everything
create policy "Auth full access tractors"
  on tractors for all using (auth.role() = 'authenticated');
create policy "Auth full access docs"
  on tractor_documents for all using (auth.role() = 'authenticated');
create policy "Auth full access photos"
  on tractor_photos for all using (auth.role() = 'authenticated');
create policy "Auth full access brokers"
  on brokers for all using (auth.role() = 'authenticated');
create policy "Auth full access tractor_brokers"
  on tractor_brokers for all using (auth.role() = 'authenticated');
create policy "Auth full access dealers"
  on dealers for all using (auth.role() = 'authenticated');

-- ── Storage bucket (run after enabling Storage in Dashboard) ──
-- insert into storage.buckets (id, name, public)
-- values ('tractor-files', 'tractor-files', true);
