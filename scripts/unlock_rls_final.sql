-- FINAL RLS UNLOCK SCRIPT
-- Run this in Supabase SQL Editor to guarantee access

BEGIN;

-- 1. Customers Table
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON public.crm_customers;
DROP POLICY IF EXISTS "Allow all access to crm_customers" ON public.crm_customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.crm_customers;

CREATE POLICY "Public Access" ON public.crm_customers
FOR ALL USING (true) WITH CHECK (true);

-- 2. Schedules Table
ALTER TABLE public.sc_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON public.sc_schedules;
DROP POLICY IF EXISTS "Allow all access to sc_schedules" ON public.sc_schedules;
DROP POLICY IF EXISTS "Enable update for all users" ON public.sc_schedules;

CREATE POLICY "Public Access" ON public.sc_schedules
FOR ALL USING (true) WITH CHECK (true);

-- 3. Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;

-- Verification
SELECT 'RLS Fixed' as status;
