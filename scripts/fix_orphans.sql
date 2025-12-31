-- Fix Orphaned Schedules
-- Run this in Supabase SQL Editor

-- 1. Check for mismatched IDs (Debug)
select 
    s.id as schedule_id,
    s.customer_id as orphaned_id,
    c.id as potential_match_id,
    c.name,
    c.phone
from public.sc_schedules s
left join public.crm_customers c on c.name = '윗윗' -- Target specific broken record or remove to make generic
where s.customer_id not in (select id from public.crm_customers);

-- 2. UPDATE: Relink orphaned schedules to the valid customer '윗윗'
-- This assumes the only broken one is '윗윗'. 
-- IF YOU HAVE MULTIPLE, BE CAREFUL.

UPDATE public.sc_schedules
SET customer_id = (SELECT id FROM public.crm_customers WHERE name = '윗윗' LIMIT 1)
WHERE customer_id NOT IN (SELECT id FROM public.crm_customers)
AND (SELECT id FROM public.crm_customers WHERE name = '윗윗' LIMIT 1) IS NOT NULL;

-- 3. Verify Fix
select * from public.sc_schedules where type = 'measure';
