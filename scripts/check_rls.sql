
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('sc_schedules', 'sc_purchase_orders', 'crm_customers');
