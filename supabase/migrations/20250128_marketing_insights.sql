create table if not exists public.marketing_insights_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_type text default 'WEEKLY', -- WEEKLY | MONTHLY
  start_date date,
  end_date date,
  stats_json jsonb, -- { landings, messages, sales } aggregated stats
  insights_json jsonb, -- Array of { type, title, message, recommendation }
  created_at timestamptz default now()
);

-- Index
create index if not exists idx_insights_date on public.marketing_insights_snapshots(created_at);
