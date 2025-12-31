-- 1. Items Table (Standard Definitions)
create table if not exists public.items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text, -- e.g., '도어', '중문', '하드웨어'
    unit text default 'ea', -- 'ea', 'set', 'box'
    standard_price numeric default 0, -- Base reference price (optional)
    created_at timestamptz default now()
);

-- 2. Price Rules Table (Partner Specific)
create table if not exists public.price_rules (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid references public.partners(id) on delete cascade,
    item_id uuid references public.items(id) on delete cascade,
    
    purchase_price numeric default 0, -- 매입가 (Cost)
    sales_price numeric default 0,    -- 판매가 (Price)
    margin_rate numeric generated always as (
        case when sales_price > 0 then 
            round(((sales_price - purchase_price) / sales_price * 100), 2)
        else 0 end
    ) stored,
    
    status text default 'draft', -- 'draft', 'confirmed', 'archived'
    start_date timestamptz default now(),
    end_date timestamptz,
    
    created_at timestamptz default now(),
    unique(partner_id, item_id, status) -- Basic constraint to prevent duplicate active rules logic (simplified)
);

-- 3. Price Releases (Versioning History)
create table if not exists public.price_releases (
    id uuid primary key default gen_random_uuid(),
    version_name text not null, -- e.g., 'v2024.05.20'
    release_notes text,
    released_by uuid references auth.users(id),
    released_at timestamptz default now()
);

-- RLS
alter table public.items enable row level security;
alter table public.price_rules enable row level security;
alter table public.price_releases enable row level security;

-- Policies (Permissive for Admin/Service Role)
create policy "Allow all for items" on public.items for all using (true) with check (true);
create policy "Allow all for price_rules" on public.price_rules for all using (true) with check (true);
create policy "Allow all for price_releases" on public.price_releases for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_price_rules_partner on public.price_rules(partner_id);
create index if not exists idx_price_rules_item on public.price_rules(item_id);

-- Seed some initial items if empty
insert into public.items (name, category, unit, standard_price)
select '프리미엄 3연동', '중문', 'set', 450000
where not exists (select 1 from public.items where name = '프리미엄 3연동');

insert into public.items (name, category, unit, standard_price)
select '스윙 도어', '중문', 'set', 550000
where not exists (select 1 from public.items where name = '스윙 도어');

insert into public.items (name, category, unit, standard_price)
select '디지털 도어락 (S)', '하드웨어', 'ea', 120000
where not exists (select 1 from public.items where name = '디지털 도어락 (S)');
