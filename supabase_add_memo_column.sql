-- Add memo column to sc_purchase_orders if it doesn't exist
ALTER TABLE public.sc_purchase_orders 
ADD COLUMN IF NOT EXISTS memo TEXT;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
