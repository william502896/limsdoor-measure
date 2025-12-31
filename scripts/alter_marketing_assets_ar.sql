-- scripts/alter_marketing_assets_ar.sql

-- 1. Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_assets' AND column_name = 'metadata') THEN
        ALTER TABLE public.marketing_assets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Update Category Check Constraint to include 'ar_door'
-- We cannot easily modify a check constraint in place, so we drop and re-add it.
ALTER TABLE public.marketing_assets DROP CONSTRAINT IF EXISTS marketing_assets_category_check;

ALTER TABLE public.marketing_assets ADD CONSTRAINT marketing_assets_category_check 
    CHECK (category IN ('logo', 'product', 'banner', 'video', 'font', 'ar_door', 'etc'));
