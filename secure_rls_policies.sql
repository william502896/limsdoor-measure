-- 1. Create 'measurements' table strict schema
CREATE TABLE IF NOT EXISTS public.measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- We include these columns in CREATE mostly for fresh installs
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  customer_name text,
  customer_phone text,
  width_mm int,
  height_mm int,
  photos text[], 
  status text DEFAULT 'submitted',
  created_at timestamptz DEFAULT now()
);

-- 1.5. Ensure 'company_id' exists (Migration for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'measurements' AND column_name = 'company_id') THEN
        ALTER TABLE public.measurements 
        ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
        
        -- If existing rows exist, they will have null company_id. 
        -- In a strict system, we might want to delete them or default them.
        -- For now, we allow null temporarily but enforce NOT NULL for new inserts via Policy.
    END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- First DROP existing policies to allow re-run/update
DROP POLICY IF EXISTS "Users can view own company measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can insert for own company" ON public.measurements;
DROP POLICY IF EXISTS "Users can update own company measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete own company measurements" ON public.measurements;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT company_id FROM public."프로필" WHERE id = auth.uid() LIMIT 1;
$$;

-- SELECT Policy
CREATE POLICY "Users can view own company measurements" ON public.measurements
FOR SELECT
USING (
  company_id = public.get_my_company_id()
);

-- INSERT Policy
CREATE POLICY "Users can insert for own company" ON public.measurements
FOR INSERT
WITH CHECK (
  company_id = public.get_my_company_id()
);

-- UPDATE Policy
CREATE POLICY "Users can update own company measurements" ON public.measurements
FOR UPDATE
USING (
  company_id = public.get_my_company_id()
)
WITH CHECK (
  company_id = public.get_my_company_id()
);

-- DELETE Policy
CREATE POLICY "Users can delete own company measurements" ON public.measurements
FOR DELETE
USING (
  company_id = public.get_my_company_id()
);

-- 4. Service Role Bypass (Explicitly allowed for Admin API if needed, though Service Role usually bypasses RLS by default)
-- But explicit policy is good for clarity if we ever switch to restricted role.
-- (Note: Service Role key bypasses RLS automatically in Supabase, so this is implicit)

-- 5. Indexing for Performance
CREATE INDEX IF NOT EXISTS idx_measurements_company_id ON public.measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON public.measurements(created_at DESC);
