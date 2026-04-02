-- ============================================================
-- TractorXchange — RUN THIS in Supabase SQL Editor
-- Adds all new columns needed for the latest features
-- ============================================================

-- New columns for tractors table
alter table tractors add column if not exists rc_number text;
alter table tractors add column if not exists serial_number text;
alter table tractors add column if not exists exchange_date date;
alter table tractors add column if not exists sold_at timestamptz;
alter table tractors add column if not exists area_office text;

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

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists enquiries_updated_at on enquiries;
create trigger enquiries_updated_at before update on enquiries
  for each row execute function update_updated_at();

alter table enquiries enable row level security;

drop policy if exists "Auth full access enquiries" on enquiries;
create policy "Auth full access enquiries"
  on enquiries for all using (auth.role() = 'authenticated');
