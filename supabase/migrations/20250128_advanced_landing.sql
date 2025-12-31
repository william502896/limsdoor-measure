-- Add mode and image array columns for AI Landing Builder
ALTER TABLE public.marketing_landing_pages
ADD COLUMN IF NOT EXISTS landing_mode text DEFAULT 'LEAD', -- LEAD | CONSULT | CLOSE
ADD COLUMN IF NOT EXISTS hero_image_url text, -- AI Generated Hero
ADD COLUMN IF NOT EXISTS icon_image_urls text[], -- AI Generated Icons (Array)
ADD COLUMN IF NOT EXISTS section_image_urls text[]; -- AI Generated Section Images (Array)

-- Add comment
COMMENT ON COLUMN public.marketing_landing_pages.landing_mode IS 'LEAD=신규유입, CONSULT=상담전환, CLOSE=결제유도';
