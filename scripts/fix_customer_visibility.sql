-- Force fix RLS for Customer Visibility
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is enabled (or disabled then enabled to reset)
alter table public.crm_customers enable row level security;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Allow all access to crm_customers" on public.crm_customers;
drop policy if exists "Enable read access for all users" on public.crm_customers;
drop policy if exists "Enable insert for all users" on public.crm_customers;
drop policy if exists "Enable update for all users" on public.crm_customers;

-- 3. Create a comprehensive policy for ALL operations (Select, Insert, Update, Delete)
create policy "Allow all access to crm_customers"
on public.crm_customers
for all
using (true)
with check (true);

-- 4. Do the same for Schedules just in case
alter table public.sc_schedules enable row level security;
drop policy if exists "Allow all access to sc_schedules" on public.sc_schedules;

create policy "Allow all access to sc_schedules"
on public.sc_schedules
for all
using (true)
with check (true);

-- 5. Grant permissions to anon and authenticated roles (Explicitly)
grant usage on schema public to anon, authenticated;
grant all on public.crm_customers to anon, authenticated;
grant all on public.sc_schedules to anon, authenticated;

-- Confirmation
select count(*) as customer_count from public.crm_customers;
