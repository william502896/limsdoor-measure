create table if not exists public.marketing_landing_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sub_copy text,
  goal_type text not null default 'PDF', -- PDF | RSVP | MEASURE | EVENT
  status text not null default 'DRAFT', -- DRAFT | ACTIVE | INACTIVE
  
  -- CTA Config
  cta_text text,
  cta_action text, -- LINK | DOWNLOAD | SUBMIT
  cta_target_url text,
  collect_name boolean default true,
  collect_phone boolean default true,

  -- Message Config
  connected_message_type text, -- SMS | KAKAO
  connected_template_id text,
  
  -- Assets (Simple JSON array or Relation)
  main_image_url text,
  
  stats jsonb default '{"views": 0, "conversions": 0}'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- PDF | IMAGE
  url text not null,
  category text default 'ETC', -- CHECKLIST | GUIDE | EVENT | ETC
  size numeric,
  landing_id uuid references public.marketing_landing_pages(id) on delete set null,
  downloads integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_landing_status on public.marketing_landing_pages(status);
create index if not exists idx_assets_category on public.marketing_assets(category);
