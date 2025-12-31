-- Fix Delete/Update Permissions
-- Run this in Supabase SQL Editor

-- 1. Enable UPDATE for Anon/Public (Development Mode)
-- Dropping existing restrictive policies if any
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."sc_schedules";

CREATE POLICY "Enable update for all users" ON "public"."sc_schedules"
FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Force Cancel the Broken Record (Optional Backup Plan)
-- This manually hides the record with the missing customer info
UPDATE public.sc_schedules
SET status = 'cancelled', memo = 'SQL 강제 삭제 처리됨 (고객정보 불일치)'
WHERE customer_id NOT IN (SELECT id FROM public.crm_customers);

-- 3. Verify
SELECT id, status, memo FROM public.sc_schedules WHERE status = 'cancelled';
