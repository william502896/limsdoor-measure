-- 1. Tenants (Organizations)
create table if not exists public.saas_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'STARTER', -- STARTER | PRO | ENTERPRISE
  is_internal boolean default false,    -- TRUE = LimsDoor HQ, FALSE = External Customer
  
  -- Config
  settings jsonb default '{}'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Users (Linked to Supabase Auth or Standalone)
create table if not exists public.saas_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.saas_tenants(id),
  email text not null,
  role text default 'STAFF', -- OWNER | ADMIN | STAFF
  
  created_at timestamptz default now()
);

-- 3. RLS Policies (Concept Only - Pending Supabase Auth Integration)
-- alter table public.marketing_landing_pages enable row level security;
-- create policy "Tenant Isolation" on public.marketing_landing_pages
--   using (tenant_id = (select tenant_id from public.saas_users where email = auth.email()));

-- 4. Add tenant_id to all major tables
alter table public.marketing_landing_pages add column if not exists tenant_id uuid references public.saas_tenants(id);
alter table public.marketing_assets add column if not exists tenant_id uuid references public.saas_tenants(id);
alter table public.marketing_message_queue add column if not exists tenant_id uuid references public.saas_tenants(id);
alter table public.marketing_lead_scores add column if not exists tenant_id uuid references public.saas_tenants(id);
alter table public.marketing_scenarios add column if not exists tenant_id uuid references public.saas_tenants(id);

-- Indexes for Tenant Isolation
create index if not exists idx_landing_tenant on public.marketing_landing_pages(tenant_id);
create index if not exists idx_leads_tenant on public.marketing_lead_scores(tenant_id);

-- Seed Internal Tenant
insert into public.saas_tenants (name, plan, is_internal)
values ('LimsDoor HQ', 'ENTERPRISE', true);
