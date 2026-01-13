-- Add missing columns to measurements table
ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS door_type text,
ADD COLUMN IF NOT EXISTS open_direction text,
ADD COLUMN IF NOT EXISTS door_detail jsonb,
ADD COLUMN IF NOT EXISTS pricing_json jsonb,
ADD COLUMN IF NOT EXISTS options_json jsonb,
ADD COLUMN IF NOT EXISTS extras_json jsonb,
ADD COLUMN IF NOT EXISTS trust_check jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS memo text,
ADD COLUMN IF NOT EXISTS total_price integer,
ADD COLUMN IF NOT EXISTS material_price integer,
ADD COLUMN IF NOT EXISTS install_price integer,
ADD COLUMN IF NOT EXISTS install_date text,
ADD COLUMN IF NOT EXISTS install_time text,
ADD COLUMN IF NOT EXISTS contract_status text,
ADD COLUMN IF NOT EXISTS deposit_amount integer,
ADD COLUMN IF NOT EXISTS deposit_paid_date timestamptz,
ADD COLUMN IF NOT EXISTS balance_amount integer,
ADD COLUMN IF NOT EXISTS balance_paid_date timestamptz,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'UNPAID',
ADD COLUMN IF NOT EXISTS contract_date date;

ALTER TABLE public.measurements ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.measurements ALTER COLUMN detail DROP NOT NULL;
ALTER TABLE public.measurements ALTER COLUMN glass DROP NOT NULL;
ALTER TABLE public.measurements ALTER COLUMN design DROP NOT NULL;

-- Force schema cache reload (optional but good practice)
NOTIFY pgrst, 'reload schema';
