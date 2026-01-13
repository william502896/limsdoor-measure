
-- Enable RLS (if not already)
ALTER TABLE sc_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Allow ALL operations for PUBLIC (incl. anonymous) on sc_schedules
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sc_schedules;
DROP POLICY IF EXISTS "Enable all access for public users" ON sc_schedules;

CREATE POLICY "Enable all access for public users"
ON sc_schedules
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Policy: Allow ALL operations for PUBLIC (incl. anonymous) on sc_purchase_orders
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sc_purchase_orders;
DROP POLICY IF EXISTS "Enable all access for public users" ON sc_purchase_orders;

CREATE POLICY "Enable all access for public users"
ON sc_purchase_orders
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Also ensure crm_customers is writable
ALTER TABLE crm_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON crm_customers;
DROP POLICY IF EXISTS "Enable all access for public users" ON crm_customers;

CREATE POLICY "Enable all access for public users"
ON crm_customers
FOR ALL
TO public
USING (true)
WITH CHECK (true);
