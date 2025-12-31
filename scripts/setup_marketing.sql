-- scripts/setup_marketing.sql

-- 1. Marketing Assets Table
CREATE TABLE IF NOT EXISTS public.marketing_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('logo', 'product', 'banner', 'video', 'font', 'etc')),
    file_url TEXT NOT NULL,
    tags TEXT, -- Comma separated tags
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for all" ON public.marketing_assets FOR ALL USING (true) WITH CHECK (true);

-- Index for searching
CREATE INDEX IF NOT EXISTS idx_marketing_assets_category ON public.marketing_assets(category);
