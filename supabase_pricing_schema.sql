-- Pricing Engine Tables

-- 1. Products (문종)
create table if not exists price_products (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  product_type text not null, -- 1S_MANUAL, FIX, 3T_MANUAL ...
  title text,
  base_height_mm int default 2400,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Variants (도장 옵션)
create table if not exists price_variants (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  product_id uuid references price_products(id) on delete cascade,
  coating text not null, -- FLUORO, ANOD
  coating_label text,
  created_at timestamptz default now()
);

-- 3. Size Prices (규격별 단가)
create table if not exists price_size_prices (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  variant_id uuid references price_variants(id) on delete cascade,
  width_mm int not null,
  height_mm int not null,
  glass_group text not null, -- CLEAR_BRONZE_AQUA, SATIN, WIRE_MESH
  price numeric not null,
  created_at timestamptz default now()
);

-- 4. Addons (옵션/자재/부속)
create table if not exists price_addons (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  category text, -- RULE, HARDWARE, MATERIALS ...
  code text not null,
  label text,
  unit text, -- ea, set, once, per_200mm
  price numeric default 0,
  meta jsonb default '{}', -- ranges for sliding hardware etc
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. Estimates (견적 저장)
create table if not exists estimates (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  customer_name text,
  customer_phone text,
  customer_address text,
  input jsonb, -- raw pricing input
  normalized jsonb, -- calculated final specs (width, height, size_fixed)
  breakdown jsonb, -- base_price, addons_total, items array
  total_price numeric,
  status text default 'DRAFT',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies (Simple for now, can be restricted later)
alter table price_products enable row level security;
alter table price_variants enable row level security;
alter table price_size_prices enable row level security;
alter table price_addons enable row level security;
alter table estimates enable row level security;

drop policy if exists "Enable read access for all users" on price_products;
drop policy if exists "Enable read access for all users" on price_variants;
drop policy if exists "Enable read access for all users" on price_size_prices;
drop policy if exists "Enable read access for all users" on price_addons;
drop policy if exists "Enable all access for estimates" on estimates;

create policy "Enable read access for all users" on price_products for select using (true);
create policy "Enable read access for all users" on price_variants for select using (true);
create policy "Enable read access for all users" on price_size_prices for select using (true);
create policy "Enable read access for all users" on price_addons for select using (true);
create policy "Enable all access for estimates" on estimates for all using (true);

-- Unique Indexes for UPSERT support
create unique index if not exists idx_price_products_unique on price_products (company_id, product_type);
create unique index if not exists idx_price_variants_unique on price_variants (company_id, product_id, coating);
create unique index if not exists idx_price_size_prices_unique on price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group);
create unique index if not exists idx_price_addons_unique on price_addons (company_id, category, code);

-- Updated_at Trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_price_products_updated_at before update on price_products for each row execute procedure update_updated_at_column();
create trigger update_price_variants_updated_at before update on price_variants for each row execute procedure update_updated_at_column();
create trigger update_price_size_prices_updated_at before update on price_size_prices for each row execute procedure update_updated_at_column();
create trigger update_price_addons_updated_at before update on price_addons for each row execute procedure update_updated_at_column();
create trigger update_estimates_updated_at before update on estimates for each row execute procedure update_updated_at_column();

