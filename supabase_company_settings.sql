CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  ceo_name text,
  business_number text,
  address text,
  phone text,
  email text,
  homepage_url text,
  shop_url text,
  youtube_url text,
  tiktok_url text,
  instagram_url text,
  threads_url text,
  facebook_url text,
  google_photos_url text,
  kakao_chat_url text,
  kakao_channel_id text,
  portfolio_url text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (though valid only if policies exist, good practice)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything (if needed for client), but we primarily use Service Role for now.
-- We can add specific RLS later if we move to client-side fetching.
-- For 1-Person Mode, we trust the API to handle auth.
