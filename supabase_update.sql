-- ============================================================
-- TractorXchange — UPDATE SQL
-- Run this in Supabase SQL Editor to add new features
-- (Only needed if you already ran the original schema)
-- ============================================================

-- Enquiries table
create table if not exists enquiries (
  id              uuid primary key default gen_random_uuid(),
  tractor_id      uuid references tractors(id) on delete set null,
  source          text check (source in ('broker', 'dealer', 'manual')) default 'manual',
  broker_id       uuid references brokers(id) on delete set null,
  dealer_id       uuid references dealers(id) on delete set null,
  buyer_name      text not null,
  buyer_phone     text,
  buyer_whatsapp  text,
  buyer_location  text,
  offered_price   bigint,
  status          text check (status in ('New','Negotiating','Sold','Lost')) default 'New',
  notes           text,
  sold_at         timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_enquiries_tractor on enquiries(tractor_id);
create index if not exists idx_enquiries_status on enquiries(status);

create trigger enquiries_updated_at before update on enquiries
  for each row execute function update_updated_at();

alter table enquiries enable row level security;

create policy "Auth full access enquiries"
  on enquiries for all using (auth.role() = 'authenticated');
