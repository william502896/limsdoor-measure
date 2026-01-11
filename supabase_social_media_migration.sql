-- supabase_social_media_migration.sql
-- Adds missing columns to 'companies' table for Onboarding Flow

BEGIN;

-- 1. Contact & Info
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS fax TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS kakao_id TEXT;  -- Using 'kakao_id' to match route.ts

-- 2. Branding & Links
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS homepage_url TEXT; -- Singular URL
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS shopping_url TEXT; -- Singular URL

-- 3. Social Media
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- 4. Security (Simple Master Password for Tier 1 Admin)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS master_password TEXT DEFAULT '0000';

COMMIT;
