-- Add options JSONB column for flexible configuration (Consult Type, Payment Options, etc.)
ALTER TABLE public.marketing_landing_pages
ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '{}'::jsonb;

-- Comment
COMMENT ON COLUMN public.marketing_landing_pages.options IS 'Stores flexible config like consult_type, payment_options';
