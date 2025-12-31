-- Check Data Integrity
-- Run this in Supabase SQL Editor

-- 1. Count Total Rows
select 
    (select count(*) from public.crm_customers) as total_customers,
    (select count(*) from public.sc_schedules) as total_schedules;

-- 2. Check for Orphaned Schedules (Schedules with customer_id that does not exist in crm_customers)
select 
    id as schedule_id, 
    title, 
    customer_id, 
    created_at
from public.sc_schedules
where customer_id is not null 
and customer_id not in (select id from public.crm_customers);

-- 3. Check for recent customers (to see if they were saved at all)
select id, name, phone, created_at from public.crm_customers order by created_at desc limit 5;
