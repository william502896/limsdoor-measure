-- Add measurement_id column referencing measurements table
ALTER TABLE public.sc_purchase_orders 
ADD COLUMN IF NOT EXISTS measurement_id UUID REFERENCES public.measurements(id);

-- Make schedule_id nullable to allow POs directly from measurements
ALTER TABLE public.sc_purchase_orders 
ALTER COLUMN schedule_id DROP NOT NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
