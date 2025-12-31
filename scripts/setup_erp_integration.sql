-- Enable Extensions
create extension if not exists "uuid-ossp";

-- 1. Customers Table (CRM)
create table if not exists public.crm_customers (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    phone text,
    address text,
    memo text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS for Customers
alter table public.crm_customers enable row level security;
drop policy if exists "Allow all access to crm_customers" on public.crm_customers;
create policy "Allow all access to crm_customers"
    on public.crm_customers for all
    using (true)
    with check (true);

-- 2. Schedules Table (Orders/Installations)
create table if not exists public.sc_schedules (
    id uuid primary key default uuid_generate_v4(),
    customer_id uuid references public.crm_customers(id) on delete set null,
    
    -- Schedule Details
    title text, -- e.g. "3연동 중문 시공"
    type text, -- 'measure', 'install', 'reform', 'as'
    status text, -- 'scheduled', 'completed', 'cancelled'
    
    -- Dates
    install_date date,
    
    -- Content / Items
    content text, -- e.g. "3연동, 파티션" (summary)
    items_json jsonb, -- Detailed items array
    
    -- Photos (Crucial for ERP Integration)
    photos jsonb default '[]'::jsonb, -- Array of strings (URLs or Base64)
    
    -- Meta
    memo text, -- Field/Quote Memo
    installer_id uuid, -- Link to user if needed
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Migration for existing tables
alter table public.sc_schedules add column if not exists memo text;

-- RLS for Schedules
alter table public.sc_schedules enable row level security;
drop policy if exists "Allow all access to sc_schedules" on public.sc_schedules;
create policy "Allow all access to sc_schedules"
    on public.sc_schedules for all
    using (true)
    with check (true);

-- Indexes for performance
create index if not exists idx_sc_schedules_customer_id on public.sc_schedules(customer_id);
create index if not exists idx_sc_schedules_install_date on public.sc_schedules(install_date);
