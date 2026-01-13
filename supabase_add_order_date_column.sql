-- Add order_date column to sc_purchase_orders if it doesn't exist
ALTER TABLE public.sc_purchase_orders 
ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT NOW();

-- Add vat_amount column as well since frontend sends it commented out but useful
ALTER TABLE public.sc_purchase_orders 
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12, 2) DEFAULT 0;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
