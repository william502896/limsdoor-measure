-- Add customer_message column to measurements table
ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS customer_message text;
