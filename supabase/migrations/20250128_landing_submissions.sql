create table if not exists public.marketing_landing_submissions (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid references public.marketing_landing_pages(id) on delete cascade,
  customer_name text,
  customer_phone text,
  submitted_at timestamptz default now()
);

-- Index for analytics
create index if not exists idx_landing_subs_landing_id on public.marketing_landing_submissions(landing_id);
create index if not exists idx_landing_subs_phone on public.marketing_landing_submissions(customer_phone);
